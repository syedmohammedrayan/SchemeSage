import { Router, Request, Response } from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/transcribe', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { language, text } = req.body;
    const isTextBased = !!text;
    const transcriptText = text || '';

    // Initialize default fallback response structure
    const defaultResponse = {
      text: transcriptText || "Audio transcription unavailable",
      profile: { age: null, state: null, occupation: null, income: null },
      confidence: { age: 0, state: 0, occupation: 0, income: 0 },
      reasoning: ["Direct search enabled (AI offline)"]
    };

    if (isTextBased) {
      // 1. Text-based extraction (Speech-to-text occurred on the client side)
      try {
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: "application/json"
          }
        });

        const prompt = `You are an expert AI welfare scheme assistant.
        Given this transcribed user search query: "${transcriptText}"
        Extract profile details (age, state, occupation, income) if present.
        Provide realistic confidence scores (0-100) for each extracted field based on how clearly it was stated or inferred.
        Finally, provide 3-4 short, punchy AI reasoning steps (e.g., "Detected agricultural occupation", "Checking income eligibility").

        Return ONLY a JSON object (no markdown block formatting).
        Schema:
        {
          "text": "the search query text",
          "profile": {
            "age": "extracted age (number string) or null",
            "state": "extracted state or null",
            "occupation": "extracted occupation or null",
            "income": "extracted income (number string) or null"
          },
          "confidence": {
            "age": 95,
            "state": 80,
            "occupation": 90,
            "income": 85
          },
          "reasoning": [
            "Analyzed search query text",
            "Extracted demographic parameters"
          ]
        }
        The language spoken is likely: ${language || 'en'}
        `;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        if (responseText.startsWith('```json')) responseText = responseText.replace(/```json/g, '');
        if (responseText.startsWith('```')) responseText = responseText.replace(/```/g, '');
        if (responseText.endsWith('```')) responseText = responseText.substring(0, responseText.length - 3);

        const parsed = JSON.parse(responseText.trim());
        // Sync transcribed text
        parsed.text = transcriptText;
        console.log(`[Gemini Text Profile Extracted]: "${parsed.text}"`, parsed.profile);
        return res.json(parsed);
      } catch (geminiError: any) {
        console.warn('[Gemini Text Extraction Error, using fallback]:', geminiError.message);
        return res.json(defaultResponse);
      }
    } else {
      // 2. Audio-based transcription (Original binary upload path)
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file or text query provided' });
      }

      try {
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: "application/json"
          }
        });

        const prompt = `You are an expert AI welfare scheme assistant. 
        First, transcribe the provided voice audio EXACTLY as spoken.
        Then, extract profile details (age, state, occupation, income) from the audio if present.
        Provide realistic confidence scores (0-100) for each extracted field based on how clearly it was stated.
        Finally, provide 3-4 short, punchy AI reasoning steps (e.g., "Detected agricultural occupation", "Checking income eligibility").

        Return ONLY a JSON object (no markdown block formatting).
        Schema:
        {
          "text": "The exact transcribed text in the original language",
          "profile": {
            "age": "extracted age or null",
            "state": "extracted state or null",
            "occupation": "extracted occupation or null",
            "income": "extracted income or null"
          },
          "confidence": {
            "age": 95,
            "state": 80,
            "occupation": 90,
            "income": 85
          },
          "reasoning": [
            "Analyzed audio input",
            "Extracted demographic parameters"
          ]
        }
        The language spoken is likely: ${language || 'en'}
        `;

        const mimeType = req.file.mimetype ? req.file.mimetype.split(';')[0] : "audio/webm";

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: mimeType,
              data: req.file.buffer.toString("base64")
            }
          },
          { text: prompt }
        ]);

        let responseText = result.response.text().trim();
        if (responseText.startsWith('```json')) responseText = responseText.replace(/```json/g, '');
        if (responseText.startsWith('```')) responseText = responseText.replace(/```/g, '');
        if (responseText.endsWith('```')) responseText = responseText.substring(0, responseText.length - 3);

        const parsed = JSON.parse(responseText.trim());
        console.log(`[Gemini Voice Transcribed & Extracted]: "${parsed.text}"`);
        return res.json(parsed);
      } catch (geminiError: any) {
        console.warn('[Gemini Audio Transcription Error, using fallback]:', geminiError.message);
        return res.json({
          text: "Voice search received (profile extraction offline)",
          profile: { age: null, state: null, occupation: null, income: null },
          confidence: { age: 0, state: 0, occupation: 0, income: 0 },
          reasoning: ["Failed to transcribe audio (API offline)"]
        });
      }
    }
  } catch (error: any) {
    console.error('[Gemini Voice Transcription Router Error]', error.message);
    res.json({
      text: "Voice transcription error occurred",
      profile: { age: null, state: null, occupation: null, income: null },
      confidence: { age: 0, state: 0, occupation: 0, income: 0 },
      reasoning: ["System error occurred"]
    });
  }
});

export default router;
