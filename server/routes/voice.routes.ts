import { Router, Request, Response } from 'express';
import { realSchemesData } from '../store/schemes-data.js';

const router = Router();

router.post('/voice-profile', async (req: Request, res: Response) => {
  try {
    const { language, text } = req.body;
    
    // 1. Forward to Python ML Service for Translation & Extraction
    const pythonResponse = await fetch('http://localhost:8000/voice-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text || '', language: language || 'en' })
    });
    
    if (!pythonResponse.ok) {
      throw new Error(`Python ML Service failed: ${pythonResponse.status}`);
    }
    
    const extractedData = await pythonResponse.json();
    
    // 2. Forward Extracted Profile to Python ML Service for Recommendations
    const recommendResponse = await fetch('http://localhost:8000/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: extractedData.profile || {},
        available_schemes: realSchemesData
      })
    });
    
    if (!recommendResponse.ok) {
      throw new Error("Python ML Recommendation failed");
    }
    
    const recommendData = await recommendResponse.json();
    
    // 3. Construct Final Response matching Eligibility.tsx
    res.json({
      originalText: extractedData.text || text, // map text -> originalText
      translatedText: extractedData.translatedText,
      profile: extractedData.profile,
      profileCompleteness: recommendData.profileCompleteness || 0,
      recommendations: recommendData.recommendations || {}
    });

  } catch (error: any) {
    console.error('[Voice Profile Error]', error.message);
    res.status(500).json({ error: "Failed to process voice profile" });
  }
});

export default router;
