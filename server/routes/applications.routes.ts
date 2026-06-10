import { Router, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { checkDocuments } from '../utils/documentCheck.js';
import { ApplicationModel, SchemeModel, ScrapedSchemeModel } from '../models/index.js';

const router = Router();

router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const apps = await ApplicationModel.find({ userId: req.params.userId || req.userId! }).sort({ createdAt: -1 });
    res.json({ applications: apps });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/create', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { schemeId, schemeName, formData, type } = req.body;
    if (!schemeId || !schemeName) {
      return res.status(400).json({ error: 'schemeId and schemeName are required' });
    }

    const app = await ApplicationModel.create({
      id: crypto.randomUUID(),
      userId: req.userId || 'guest-' + crypto.randomBytes(4).toString('hex'),
      schemeId,
      schemeName,
      formData: formData || {},
      documents: [],
      status: 'draft',
      paymentStatus: 'pending',
      type: type || 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ application: app });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/submit', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, documents, type, paymentStatus } = req.body;
    
    const app = await ApplicationModel.findOne({ id });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    let scheme = await SchemeModel.findOne({ id: app.schemeId });
    if (!scheme && app.schemeId.startsWith('scraped-')) {
      scheme = await ScrapedSchemeModel.findOne({ id: app.schemeId });
    }
    const requiredDocs = scheme?.documents || [];
    
    const updatedType = type || app.type;
    const isAssisted = updatedType === 'assisted';

    const updates: any = { 
      documents,
      type: updatedType,
      status: 'submitted', // All final submissions move to submitted
      paymentStatus: paymentStatus || app.paymentStatus,
      updatedAt: new Date(),
      trackingId: `GOV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    };

    const updated = await ApplicationModel.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
    res.json({ application: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.patch('/status/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await ApplicationModel.findOneAndUpdate(
      { id: req.params.id }, 
      { status, updatedAt: new Date() }, 
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
