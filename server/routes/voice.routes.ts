import { Router, Request, Response } from 'express';
import { extractVoiceProfile, generateSmartCitizenReport } from '../services/gemini.js';
import { SchemeModel } from '../models/index.js';

const router = Router();

router.post('/voice-profile', async (req: Request, res: Response) => {
  try {
    const { language, text } = req.body;
    
    // 1. Extract Profile using Node.js Gemini Service
    const extractedData = await extractVoiceProfile(text || '', language || 'en');
    
    // 2. Forward Extracted Profile to Recommendation Engine
    const allSchemes = await SchemeModel.find({});
    const report = await generateSmartCitizenReport(extractedData.profile, allSchemes.map((s: any) => s.toObject()));
    
    // 3. Construct Final Response matching Eligibility.tsx
    const recommendations: any = { "Top Matches": [] };
    if (report.topMatches) {
       recommendations["Top Matches"] = report.topMatches.map(m => ({
          schemeId: m.scheme.id,
          matchScore: m.matchScore,
          schemeName: m.scheme.name,
          ministry: m.scheme.ministry,
          benefits: m.scheme.benefits,
          reasons: m.whyRecommended
       }));
    }
    
    res.json({
      originalText: text,
      translatedText: extractedData.translatedText || text,
      profile: extractedData.profile,
      profileCompleteness: report.profileCompleteness || 0,
      recommendations: recommendations
    });

  } catch (error: any) {
    console.error('[Voice Profile Error]', error.message);
    res.status(500).json({ error: "Failed to process voice profile" });
  }
});

export default router;
