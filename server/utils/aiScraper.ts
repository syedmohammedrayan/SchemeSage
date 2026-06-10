import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScrapedSchemeModel } from '../models/index.js';
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runAIScraper() {
  console.log('[🚀 AI Scraper] Starting Selenium process...');
  
  // Use the local virtual environment's python if available
  const venvPython = process.platform === 'win32' 
    ? path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
    : path.join(process.cwd(), '.venv', 'bin', 'python');
    
  const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python';

  const pythonProcess = spawn(pythonPath, [path.join(process.cwd(), 'server', 'scraper', 'selenium_scraper.py')]);
  
  let dataString = '';
  
  pythonProcess.stdout.on('data', (data) => {
    dataString += data.toString();
  });

  return new Promise((resolve, reject) => {
    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`[🚨 AI Scraper] Python process exited with code ${code}`);
        return reject(new Error('Python scraper failed'));
      }

      try {
        const rawSchemes = JSON.parse(dataString);
        console.log(`[🤖 AI Scraper] Found ${rawSchemes.length} schemes. Structuring with AI...`);

        for (let i = 0; i < rawSchemes.length; i++) {
          const raw = rawSchemes[i];
          
          // Introduce a delay to respect API quotas (except for the first one)
          if (i > 0) {
            console.log(`[⏳ AI Scraper] Waiting 4 seconds before next AI request...`);
            await delay(4000);
          }

          console.log(`[🤖 AI Scraper] Processing scheme ${i + 1}/${rawSchemes.length}: ${raw.name}`);

          // Use AI to extract rigid structure
          const structurePrompt = `
            Extract structured eligibility data from this Indian government scheme details.
            Return ONLY a valid JSON object.
            
            Scheme Name: ${raw.name}
            Details: ${raw.description}
            
            Fields to extract:
            - target_gender: "Male", "Female", or "All"
            - minimum_age: Number (or null)
            - max_income: Number (or null)
            - target_states: Array of state names (or ["All"])
            - target_categories: Array like ["General", "OBC", "SC", "ST"] (or ["All"])
            - category: One word like "Agriculture", "Education", "Healthcare", "Finance"
            
            Example output:
            {"target_gender": "All", "minimum_age": 18, "max_income": 200000, "target_states": ["All"], "target_categories": ["SC", "ST"], "category": "Agriculture"}
          `;

          try {
            const result = await model.generateContent(structurePrompt);
            const response = await result.response;
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            let aiData = {};
            if (jsonMatch) {
              aiData = JSON.parse(jsonMatch[0]);
            }

            // Save to MongoDB
            await ScrapedSchemeModel.findOneAndUpdate(
              { name: raw.name },
              {
                id: `scraped-${crypto.randomUUID()}`,
                ...raw,
                ...aiData,
                updatedAt: new Date()
              },
              { upsert: true, returnDocument: 'after' }
            );
            console.log(`[✅ AI Scraper] Successfully structured: ${raw.name}`);
          } catch (aiErr: any) {
            if (aiErr.status === 429) {
              console.warn(`[⚠️ AI Scraper] Quota exceeded for ${raw.name}. Skipping AI enhancement.`);
            } else {
              console.error(`[⚠️ AI Scraper] AI structuring failed for ${raw.name}:`, aiErr.message || aiErr);
            }
            
            // Fallback: save without AI enhancement
            await ScrapedSchemeModel.findOneAndUpdate(
              { name: raw.name },
              { id: `scraped-${crypto.randomUUID()}`, ...raw, updatedAt: new Date() },
              { upsert: true }
            );
          }
        }

        console.log('[✅ AI Scraper] Completed successfully.');
        resolve(true);
      } catch (parseErr) {
        console.error('[🚨 AI Scraper] Data parsing failed:', parseErr);
        reject(parseErr);
      }
    });
  });
}
