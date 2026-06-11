import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { 
  ApplicationModel, 
  SchemeModel, 
  ScrapedSchemeModel,
  AuditLogModel,
  UserModel,
  SavedSchemeModel
} from '../models/index.js';
import { db } from '../config/db.js';
import crypto from 'crypto';
import { getGovernmentStats, invalidateAnalyticsCache } from '../services/analytics.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authMiddleware);
router.use(roleGuard('government', 'admin'));

router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    let govState = undefined;
    if (req.user?.role === 'government') {
      if (req.user.state && req.user.state !== 'Central' && req.user.state !== 'All' && req.user.state !== 'UNASSIGNED') {
        govState = req.user.state;
      }
    }
    const stats = await getGovernmentStats(govState);
    res.json(stats);
  } catch (error: any) {
    logger.error('[GovRoute] analytics failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── Agent License Approval ─────────────────────────────────────────────────

// GET /government/pending-agents — list all agents awaiting approval
router.get('/pending-agents', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'government' && req.user?.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });
    let query: any = db.collection('pending_registrations').where('status', '==', 'pending');
    
    // Send new agent request to their state governments only
    if (req.user?.role === 'government') {
      if (req.user.state && req.user.state !== 'Central' && req.user.state !== 'All' && req.user.state !== 'UNASSIGNED') {
        query = query.where('state', '==', req.user.state);
      }
    }
    
    const snapshot = await query.get();
    const pending = snapshot.docs
      .map((d: any) => { const { password, ...u } = d.data(); return { id: d.id, ...u }; })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(pending);
  } catch (e: any) {
    console.error('[pending-agents error]', e.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /government/resolve-agent-status — approve or reject an agent
router.post('/resolve-agent-status', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'government' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access restricted' });
    }
    const { userId, status } = req.body;
    console.log(`[resolve-agent-status] userId: ${userId}, status: ${status}`);
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!['active', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    // Fetch the pending registration record
    const pendingDoc = await db.collection('pending_registrations').doc(userId).get();
    if (!pendingDoc.exists) {
      return res.status(404).json({ error: 'Pending registration not found.' });
    }
    const pendingData = pendingDoc.data() as any;

    if (status === 'rejected') {
      // Simply delete the pending record — no account is ever created
      await db.collection('pending_registrations').doc(userId).delete();
      return res.json({ success: true, message: 'Registration rejected and removed.' });
    }

    // APPROVED: Now create the Firebase Auth account
    const { auth: firebaseAuth } = await import('../config/db.js');
    let firebaseUid: string;
    try {
      const firebaseUser = await firebaseAuth.createUser({
        email: pendingData.email,
        password: pendingData.password,
        displayName: pendingData.fullName,
      });
      firebaseUid = firebaseUser.uid;
      await firebaseAuth.setCustomUserClaims(firebaseUid, { role: pendingData.role });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        const existing = await firebaseAuth.getUserByEmail(pendingData.email);
        firebaseUid = existing.uid;
      } else throw err;
    }

    // Create user profile in users collection
    const { password: _pw, ...safeData } = pendingData;
    await db.collection('users').doc(firebaseUid).set({
      ...safeData,
      id: firebaseUid,
      status: 'active',
      approvedAt: new Date().toISOString(),
      approvedBy: req.user?.id,
    });

    // Delete the pending registration
    await db.collection('pending_registrations').doc(userId).delete();

    // Notify the agent
    await db.collection('notifications').doc(crypto.randomUUID()).set({
      id: crypto.randomUUID(),
      userId: firebaseUid,
      title: '✅ License Approved!',
      message: 'Your agent license has been approved. You can now log in and start processing applications.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Agent approved. Firebase account created.' });
  } catch (e: any) {
    console.error('[resolve-agent-status error]', e.stack || e.message);
    res.status(500).json({ error: e.message || 'Server Error' });
  }
});

