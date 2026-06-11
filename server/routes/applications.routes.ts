import { Router, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { checkDocuments } from '../utils/documentCheck.js';
import { ApplicationModel, SchemeModel, ScrapedSchemeModel, UserModel } from '../models/index.js';
import { AppStatus, isValidTransition } from '../constants/applicationStatus.js';
import { validate, CreateApplicationSchema, SubmitApplicationSchema } from '../validators/index.js';
import { invalidateAnalyticsCache } from '../services/analytics.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const apps = await ApplicationModel.find({ userId: req.params.userId || req.userId! }).sort({ createdAt: -1 });
    
    const enrichedApps = await Promise.all(apps.map(async (app: any) => {
      let agentDetails = null;
      if (app.agentId) {
        const agent = await UserModel.findOne({ id: app.agentId });
        if (agent) {
          agentDetails = {
            fullName: agent.fullName || agent.name || 'Assigned Agent',
            mobile: agent.mobile || agent.phone || '',
            email: agent.email || '',
          };
        }
      }
      return {
        ...app.toObject ? app.toObject() : app,
        agentDetails
      };
    }));

    res.json({ applications: enrichedApps });
  } catch (error) {
    logger.error('[ApplicationRoute] user applications fetch failed', { error });
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * POST /api/applications/create
 * FIX: Was setting status = 'draft' which was never counted in analytics.
 * Now correctly sets status = AppStatus.SAVED so it appears in all dashboards.
 */
router.post('/create', optionalAuthMiddleware, validate(CreateApplicationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { schemeId, schemeName, formData, type } = req.body;

    const app = await ApplicationModel.create({
      id: crypto.randomUUID(),
      userId: req.userId || 'guest-' + crypto.randomBytes(4).toString('hex'),
      schemeId,
      schemeName,
      formData: formData || {},
      documents: [],
      // FIX: 'saved' is the correct initial status — matches all dashboard status counts
      status: AppStatus.SAVED,
      paymentStatus: 'pending',
      type: type || 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    invalidateAnalyticsCache();
    res.status(201).json({ application: app });
  } catch (error: any) {
    logger.error('[ApplicationRoute] create failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * POST /api/applications/submit
 * FIX: Now calls checkDocuments() to validate uploaded files.
 * Stores verificationResult in the application document.
 * Blocks submission if critical documents are missing (score < 50).
 */
router.post('/submit', optionalAuthMiddleware, validate(SubmitApplicationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id, documents, type, paymentStatus } = req.body;
    
    const app = await ApplicationModel.findOne({ id });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Fetch scheme to get required documents list
    let scheme = await SchemeModel.findOne({ id: app.schemeId });
    if (!scheme && app.schemeId.startsWith('scraped-')) {
      scheme = await ScrapedSchemeModel.findOne({ id: app.schemeId });
    }
    const requiredDocs: string[] = scheme?.documents || [];
    
    // ── DOCUMENT VERIFICATION PIPELINE ──────────────────────────────────────
    // FIX: checkDocuments was imported but NEVER called. Now it runs on every submission.
    const uploadedDocs = documents || [];
    const missingDocuments = checkDocuments(requiredDocs, uploadedDocs);
    
    const verificationScore = requiredDocs.length === 0
      ? 100
      : Math.max(0, Math.round(((requiredDocs.length - missingDocuments.length) / requiredDocs.length) * 100));

    const verificationResult = {
      verified: missingDocuments.length === 0,
      missingDocuments,
      verificationScore,
      verificationTimestamp: new Date().toISOString(),
    };

    // Block submission if more than 50% of required documents are missing
    if (requiredDocs.length > 0 && verificationScore < 50) {
      return res.status(400).json({
        error: 'Submission blocked: Too many required documents are missing.',
        missingDocuments,
        verificationScore,
        hint: `Please upload the following documents before submitting: ${missingDocuments.join(', ')}`,
      });
    }

    const updatedType = type || app.type;

    const updates: any = { 
      documents: uploadedDocs,
      type: updatedType,
      status: AppStatus.SUBMITTED,
      paymentStatus: paymentStatus || app.paymentStatus,
      updatedAt: new Date().toISOString(),
      trackingId: `GOV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      verificationResult, // Store verification details on the application
    };

    const updated = await ApplicationModel.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
    invalidateAnalyticsCache();

    logger.info('[ApplicationRoute] submitted', {
      id,
      verificationScore,
      missingDocuments: missingDocuments.length,
    });

    res.json({ 
      application: updated,
      verification: verificationResult,
    });
  } catch (error: any) {
    logger.error('[ApplicationRoute] submit failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * PATCH /api/applications/status/:id
 * Updates application status with enum validation and transition guard.
 */
router.patch('/status/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes } = req.body;

    // Validate status is a known enum value
    const validStatuses = Object.values(AppStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const app = await ApplicationModel.findOne({ id: req.params.id });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Validate state transition
    if (!isValidTransition(app.status as any, status)) {
      return res.status(400).json({
        error: `Invalid status transition from '${app.status}' to '${status}'`,
      });
    }

    const updated = await ApplicationModel.findOneAndUpdate(
      { id: req.params.id }, 
      { status, notes: notes || '', updatedAt: new Date().toISOString() }, 
      { returnDocument: 'after' }
    );

    invalidateAnalyticsCache();
    res.json({ application: updated });
  } catch (error: any) {
    logger.error('[ApplicationRoute] status update failed', { error: error.message });
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
