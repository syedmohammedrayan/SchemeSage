import { Router, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { SchemeModel, ScrapedSchemeModel, UserModel } from '../models/index.js';
import { scoreSchemeForUser } from '../utils/helpers.js';

const router = Router();

router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, state, tags } = req.query;
    
    let query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query['eligibility.categories'] = { $regex: category, $options: 'i' };
    }
    
    if (state) {
      query['eligibility.states'] = { $regex: state, $options: 'i' };
    }

    if (tags) {
      const tagList = (tags as string).split(',').map(t => t.trim());
      query.tags = { $in: tagList.map(t => new RegExp(t, 'i')) };
    }

    const schemes = await SchemeModel.find(query).sort({ createdAt: -1 });
    const scrapedSchemes = await ScrapedSchemeModel.find(query).sort({ createdAt: -1 });

    // Combine and potentially rank if user profile exists
    // Exclude mock schemes (s1, s2, etc.) from the citizen feed as requested
    const realSchemes = schemes.filter((s: any) => !/^s\d+$/.test(s.id));
    
    let combined: any[] = [
      ...realSchemes.map((s: any) => s.toObject()), 
      ...scrapedSchemes.map((s: any) => ({ 
        ...s.toObject(), 
        type: 'scraped',
        tags: s.tags || ['Government'],
        ministry: s.ministry || 'Government of India',
        saves: s.saves || 0,
        views: s.views || 0,
        documents: Array.isArray(s.documents) ? s.documents : (typeof s.documents === 'string' ? s.documents.split(',').map((d: any) => d.trim()) : [])
      }))
    ];

    if (req.userId) {
       const user = await UserModel.findOne({ id: req.userId });
       if (user) {
         combined = combined.map((s: any) => ({
           ...s,
           matchScore: scoreSchemeForUser(s, user.toObject())
         })).sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
       }
    }

    res.json({ schemes: combined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    if (id.startsWith('scraped-')) {
      const scraped = await ScrapedSchemeModel.findOneAndUpdate(
        { id }, 
        { $inc: { views: 1 } }, 
        { returnDocument: 'after' }
      );
      if (!scraped) return res.status(404).json({ error: 'Scheme not found' });
      const normalized = {
        ...scraped.toObject(),
        tags: scraped.tags || ['Government'],
        ministry: scraped.ministry || 'Government of India',
        saves: scraped.saves || 0,
        views: scraped.views || 0,
        documents: Array.isArray(scraped.documents) ? scraped.documents : (typeof scraped.documents === 'string' ? scraped.documents.split(',').map((d: any) => d.trim()) : [])
      };
      return res.json({ scheme: normalized });
    }

    const scheme = await SchemeModel.findOneAndUpdate(
      { id }, 
      { $inc: { views: 1 } }, 
      { returnDocument: 'after' }
    );
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });
    
    res.json({ scheme });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
