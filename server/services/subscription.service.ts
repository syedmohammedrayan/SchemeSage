import crypto from 'crypto';
import { db } from '../config/db.js';
import { AgentSubscriptionModel } from '../models/index.js';
import { logger } from '../utils/logger.js';

export const PLANS = {
  starter: {
    name: 'Starter Plan',
    price: 27900, // in paise
    limit: 10,
    features: ['10 Assisted Applications per month', 'Basic Dashboard', 'Application Tracking', 'Citizen Management'],
    target: ['Freelancers', 'Village Service Providers', 'New Agents']
  },
  professional: {
    name: 'Professional Plan',
    price: 52900,
    limit: 22,
    features: ['22 Assisted Applications per month', 'Priority Citizen Leads', 'Performance Analytics', 'Customer Management', 'Priority Support'],
    target: ['CSC Centers', 'Active Agents', 'Welfare Consultants'],
    badge: 'Most Popular'
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 101900,
    limit: -1, // unlimited
    features: ['Unlimited Applications', 'Team Management', 'Lead Assignment', 'Advanced Analytics', 'Revenue Tracking', 'Priority Support'],
    target: ['Agencies', 'NGOs', 'Multi-Agent Teams']
  }
};

export async function checkApplicationLimit(agentId: string) {
  const sub = await AgentSubscriptionModel.findOne({ agentId, status: 'active' });
  if (!sub) return { allowed: false, plan: null };

  const isExpired = new Date(sub.expiryDate).getTime() < Date.now();
  if (isExpired) {
    await AgentSubscriptionModel.findOneAndUpdate({ id: sub.id }, { status: 'expired' });
    return { allowed: false, plan: null };
  }

  const limit = sub.limit;
  if (limit === -1) return { allowed: true, plan: sub }; // Enterprise unlimited

  const used = sub.used || 0;
  return {
    allowed: used < limit,
    plan: sub,
    used,
    remaining: limit - used
  };
}

export async function consumeCredit(agentId: string) {
  const { allowed, plan, used } = await checkApplicationLimit(agentId);
  if (!allowed || !plan) throw new Error('Application limit reached or no active subscription.');

  if (plan.limit !== -1) {
    await AgentSubscriptionModel.findOneAndUpdate(
      { id: plan.id },
      { $inc: { used: 1 } }
    );
  }
}

export async function activateSubscription(agentId: string, planKey: keyof typeof PLANS, paymentId: string) {
  const plan = PLANS[planKey];
  if (!plan) throw new Error('Invalid plan');

  // Deactivate old active subscriptions
  await AgentSubscriptionModel.updateMany(
    { agentId, status: 'active' },
    { $set: { status: 'canceled' } }
  );

  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 1);

  const newSub = await AgentSubscriptionModel.create({
    id: crypto.randomUUID(),
    agentId,
    planKey,
    planName: plan.name,
    limit: plan.limit,
    used: 0,
    status: 'active',
    startDate: startDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
    paymentId
  });

  return newSub;
}