// GET /government/active-agents — list all approved agents
router.get('/active-agents', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'government' && req.user?.role !== 'admin') return res.status(403).json({ error: 'Access restricted' });
    let query: any = db.collection('users')
      .where('role', 'in', ['admin', 'agent'])
      .where('status', '==', 'active');
      
    // List only active agents from the same state for state-level government users
    if (req.user?.role === 'government') {
      if (req.user.state && req.user.state !== 'Central' && req.user.state !== 'All' && req.user.state !== 'UNASSIGNED') {
        query = query.where('state', '==', req.user.state);
      }
    }
    
    const snapshot = await query.get();
    const active = snapshot.docs
      .map((d: any) => { const { password, ...u } = d.data(); return { id: d.id, ...u }; })
      .sort((a: any, b: any) => a.fullName?.localeCompare(b.fullName));
    res.json(active);
  } catch (e: any) {
    console.error('[active-agents error]', e.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /government/agent-details/:id — full agent profile for government view
router.get('/agent-details/:id', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = String(req.params.id);
    const userDoc = await db.collection('users').doc(agentId).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    const user = userDoc.data() as any;

    // AUDIT LOG: Record PII Access
    await AuditLogModel.create({
      id: crypto.randomUUID(),
      actorId: req.user?.id,
      actorName: req.user?.fullName,
      action: 'view_agent_pii',
      targetId: agentId,
      details: `Official viewed sensitive details for Agent: ${user.fullName} (${agentId})`,
    });

    const allAgentApps = await ApplicationModel.find({ agentId });
    const activeApps = allAgentApps.filter((a: any) => !['approved', 'rejected'].includes(a.status));
    const processedApps = allAgentApps.filter((a: any) => ['approved', 'rejected'].includes(a.status));
    
    // Aggregate status breakdown for this agent
    const history = [
      { status: 'Approved', count: allAgentApps.filter((a: any) => a.status === 'approved').length },
      { status: 'Rejected', count: allAgentApps.filter((a: any) => a.status === 'rejected').length },
      { status: 'In Review', count: allAgentApps.filter((a: any) => a.status === 'in_review').length },
      { status: 'Paid Assignments', count: allAgentApps.filter((a: any) => a.paymentStatus === 'paid').length }
    ];

    res.json({
      agent: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        status: user.status,
        state: user.state,
        district: user.district,
        expertise: user.expertise,
        address: user.address,
        avatarUrl: user.avatarUrl || '',
        joinedAt: user.createdAt,
        approvedAt: user.approvedAt || null,
        aadharNumber: user.aadharNumber,
        panNumber: user.panNumber,
        meeSevaId: user.meeSevaId,
      },
      stats: {
        totalProcessed: processedApps.length,
        totalActive: activeApps.length,
        successRate: processedApps.length > 0 
          ? ((allAgentApps.filter((a: any) => a.status === 'approved').length / processedApps.length) * 100).toFixed(1)
          : 0
      },
      history,
      activeApplications: activeApps
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10)
    });
  } catch (e) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/applications', async (req: AuthRequest, res: Response) => {
  try {
    const appsRaw = await ApplicationModel.find({});
    
    let apps = await Promise.all(appsRaw.map(async (app: any) => {
      const user = await UserModel.findOne({ id: app.userId });
      const scheme = await SchemeModel.findOne({ id: app.schemeId });
      return {
        ...app.toObject(),
        userName: user?.fullName || 'Unknown',
        userEmail: user?.email || '',
        userState: user?.state || '',
        schemeName: scheme?.name || app.schemeName,
      };
    }));

    // Filter by Official's Jurisdiction
    if (req.user?.role === 'government') {
      if (req.user.state && req.user.state !== 'Central' && req.user.state !== 'All' && req.user.state !== 'UNASSIGNED') {
        apps = apps.filter(a => a.userState === req.user.state);
      }
    }

    const { scheme, status, state, dateFrom, dateTo } = req.query as any;
    if (scheme) apps = apps.filter(a => a.schemeId === scheme || a.schemeName.toLowerCase().includes(scheme.toLowerCase()));
    if (status) apps = apps.filter(a => a.status === status);
    if (state) apps = apps.filter(a => a.userState.toLowerCase().includes(state.toLowerCase()));
    if (dateFrom) apps = apps.filter(a => a.createdAt.toISOString() >= dateFrom);
    if (dateTo) apps = apps.filter(a => a.createdAt.toISOString() <= dateTo);

    res.json({ applications: apps });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/scraped-data', async (_req: AuthRequest, res: Response) => {
  try {
    const latest = await SchemeModel.find({ tags: 'Scraped' }).sort({ createdAt: -1 });
    const trending = await SchemeModel.find({ tags: 'Scraped' }).sort({ views: -1 }).limit(5);
    res.json({ success: true, latest, trending });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Security & Compliance: Global Audit Trail
router.get('/audit-logs', async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await AuditLogModel.find({}).sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// === Scheme Publishing ===
// POST /government/publish-scheme — create a new scheme visible to citizens and agents
router.post('/publish-scheme', async (req: AuthRequest, res: Response) => {
  try {
    const { name, ministry, description, benefits, eligibility, documents, applyLink, tags, deadline } = req.body;

    if (!name || !ministry || !description || !benefits) {
      return res.status(400).json({ error: 'name, ministry, description, and benefits are required.' });
    }

    const newScheme = await SchemeModel.create({
      id: `gov-${crypto.randomUUID()}`,
      name,
      ministry,
      description,
      benefits,
      eligibility: eligibility || {},
      documents: Array.isArray(documents) ? documents : (typeof documents === 'string' ? documents.split(',').map((d: string) => d.trim()).filter(Boolean) : []),
      applyLink: applyLink || '#',
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : ['Government']),
      deadline: deadline || '',
      source: 'government',
      publishedBy: req.user?.id,
    });

    // Create a notification for all citizens about the new scheme
    await import('../models/index.js').then(async ({ NotificationModel, UserModel: UM }) => {
      // FIX: Removed Mongoose-only .select('id').lean() — using plain find() instead
      const citizens = await UM.find({ role: 'citizen' });
      const notifications = citizens.map((c: any) => ({
        id: crypto.randomUUID(),
        userId: c.id,
        title: '🆕 New Scheme Available',
        message: `A new scheme has been published: "${name}" by ${ministry}. Check it out now!`,
        type: 'new_scheme',
        read: false,
        createdAt: new Date().toISOString(),
      }));
      if (notifications.length > 0) {
        await NotificationModel.insertMany(notifications);
      }
    });

    // Invalidate analytics cache
    invalidateAnalyticsCache();

    // Audit log
    await AuditLogModel.create({
      id: crypto.randomUUID(),
      actorId: req.user?.id,
      actorName: req.user?.fullName,
      action: 'publish_scheme',
      targetId: newScheme.id,
      details: `Published new scheme: "${name}" (${ministry})`,
    });

    res.status(201).json({ success: true, scheme: newScheme });
  } catch (error: any) {
    console.error('[Publish Scheme Error]', error);
    res.status(500).json({ error: error.message || 'Failed to publish scheme.' });
  }
});

// PUT /government/schemes/:id — update an existing official scheme
router.put('/schemes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, ministry, description, benefits, eligibility, documents, applyLink, tags, deadline } = req.body;

    const existingScheme = await SchemeModel.findOne({ id });
    if (!existingScheme) return res.status(404).json({ error: 'Scheme not found.' });

    const updatedScheme = await SchemeModel.findOneAndUpdate(
      { id },
      {
        name,
        ministry,
        description,
        benefits,
        eligibility: eligibility || existingScheme.eligibility,
        documents: Array.isArray(documents) ? documents : (typeof documents === 'string' ? documents.split(',').map((d: string) => d.trim()).filter(Boolean) : []),
        applyLink: applyLink || existingScheme.applyLink,
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : existingScheme.tags),
        deadline: deadline || existingScheme.deadline,
        updatedAt: new Date()
      },
      { returnDocument: 'after' }
    );

    // Audit log
    await AuditLogModel.create({
      id: crypto.randomUUID(),
      actorId: req.user?.id,
      actorName: req.user?.fullName,
      action: 'edit_scheme',
      targetId: id,
      details: `Updated scheme details: "${name}"`,
    });

    res.json({ success: true, scheme: updatedScheme });
  } catch (error: any) {
    console.error('[Update Scheme Error]', error);
    res.status(500).json({ error: 'Failed to update scheme.' });
  }
});

