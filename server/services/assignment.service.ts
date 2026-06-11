import { db } from '../config/db.js';
import { AgentSubscriptionModel, UserModel, ApplicationModel } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { PLANS } from './subscription.service.js';

export async function autoAssignAgent(applicationId: string): Promise<string | null> {
  try {
    const appDoc = await db.collection('applications').doc(applicationId).get();
    let citizenState = null;
    if (appDoc.exists) {
        const app = appDoc.data();
        citizenState = app?.formData?.state;
    }

    // 1. Get all active agents with valid subscriptions
    const validSubs = await AgentSubscriptionModel.find({ status: 'active' });
    if (validSubs.length === 0) return null; // Fallback to pool

    const agentIds = validSubs.map((s: any) => s.agentId);
    if (agentIds.length === 0) return null;

    // 2. Fetch agent details and active queues
    const agentPromises = agentIds.map(async (id: string) => {
        const user = await UserModel.findOne({ id });
        const apps = await ApplicationModel.find({ agentId: id });
        const activeQueue = apps.filter((a: any) => !['approved', 'rejected'].includes(a.status)).length;
        const processed = apps.filter((a: any) => ['approved', 'rejected'].includes(a.status));
        const approved = processed.filter((a: any) => a.status === 'approved').length;
        const successRate = processed.length > 0 ? (approved / processed.length) : 0.5; // Default 50% for new
        const sub = validSubs.find((s: any) => s.agentId === id);
        
        let subScore = 0;
        if (sub.planKey === 'enterprise') subScore = 3;
        else if (sub.planKey === 'professional') subScore = 2;
        else if (sub.planKey === 'starter') subScore = 1;

        let stateMatch = 0;
        if (citizenState && user?.state && citizenState.toLowerCase() === user.state.toLowerCase()) {
            stateMatch = 1;
        }

        // Limit check
        const limit = sub.limit;
        const used = sub.used || 0;
        const hasCapacity = limit === -1 || used < limit;

        return {
            id,
            activeQueue,
            successRate,
            subScore,
            stateMatch,
            hasCapacity
        };
    });

    const agents = await Promise.all(agentPromises);
    const availableAgents = agents.filter(a => a.hasCapacity);
    if (availableAgents.length === 0) return null; // Fallback to pool

    // 3. Rank agents
    // Highest subScore first
    // Then highest stateMatch
    // Then highest successRate
    // Then lowest activeQueue
    availableAgents.sort((a, b) => {
        if (b.subScore !== a.subScore) return b.subScore - a.subScore;
        if (b.stateMatch !== a.stateMatch) return b.stateMatch - a.stateMatch;
        if (Math.abs(b.successRate - a.successRate) > 0.1) return b.successRate - a.successRate; // Significant difference
        return a.activeQueue - b.activeQueue;
    });

    const bestAgent = availableAgents[0];
    logger.info(`Auto-assigned application ${applicationId} to agent ${bestAgent.id}`, bestAgent);
    return bestAgent.id;

  } catch (e: any) {
    logger.error(`Error in autoAssignAgent: ${e.message}`);
    return null; // Fallback to pool on error
  }
}
