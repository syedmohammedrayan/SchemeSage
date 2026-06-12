import { Router, Request, Response } from 'express';
import { SchemeModel } from '../models/index.js';
import { realSchemesData } from '../store/schemes-data.js';

const router = Router();

router.post('/voice-profile', async (req: Request, res: Response) => {
  try {
    const { language, text } = req.body;
    const PYTHON_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';
    
    // 1. Forward to Python ML Service for Translation & Extraction
    const pythonResponse = await fetch(`${PYTHON_URL}/voice-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text || '', language: language || 'en' })
    });
    
    if (!pythonResponse.ok) {
      throw new Error(`Python ML Service failed: ${pythonResponse.status}`);
    }
    
    const extractedData = await pythonResponse.json();
    
    // 2. Forward Extracted Profile to Python ML Service for Recommendations
    const recommendResponse = await fetch(`${PYTHON_URL}/recommend`, {
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
