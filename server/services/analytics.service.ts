/**
 * Analytics Service — Single Source of Truth for all platform metrics.
 *
 * This replaces ALL hardcoded static arrays in admin.routes.ts and
 * government.routes.ts. Both dashboards consume this service.
 *
 * Design decisions:
 * - All data fetched from real Firestore records
 * - Results grouped by month using JS Date bucketing (avoids Firestore aggregation limits)
 * - 5-minute in-memory cache to avoid hammering Firestore on every dashboard load
 * - Shared between admin and government routes — no duplicated logic
 */

import { db } from '../config/db.js';
import { logger } from '../utils/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartDataset {
  labels: string[];
  values: number[];
}

export interface AdminStats {
  totalUsers: number;
  totalSchemes: number;
  totalApplications: number;
  totalRevenue: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  monthlyApplications: ChartDataset;
  monthlyUsers: ChartDataset;
  statusBreakdown: Array<{ name: string; value: number }>;
  schemeWiseApplications: Array<{ name: string; fullName: string; applications: number; views: number; saves: number }>;
  stateWiseDistribution: Array<{ name: string; value: number }>;
  platformRevenue?: number;
  agentRevenuePaid?: number;
  subscriptionRevenue?: number;
  revenueByMonth?: ChartDataset;
  topAgents?: Array<{ agentId: string; name: string; earnings: number }>;
  conversionRate?: number;
  assistedApplications?: number;
  applicationsByStatus?: Record<string, number>;
  monthlyTrends?: Array<{ month: string; users: number; applications: number }>;
  mostViewedSchemes?: Array<{ id: string; name: string; views: number }>;
  maxViews?: number;
}

export interface GovernmentStats {
  totalViews: number;
  totalSaves: number;
  totalSchemes: number;
  totalApplications: number;
  schemeWiseApplications: Array<{ name: string; fullName: string; applications: number; views: number; saves: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  stateWiseDistribution: Array<{ name: string; value: number }>;
  monthlyTrends: Array<{ month: string; applications: number; views: number }>;
  totalRevenue: number;
  platformRevenue: number;
  agentRevenuePaid: number;
  subscriptionRevenue: number;
  revenueByMonth: ChartDataset;
  topAgents: Array<{ agentId: string; name: string; earnings: number }>;
  conversionRate: number;
  assistedApplications: number;
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  cache.delete(key);
  return null;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Groups an array of records by their createdAt month and returns
 * labels + counts for the last N months.
 */
function groupByMonth(records: any[], monthsBack = 6, sumField?: string): ChartDataset {
  const now = new Date();
  const labels: string[] = [];
  const values: number[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(MONTH_LABELS[d.getMonth()]);
    const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const monthRecords = records.filter((r: any) => {
      const created = r.createdAt;
      if (!created) return false;
      const date = created instanceof Date ? created : new Date(created);
      const ry = date.getFullYear();
      const rm = date.getMonth() + 1;
      return `${ry}-${String(rm).padStart(2, '0')}` === monthYear;
    });

    if (sumField) {
      const sum = monthRecords.reduce((acc, r) => acc + (r[sumField] || 0), 0);
      values.push(sum);
    } else {
      values.push(monthRecords.length);
    }
  }

  return { labels, values };
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Fetches all admin dashboard statistics from real Firestore data.
 * Shared by admin.routes.ts — never hardcoded.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const CACHE_KEY = 'admin_stats';
  const cached = getCached<AdminStats>(CACHE_KEY);
  if (cached) return cached;

  try {
    // Fetch all needed collections in parallel
    const [usersSnap, schemesSnap, appsSnap, paymentsSnap, commissionsSnap, subsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('schemes').get(),
      db.collection('applications').get(),
      db.collection('payments').where('status', '==', 'paid').get(),
      db.collection('commissions').get(),
      db.collection('subscription_payments').where('status', '==', 'paid').get(),
    ]);

    const users = usersSnap.docs.map((d: any) => d.data());
    const schemes = schemesSnap.docs.map((d: any) => d.data());
    const apps = appsSnap.docs.map((d: any) => d.data());
    const payments = paymentsSnap.docs.map((d: any) => d.data());
    const commissions = commissionsSnap.docs.map((d: any) => d.data());
    const subscriptions = subsSnap.docs.map((d: any) => d.data());

    const totalCommissionAmount = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) / 100;
    const platformRevenue = commissions.reduce((sum: number, c: any) => sum + (c.platformCommission || 0), 0) / 100;
    const agentRevenuePaid = commissions.reduce((sum: number, c: any) => sum + (c.agentCommission || 0), 0) / 100;
    const subscriptionRevenue = subscriptions.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) / 100;
    const totalRevenue = totalCommissionAmount + subscriptionRevenue;

