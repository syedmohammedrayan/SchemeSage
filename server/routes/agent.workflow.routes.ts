/**
 * Agent Workflow Routes
 *
 * FIX: Removed Mongoose-specific $or, $exists operators that don't work with FirestoreWrapper.
 * Now uses two separate Firestore-compatible queries and merges results in JS.
 * FIX: Added authMiddleware — routes were previously unprotected.
 * FIX: Approved application is now PRESERVED (not deleted) and marked 'approved' for history.
 */
import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { ApplicationModel, UserModel, NotificationModel } from '../models/index.js';
import { AppStatus, AGENT_POOL_STATUSES } from '../constants/applicationStatus.js';
import { invalidateAnalyticsCache } from '../services/analytics.service.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = Router();

// All agent workflow routes require authentication
router.use(authMiddleware);

/**
 * GET /api/agent/applications/:agentId
 * Returns: applications assigned to this agent + unassigned submitted applications (the pool)
 *
 * FIX: Replaced Mongoose $or/$exists with two separate compatible queries merged in JS.
 */
router.get('/applications/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId;

    // Security: agents can only view their own queue
    if (req.userId !== agentId && req.user?.role !== 'admin' && req.user?.role !== 'government') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own application queue.' });
    }

    // Query 1: Applications assigned to this specific agent
    const assignedApps = await ApplicationModel.find({
      agentId,
    }).sort({ updatedAt: -1 });

    // Query 2: Unassigned submitted applications (the open pool — no $exists needed)
    const poolApps = await ApplicationModel.find({
      status: AppStatus.SUBMITTED,
    }).sort({ createdAt: -1 });

    // Filter pool to only truly unassigned (no agentId or empty string)
    let unassigned = poolApps.filter((a: any) => !a.agentId || a.agentId === '');

    // Get the agent's state to filter the pool
    const agentUser = await UserModel.findOne({ id: agentId });
    if (agentUser?.state) {
      const agentState = agentUser.state.toLowerCase();
      unassigned = unassigned.filter((a: any) => {
        const citizenState = a.formData?.state?.toLowerCase();
        return citizenState === agentState;
      });
    }

    // Merge: assigned apps first (sorted by priority — paid first), then pool
    const merged = [
      ...assignedApps.filter((a: any) => a.paymentStatus === 'paid'),
      ...assignedApps.filter((a: any) => a.paymentStatus !== 'paid'),
      ...unassigned.filter((a: any) => a.paymentStatus === 'paid'),
      ...unassigned.filter((a: any) => a.paymentStatus !== 'paid'),
    ];

    // Deduplicate by id
    const seen = new Set<string>();
    const deduped = merged.filter((a: any) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    // Enrich with user info
    const enriched = await Promise.all(deduped.map(async (app: any) => {
      const user = await UserModel.findOne({ id: app.userId });
      return {
        ...app.toObject(),
        userName: user?.fullName || app.formData?.fullName || 'Guest',
        userEmail: user?.email || '',
        userPhone: user?.mobile || app.formData?.phone || '',
      };
    }));

    res.json(enriched);
  } catch (error: any) {
    logger.error('[AgentWorkflow] get applications failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * POST /api/agent/accept/:applicationId
 * Agent claims an unassigned application from the pool.
 */
router.post('/accept/:applicationId', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.userId!; // Use authenticated user's ID — never from body
    const applicationId = req.params.applicationId as string;

    const updated = await ApplicationModel.findOneAndUpdate(
      { id: applicationId, status: AppStatus.SUBMITTED }, 
      { 
        agentId,
        status: AppStatus.SUBMITTED, 
        updatedAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
      }, 
      { returnDocument: 'after' }
    );

    if (!updated) return res.status(404).json({ error: 'Application not available (already taken or not found)' });

    // Commission split and credit consumption now happens at acceptance
    try {
      const { splitCommission } = await import('../services/commission.service.js');
      const { consumeCredit } = await import('../services/subscription.service.js');
      const { db } = await import('../config/db.js');
      
      const pSnap = await db.collection('payments').where('applicationId', '==', applicationId).where('status', '==', 'paid').get();
      // Default to ₹249 (24900 paise) if payment record missing but application is marked paid
      const amountPaid = pSnap.empty ? 24900 : pSnap.docs[0].data().amount;

      await splitCommission(applicationId, agentId, amountPaid);
      await consumeCredit(agentId);
    } catch (err: any) {
      logger.warn(`Commission/Credit logic failed during accept for app ${applicationId}: ${err.message}`);
    }

    logger.info('[AgentWorkflow] application accepted', { applicationId, agentId });
    res.json({ application: updated });
  } catch (error: any) {
    logger.error('[AgentWorkflow] accept failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * POST /api/agent/reject/:applicationId
 * Agent rejects an application with a reason.
 */
router.post('/reject/:applicationId', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const applicationId = req.params.applicationId;

    const app = await ApplicationModel.findOne({ id: applicationId });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const updated = await ApplicationModel.findOneAndUpdate(
      { id: applicationId }, 
      { 
        status: AppStatus.REJECTED,
        rejectionReason: reason || 'Application could not be processed.',
        updatedAt: new Date().toISOString(),
      }, 
      { returnDocument: 'after' }
    );

    // Notify citizen
    if (app.userId) {
      await NotificationModel.create({
        id: crypto.randomUUID(),
        userId: app.userId,
        title: 'Application Update',
        message: `Your application for "${app.schemeName}" could not be processed. ${reason || 'Please check eligibility and reapply.'}`,
        type: 'update',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    invalidateAnalyticsCache();
    logger.info('[AgentWorkflow] application rejected', { applicationId, reason });
    res.json({ application: updated });
  } catch (error: any) {
    logger.error('[AgentWorkflow] reject failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * PATCH /api/agent/update-status/:applicationId
 * Agent updates application status (in_review → approved/rejected/document_pending).
 *
 * FIX: Removed the dangerous "delete on approve" behavior.
 * Applications are now preserved for audit history.
 */
router.patch('/update-status/:applicationId', async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes } = req.body;
    const applicationId = req.params.applicationId;

    const validAgentStatuses = [AppStatus.APPROVED, AppStatus.REJECTED, AppStatus.DOCUMENT_PENDING, AppStatus.IN_REVIEW];
    if (!validAgentStatuses.includes(status)) {
      return res.status(400).json({ error: `Agent can only set status to: ${validAgentStatuses.join(', ')}` });
    }

    const app = await ApplicationModel.findOne({ id: applicationId });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const updated = await ApplicationModel.findOneAndUpdate(
      { id: applicationId }, 
      { 
        status, 
        notes: notes || '',
        updatedAt: new Date().toISOString(),
        resolvedAt: [AppStatus.APPROVED, AppStatus.REJECTED].includes(status) ? new Date().toISOString() : undefined,
        resolvedBy: req.userId,
      }, 
      { returnDocument: 'after' }
    );

    // Notify citizen of terminal decisions
    if ([AppStatus.APPROVED, AppStatus.REJECTED].includes(status) && app.userId) {
      await NotificationModel.create({
        id: crypto.randomUUID(),
        userId: app.userId,
        title: status === AppStatus.APPROVED ? '🎉 Application Approved!' : '❌ Application Rejected',
        message: status === AppStatus.APPROVED
          ? `Great news! Your application for "${app.schemeName}" has been approved.${notes ? ` Note: ${notes}` : ''}`
          : `Your application for "${app.schemeName}" was rejected.${notes ? ` Reason: ${notes}` : ' Please check eligibility criteria.'}`,
        type: 'update',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    invalidateAnalyticsCache();
    logger.info('[AgentWorkflow] status updated', { applicationId, status, agentId: req.userId });
    res.json({ success: true, application: updated });
  } catch (error: any) {
    logger.error('[AgentWorkflow] update-status failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
