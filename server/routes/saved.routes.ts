import { Router, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { SavedSchemeModel, SchemeModel, ScrapedSchemeModel } from '../models/index.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const savedItems = await SavedSchemeModel.find({ userId: req.userId }).sort({ savedAt: -1 });
    const schemes = await Promise.all(
      savedItems.map(async (s: any) => {
        let scheme = await SchemeModel.findOne({ id: s.schemeId });
        if (!scheme && String(s.schemeId).startsWith('scraped-')) {
          scheme = await ScrapedSchemeModel.findOne({ id: s.schemeId });
        }
        return scheme ? { ...scheme.toObject(), savedAt: s.savedAt } : null;
      })
    );
    res.json({ schemes: schemes.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/:schemeId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { schemeId } = req.params;
    let scheme = await SchemeModel.findOne({ id: schemeId });
    if (!scheme && String(schemeId).startsWith('scraped-')) {
      scheme = await ScrapedSchemeModel.findOne({ id: schemeId });
    }
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    const existing = await SavedSchemeModel.findOne({ userId: req.userId, schemeId });
    
    if (existing) {
      await SavedSchemeModel.deleteOne({ userId: req.userId!, schemeId });
      if (String(schemeId).startsWith('scraped-')) {
        await ScrapedSchemeModel.findOneAndUpdate({ id: schemeId }, { $inc: { saves: -1 } });
      } else {
        await SchemeModel.findOneAndUpdate({ id: schemeId }, { $inc: { saves: -1 } });
      }
      res.json({ saved: false });
    } else {
      await SavedSchemeModel.create({
        id: crypto.randomUUID(),
        userId: req.userId,
        schemeId,
        savedAt: new Date(),
      });
      if (String(schemeId).startsWith('scraped-')) {
        await ScrapedSchemeModel.findOneAndUpdate({ id: schemeId }, { $inc: { saves: 1 } });
      } else {
        await SchemeModel.findOneAndUpdate({ id: schemeId }, { $inc: { saves: 1 } });
      }
      res.json({ saved: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/check/:schemeId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await SavedSchemeModel.findOne({ userId: req.userId, schemeId: req.params.schemeId });
    res.json({ saved: !!existing });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