    const assistedApplications = apps.filter((a: any) => a.type === 'assisted').length;
    const conversionRate = apps.length > 0 ? assistedApplications / apps.length : 0;

    const agentEarnings: Record<string, number> = {};
    commissions.forEach((c: any) => {
       if (c.agentId) {
           agentEarnings[c.agentId] = (agentEarnings[c.agentId] || 0) + (c.agentCommission || 0);
       }
    });

    const topAgents = Object.entries(agentEarnings)
        .map(([agentId, earningsPaise]) => {
            const agent = users.find((u: any) => u.id === agentId);
            return {
                agentId,
                name: agent?.fullName || 'Unknown Agent',
                earnings: (earningsPaise as number) / 100
            };
        })
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 10);

    const revenueRecordsForTrend = [
      ...commissions.map(c => ({ createdAt: c.createdAt, amountInRs: (c.amount || 0) / 100 })),
      ...subscriptions.map(s => ({ createdAt: s.createdAt, amountInRs: (s.amount || 0) / 100 }))
    ];

    // Status breakdown
    const statusBreakdown = [
      { name: 'Saved', value: apps.filter((a: any) => a.status === 'saved').length },
      { name: 'Started', value: apps.filter((a: any) => a.status === 'started').length },
      { name: 'Submitted', value: apps.filter((a: any) => a.status === 'submitted').length },
      { name: 'In Review', value: apps.filter((a: any) => a.status === 'in_review').length },
      { name: 'Approved', value: apps.filter((a: any) => a.status === 'approved').length },
      { name: 'Rejected', value: apps.filter((a: any) => a.status === 'rejected').length },
    ];

    const applicationsByStatus = {
      saved: apps.filter((a: any) => a.status === 'saved').length,
      started: apps.filter((a: any) => a.status === 'started').length,
      submitted: apps.filter((a: any) => a.status === 'submitted').length,
      in_review: apps.filter((a: any) => a.status === 'in_review').length,
      approved: apps.filter((a: any) => a.status === 'approved').length,
      rejected: apps.filter((a: any) => a.status === 'rejected').length,
    };

    // Scheme-wise application counts
    const schemeWiseApplications = schemes.slice(0, 10).map((s: any) => ({
      name: (s.name || '').length > 20 ? s.name.substring(0, 20) + '...' : (s.name || ''),
      fullName: s.name || '',
      applications: apps.filter((a: any) => a.schemeId === s.id).length,
      views: s.views || 0,
      saves: s.saves || 0,
    })).sort((a, b) => b.applications - a.applications);

    const mostViewedSchemes = schemes.map((s: any) => ({
      id: s.id,
      name: s.name || '',
      views: s.views || 0
    })).sort((a, b) => b.views - a.views).slice(0, 5);

    const maxViews = Math.max(...mostViewedSchemes.map((s: any) => s.views || 0), 100);

    // State-wise user distribution
    const stateCounts: Record<string, number> = {};
    users.forEach((u: any) => {
      if (u.state) stateCounts[u.state] = (stateCounts[u.state] || 0) + 1;
    });
    const stateWiseDistribution = Object.entries(stateCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const monthlyTrendsData = buildMonthlyTrends(apps, schemes, 6);
    const usersTrend = groupByMonth(users, 6);
    const monthlyTrends = monthlyTrendsData.map((d, i) => ({
      month: d.month,
      applications: d.applications,
      users: usersTrend.values[i]
    }));

    const result: AdminStats = {
      totalUsers: users.length,
      totalSchemes: schemes.length,
      totalApplications: apps.length,
      totalRevenue,
      platformRevenue,
      agentRevenuePaid,
      subscriptionRevenue,
      revenueByMonth: groupByMonth(revenueRecordsForTrend, 6, 'amountInRs'),
      topAgents,
      conversionRate,
      assistedApplications,
      pendingApplications: apps.filter((a: any) => ['submitted', 'in_review'].includes(a.status)).length,
      approvedApplications: apps.filter((a: any) => a.status === 'approved').length,
      rejectedApplications: apps.filter((a: any) => a.status === 'rejected').length,
      monthlyApplications: groupByMonth(apps, 6),
      monthlyUsers: groupByMonth(users, 6),
      statusBreakdown,
      applicationsByStatus,
      schemeWiseApplications,
      stateWiseDistribution,
      monthlyTrends,
      mostViewedSchemes,
      maxViews,
    };

    setCached(CACHE_KEY, result);
    return result;
  } catch (error: any) {
    logger.error('AnalyticsService.getAdminStats failed', { error: error.message });
    throw new Error('Failed to fetch admin analytics');
  }
}

