import { Router, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { getSchemeRecommendations, chatWithAssistant, summarizeScheme, checkEligibility } from '../services/gemini.js';
import { UserModel, SchemeModel, ScrapedSchemeModel } from '../models/index.js';

const router = Router();

router.use(optionalAuthMiddleware);

// Public: Chat with AI assistant (Guests can provide profile in body)
router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversationHistory = [], profile } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    let userData = {};
    if (req.userId) {
      const user = await UserModel.findOne({ id: req.userId });
      userData = user?.toObject() || {};
    } else if (profile) {
      userData = profile;
    }

    const allSchemes = await SchemeModel.find({});
    const response = await chatWithAssistant(message, userData, conversationHistory, allSchemes.map(s => s.toObject()));
    res.json({ response });
  } catch (err) {
    console.error('[AI Chat Error]', err);
    res.json({ response: "I'm here to help you find government welfare schemes! Try asking about your eligibility or a specific scheme." });
  }
});

// Public: Get personalized recommendations (Guests can provide profile)
router.post('/recommendations', async (req: AuthRequest, res: Response) => {
  try {
    const lang: string = String(req.body.lang || 'en-IN');
    const { profile, query } = req.body;
    
    let userData = {};
    if (req.userId) {
      const user = await UserModel.findOne({ id: req.userId });
      userData = user?.toObject() || {};
    } else if (profile) {
      userData = profile;
    }

    const allSchemes = await SchemeModel.find({});
    const recommendations = await getSchemeRecommendations(userData, allSchemes.map(s => s.toObject()), lang, query);

    const enriched = await Promise.all(recommendations.map(async rec => ({
      ...rec,
      scheme: await SchemeModel.findOne({ id: rec.schemeId }),
    })));

    res.json({ recommendations: enriched.filter(r => r.scheme) });
  } catch (err) {
    console.error('[AI Recommendations Error]', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Public: Summarize a specific scheme
router.get('/summarize/:schemeId', async (req: AuthRequest, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId);
    let scheme = await SchemeModel.findOne({ id: schemeId });
    
    if (!scheme) {
      const scraped = await ScrapedSchemeModel.findOne({ id: schemeId });
      if (scraped) {
        scheme = scraped;
      }
    }

    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    const summary = await summarizeScheme(scheme.toObject());
    res.json({ summary });
  } catch (err) {
    console.error('[AI Summary Error]', err);
    res.json({ summary: 'Summary currently unavailable. Please refer to the full description below.' });
  }
});

// Public: Check eligibility for a specific scheme
router.post('/check-eligibility/:schemeId', async (req: AuthRequest, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId);
    let schemeData: any = await SchemeModel.findOne({ id: schemeId });

    if (!schemeData) {
      const scraped = await ScrapedSchemeModel.findOne({ id: schemeId });
      if (scraped) {
        // Map scraped fields to expected Eligibility structure for the algorithm/AI
        const s = scraped.toObject();
        schemeData = {
          ...s,
          eligibility: {
            minAge: s.minimum_age || 0,
            maxAge: 100,
            maxIncome: s.max_income || 9999999,
            gender: s.target_gender?.toLowerCase() || 'all',
            categories: s.target_categories || [],
            states: s.target_states || [],
            occupations: []
          }
        };
      }
    }

    if (!schemeData) return res.status(404).json({ error: 'Scheme data not found for eligibility check' });

    const { profile } = req.body;
    let userData = {};
    if (req.userId) {
      const user = await UserModel.findOne({ id: req.userId });
      userData = user?.toObject() || {};
    } else if (profile) {
      userData = profile;
    }

    const result = await checkEligibility(userData, schemeData);
    res.json(result);
  } catch (err: any) {
    console.error('[AI Eligibility Error]', err.message || err);
    res.json({ 
      eligible: false, 
      confidence: 'low', 
      explanation: 'We encountered an AI connectivity issue. Please refer to the eligibility criteria manually below.' 
    });
  }
});

export default router;
