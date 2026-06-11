import { Router, Response } from 'express';
import crypto from 'crypto';
import { scrapeSchemes } from '../scraper.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { sanitizeUser } from '../utils/helpers.js';
import { 
  UserModel, 
  ApplicationModel, 
  SchemeModel, 
  ScrapedSchemeModel, 
  NotificationModel 
} from '../models/index.js';
import { getAdminStats, invalidateAnalyticsCache } from '../services/analytics.service.js';
import { validate, UpdateStatusSchema, CreateSchemeSchema, BroadcastSchema } from '../validators/index.js';
import { logger } from '../utils/logger.js';
import { AppStatus } from '../constants/applicationStatus.js';

const router = Router();

router.use(authMiddleware);
router.use(roleGuard('admin'));

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    // Real analytics from Firestore — NO hardcoded arrays
    const stats = await getAdminStats();

    // Legacy shape compatibility (existing frontend expects these fields)
    res.json({
      totalUsers: stats.totalUsers,
      totalApplications: stats.totalApplications,
      totalSchemes: stats.totalSchemes,
      totalRevenue: stats.totalRevenue,
      pendingApplications: stats.pendingApplications,
      approvedApplications: stats.approvedApplications,
      rejectedApplications: stats.rejectedApplications,
      applicationsByStatus: {
        saved: stats.statusBreakdown.find(s => s.name === 'Saved')?.value || 0,
        started: stats.statusBreakdown.find(s => s.name === 'Started')?.value || 0,
        submitted: stats.statusBreakdown.find(s => s.name === 'Submitted')?.value || 0,
        approved: stats.statusBreakdown.find(s => s.name === 'Approved')?.value || 0,
        rejected: stats.statusBreakdown.find(s => s.name === 'Rejected')?.value || 0,
      },
      monthlyTrends: stats.monthlyApplications.labels.map((month, i) => ({
        month,
        users: stats.monthlyUsers.values[i],
        applications: stats.monthlyApplications.values[i],
      })),
      schemeWiseApplications: stats.schemeWiseApplications,
      stateWiseDistribution: stats.stateWiseDistribution,
    });
  } catch (error: any) {
    logger.error('[AdminRoute] stats failed', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await UserModel.find({});
    res.json({ users: users.map((u: any) => sanitizeUser(u.toObject())) });
  } catch(error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/applications', async (_req: AuthRequest, res: Response) => {
  try {
    const apps = await ApplicationModel.find({});
    const popApps = await Promise.all(apps.map(async (app: any) => {
      const user = await UserModel.findOne({ id: app.userId });
      return {
        ...app.toObject(),
        userName: user?.fullName || 'Unknown',
        userEmail: user?.email || '',
        userState: user?.state || '',
      };
    }));
    res.json({ applications: popApps });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/applications/:id/status', validate(UpdateStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes } = req.body;

    const app = await ApplicationModel.findOneAndUpdate(
      { id: req.params.id },
      { status, notes: notes || '', updatedAt: new Date() }
    );
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Notify the citizen
    if (app.userId) {
      await NotificationModel.create({
        id: crypto.randomUUID(),
        userId: app.userId,
        title: `Application ${status === AppStatus.APPROVED ? '✅ Approved' : status === AppStatus.REJECTED ? '❌ Rejected' : 'Updated'}`,
        message: `Your application for "${app.schemeName}" status changed to: ${status}.${
          notes ? ` Note: ${notes}` : ''
        } ${status === AppStatus.APPROVED ? 'Congratulations!' : ''}`,
        type: 'update',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    invalidateAnalyticsCache();
    res.json({ application: app });
  } catch (error: any) {
    logger.error('[AdminRoute] update status failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/schemes', validate(CreateSchemeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, ministry, description, benefits, eligibility, documents, deadline, applyLink, tags } = req.body;

    const scheme = await SchemeModel.create({
      id: crypto.randomUUID(),
      name,
      ministry,
      description,
      benefits,
      eligibility: eligibility || {},
      documents: Array.isArray(documents) ? documents : [],
      deadline: deadline || '',
      applyLink: applyLink || '#',
      tags: Array.isArray(tags) ? tags : [],
      views: 0,
      saves: 0,
      createdAt: new Date().toISOString(),
    });

    // Broadcast to all citizens
    const users = await UserModel.find({ role: 'citizen' });
    const notifs = users.map((u: any) => ({
      id: crypto.randomUUID(),
      userId: u.id,
      title: `🆕 New Scheme: ${name}`,
      message: `A new scheme "${name}" from ${ministry} has been added. Check if you're eligible!`,
      type: 'new_scheme',
      read: false,
      createdAt: new Date().toISOString(),
    }));
    if (notifs.length > 0) await NotificationModel.insertMany(notifs);

    invalidateAnalyticsCache();
    res.status(201).json({ scheme });
  } catch (error: any) {
    logger.error('[AdminRoute] create scheme failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/schemes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updated = await SchemeModel.findOneAndUpdate({ id: req.params.id }, req.body, { returnDocument: 'after' });
    if (!updated) return res.status(404).json({ error: 'Scheme not found' });
    res.json({ scheme: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.delete('/schemes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await SchemeModel.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Scheme not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/notifications/broadcast', validate(BroadcastSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type } = req.body;
    
    const users = await UserModel.find({ role: 'citizen' });
    const notifs = users.map((u: any) => ({
      id: crypto.randomUUID(),
      userId: u.id,
      title,
      message,
      type: type || 'system',
      read: false,
      createdAt: new Date().toISOString(),
    }));
    if (notifs.length > 0) await NotificationModel.insertMany(notifs);
    
    logger.info('[AdminRoute] Broadcast sent', { title, recipientCount: notifs.length });
    res.json({ success: true, recipientCount: notifs.length });
  } catch (error: any) {
    logger.error('[AdminRoute] broadcast failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/scraped-data', async (_req: AuthRequest, res: Response) => {
  try {
    const latest = await ScrapedSchemeModel.find({}).sort({ createdAt: -1 }).limit(10);
    const trending = await ScrapedSchemeModel.find({}).sort({ views: -1 }).limit(5);
    res.json({ success: true, latest, trending });
  } catch (err) {
    console.error('[Scraper Error]', err);
    res.status(500).json({ error: 'Failed to fetch scraped data.' });
  }
});

router.post('/scrape/trigger', async (_req: AuthRequest, res: Response) => {
  try {
    const scrapedCount = await scrapeSchemes();
    res.json({ success: true, count: scrapedCount });
  } catch (err: any) {
    console.error('[Scraper Trigger Error]', err);
    res.status(500).json({ error: err.message || 'Failed to trigger scraper' });
  }
});

// AI Agent Registry Routes
import { AIAgentModel } from '../models/index.js';
import { registerLeanIXAgent } from '../services/leanixAgentService.js';

router.get('/ai-agents', async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await AIAgentModel.find({}).sort({ createdAt: -1 });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/ai-agents', async (req: AuthRequest, res: Response) => {
  try {
    const agentData = {
      ...req.body,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    const agent = await AIAgentModel.create(agentData);
    
    // Auto-sync to LeanIX
    try {
      await registerLeanIXAgent(agentData);
    } catch (leanixErr) {
      console.error('Auto-sync to LeanIX failed, but agent was created locally', leanixErr);
    }

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/ai-agents/sync', async (req: AuthRequest, res: Response) => {
  try {
    const agents = await AIAgentModel.find({});
    const results = [];
    for (const agent of agents) {
      try {
        const result = await registerLeanIXAgent(agent);
        results.push({ name: agent.name, status: 'success', result });
      } catch (err: any) {
        results.push({ name: agent.name, status: 'error', error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