/**
 * Fetches government dashboard statistics from real Firestore data.
 * Shared by government.routes.ts — never hardcoded.
 */
export async function getGovernmentStats(govState?: string): Promise<GovernmentStats> {
  const CACHE_KEY = `government_stats_${govState || 'all'}`;
  const cached = getCached<GovernmentStats>(CACHE_KEY);
  if (cached) return cached;

  try {
    const [schemesSnap, appsSnap, usersSnap, commissionsSnap, subsSnap] = await Promise.all([
      db.collection('schemes').get(),
      db.collection('applications').get(),
      db.collection('users').get(),
      db.collection('commissions').get(),
      db.collection('subscription_payments').where('status', '==', 'paid').get(),
    ]);

    let schemes = schemesSnap.docs.map((d: any) => d.data());
    let apps = appsSnap.docs.map((d: any) => d.data());
    let users = usersSnap.docs.map((d: any) => d.data());
    let commissions = commissionsSnap.docs.map((d: any) => d.data());
    let subscriptions = subsSnap.docs.map((d: any) => d.data());

    if (govState) {
      users = users.filter((u: any) => u.state === govState);
      const stateUserIds = new Set(users.map((u: any) => u.id));
      
      apps = apps.filter((a: any) => stateUserIds.has(a.userId));
      commissions = commissions.filter((c: any) => c.agentId && stateUserIds.has(c.agentId));
      subscriptions = subscriptions.filter((s: any) => stateUserIds.has(s.userId));
    }

    // Revenue Calculations (paise -> rupees)
    const totalCommissionAmount = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) / 100;
    const platformRevenue = commissions.reduce((sum: number, c: any) => sum + (c.platformCommission || 0), 0) / 100;
    const agentRevenuePaid = commissions.reduce((sum: number, c: any) => sum + (c.agentCommission || 0), 0) / 100;
    const subscriptionRevenue = subscriptions.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) / 100;
    const totalRevenue = totalCommissionAmount + subscriptionRevenue;

    // Assisted vs Total Applications
    const assistedApplications = apps.filter((a: any) => a.type === 'assisted').length;
    const conversionRate = apps.length > 0 ? assistedApplications / apps.length : 0;

    // Top Agents
    const agentEarnings: Record<string, number> = {};
    commissions.forEach((c: any) => {
       if (c.agentId) {
           agentEarnings[c.agentId] = (agentEarnings[c.agentId] || 0) + (c.agentCommission || 0);
       }
    });

    const topAgents = Object.entries(agentEarnings)
        .map(([agentId, earningsPaise]) => {
            const agent = users.find((u: any) => u.id === agentId);
            return {
                agentId,
                name: agent?.fullName || 'Unknown Agent',
                earnings: (earningsPaise as number) / 100
            };
        })
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 10);


    const statusBreakdown = [
      { name: 'Saved', value: apps.filter((a: any) => a.status === 'saved').length },
      { name: 'Submitted', value: apps.filter((a: any) => a.status === 'submitted').length },
      { name: 'Approved', value: apps.filter((a: any) => a.status === 'approved').length },
      { name: 'Rejected', value: apps.filter((a: any) => a.status === 'rejected').length },
    ];

    const schemeWiseApplications = schemes.slice(0, 8).map((s: any) => ({
      name: (s.name || '').length > 20 ? s.name.substring(0, 20) + '...' : (s.name || ''),
      fullName: s.name || '',
      applications: apps.filter((a: any) => a.schemeId === s.id).length,
      views: s.views || 0,
      saves: s.saves || 0,
    })).sort((a, b) => b.applications - a.applications);

    const stateCounts: Record<string, number> = {};
    users.forEach((u: any) => {
      if (u.state) stateCounts[u.state] = (stateCounts[u.state] || 0) + 1;
    });
    const stateWiseDistribution = Object.entries(stateCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Monthly trends — last 6 months, real data
    const monthlyTrends = buildMonthlyTrends(apps, schemes, 6);

    const revenueRecordsForTrend = [
      ...commissions.map(c => ({ createdAt: c.createdAt, amountInRs: (c.amount || 0) / 100 })),
      ...subscriptions.map(s => ({ createdAt: s.createdAt, amountInRs: (s.amount || 0) / 100 }))
    ];

    const result: GovernmentStats = {
      totalViews: schemes.reduce((sum: number, s: any) => sum + (s.views || 0), 0),
      totalSaves: schemes.reduce((sum: number, s: any) => sum + (s.saves || 0), 0),
      totalSchemes: schemes.length,
      totalApplications: apps.length,
      schemeWiseApplications,
      statusBreakdown,
      stateWiseDistribution,
      monthlyTrends,
      totalRevenue,
      platformRevenue,
      agentRevenuePaid,
      subscriptionRevenue,
      revenueByMonth: groupByMonth(revenueRecordsForTrend, 6, 'amountInRs'), // Combine for total revenue trends
      topAgents,
      conversionRate,
      assistedApplications
    };

    setCached(CACHE_KEY, result);
    return result;
  } catch (error: any) {
    logger.error('AnalyticsService.getGovernmentStats failed', { error: error.message });
    throw new Error('Failed to fetch government analytics');
  }
}

function buildMonthlyTrends(
  apps: any[],
  schemes: any[],
  monthsBack: number
): Array<{ month: string; applications: number; views: number }> {
  const now = new Date();
  const result = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = MONTH_LABELS[d.getMonth()];

    const monthApps = apps.filter((a: any) => {
      const created = a.createdAt;
      if (!created) return false;
      const date = created instanceof Date ? created : new Date(created);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === monthYear;
    }).length;

    // Views: sum across all schemes (approximation — views aren't timestamped yet)
    // In a future iteration, views should be stored with timestamps in a separate collection
    const totalViews = schemes.reduce((sum: number, s: any) => sum + (s.views || 0), 0);
    const avgMonthlyViews = Math.round(totalViews / monthsBack);

    result.push({ month: label, applications: monthApps, views: avgMonthlyViews });
  }

  return result;
}

/**
 * Invalidates all analytics caches — call after any write that affects analytics
 * (e.g., scheme creation, application approval, payment completion)
 */
export function invalidateAnalyticsCache(): void {
  for (const key of cache.keys()) {
    if (key.startsWith('admin_stats') || key.startsWith('government_stats')) {
      cache.delete(key);
    }
  }
  logger.debug('Analytics cache invalidated');
}