// DELETE /government/schemes/:id — remove any scheme (official or scraped) completely from database
router.delete('/schemes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Try to delete from official schemes first
    let deleted = await SchemeModel.findOneAndDelete({ id });
    let modelType = 'official';

    // If not found, try scraped schemes
    if (!deleted) {
      deleted = await ScrapedSchemeModel.findOneAndDelete({ id });
      modelType = 'scraped';
    }

    if (!deleted) return res.status(404).json({ error: 'Scheme not found.' });

    // Clean up all user bookmarks/saved schemes associated with this scheme
    await SavedSchemeModel.deleteMany({ schemeId: id });

    // Clean up all applications associated with this scheme
    await ApplicationModel.deleteMany({ schemeId: id });

    await AuditLogModel.create({
      id: crypto.randomUUID(),
      actorId: req.user?.id,
      actorName: req.user?.fullName,
      action: 'delete_scheme',
      targetId: id,
      details: `Deleted ${modelType} scheme and cleaned up all user bookmarks and applications: "${deleted.name}"`,
    });

    res.json({ success: true, message: `Successfully removed ${modelType} scheme and all associated data.` });
    invalidateAnalyticsCache();
  } catch (error) {
    console.error('[Delete Scheme Error]', error);
    res.status(500).json({ error: 'Failed to delete scheme.' });
  }
});

export default router;
