import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScrapedSchemeModel, ProcessedSchemeModel, ScrapeJobModel } from '../models/index.js';
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function performRegexExtraction(raw: any) {
  const textToAnalyze = `${raw.name} ${raw.description}`;
  const incomeMatch = textToAnalyze.match(/income.*?below.*?₹?([\d,]+(\s*lakh)?)/i) || textToAnalyze.match(/annual family income.*?₹?([\d,]+(\s*lakh)?)/i);
  const ageMatch = textToAnalyze.match(/age.*?(\d{2}).*?years/i) || textToAnalyze.match(/(\d{2}).*?years/i);
  const categoryMatch = textToAnalyze.match(/(SC|ST|OBC|EWS|General|Minority)/gi);
  const genderMatch = textToAnalyze.match(/(Male|Female|Women|Girls)/gi);
  const occupationMatch = textToAnalyze.match(/(Student|Farmer|Worker|Self-employed|Unemployed)/gi);
  
  if (!incomeMatch && !categoryMatch && !ageMatch) return null;
  
  const eligibility: any = { categories: [], gender: "all", occupations: [] };
  
  if (incomeMatch) {
    let incStr = incomeMatch[1].replace(/,/g, '').toLowerCase();
    if (incStr.includes('lakh')) {
      eligibility.maxIncome = parseFloat(incStr) * 100000;
    } else {
      eligibility.maxIncome = parseInt(incStr, 10);
    }
  }
  if (ageMatch) eligibility.minAge = parseInt(ageMatch[1], 10);
  if (categoryMatch) eligibility.categories = [...new Set(categoryMatch.map(c => c.toUpperCase()))];
  if (genderMatch) eligibility.gender = genderMatch[0].toLowerCase();
  if (occupationMatch) eligibility.occupations = [...new Set(occupationMatch.map(o => o.toLowerCase()))];
  
  return eligibility;
}

export async function runAIScraper() {
  console.log('[🚀 AI Scraper] Starting Selenium process...');
  
  const venvPython = process.platform === 'win32' 
    ? path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
    : path.join(process.cwd(), '.venv', 'bin', 'python');
    
  const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python';
  const targetUrl = 'https://www.myscheme.gov.in/search'; // General identifier for the python script

  const contentHash = crypto.createHash('md5').update('python-selenium-myscheme').digest('hex');

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      await ScrapeJobModel.findOneAndUpdate(
        { url: targetUrl },
        { $set: { status: 'processing', attempts: attempt, lastAttempt: new Date() } },
        { upsert: true }
      );

      const pythonProcess = spawn(pythonPath, [path.join(process.cwd(), 'server', 'scraper', 'selenium_scraper.py')]);
      
      let dataString = '';
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      const exitCode = await new Promise((resolve, reject) => {
        pythonProcess.on('close', resolve);
        pythonProcess.on('error', reject);
      });

      if (exitCode !== 0) {
        throw new Error(`Python process exited with code ${exitCode}`);
      }

      const rawSchemes = JSON.parse(dataString);
      console.log(`[🤖 AI Scraper] Found ${rawSchemes.length} schemes. Structuring with AI/Regex...`);

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      for (let i = 0; i < rawSchemes.length; i++) {
        const raw = rawSchemes[i];
        
        console.log(`[🤖 AI Scraper] Processing scheme ${i + 1}/${rawSchemes.length}: ${raw.name}`);

        let aiData: any = null;
        const regexEligibility = performRegexExtraction(raw);

        if (regexEligibility) {
          console.log(`[⚡ AI Scraper] Regex extraction successful, bypassing Gemini for ${raw.name}.`);
          aiData = { eligibility: regexEligibility };
        } else {
          console.log(`[🤖 AI Scraper] Regex confidence low. Using Gemini-2.5-Flash-Lite...`);
          if (i > 0) await delay(4000);

          const structurePrompt = `
            Extract structured eligibility data from this Indian government scheme details.
            Return ONLY a valid JSON object.
            
            Scheme Name: \${raw.name}
            Details: \${raw.description}
            
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
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
              aiData = JSON.parse(jsonMatch[0]);
            }
          } catch (aiErr: any) {
             console.error(`[⚠️ AI Scraper] AI structuring failed for ${raw.name}:`, aiErr.message || aiErr);
             throw new Error(`AI Extraction failed for ${raw.name}`); // Will trigger outer retry
          }
        }

        if (aiData) {
          await ScrapedSchemeModel.findOneAndUpdate(
            { name: raw.name },
            {
              $set: {
                ...raw,
                ...aiData,
                updatedAt: new Date()
              },
              $setOnInsert: {
                id: `scraped-${crypto.randomUUID()}`
              }
            },
            { upsert: true }
          );
          console.log(`[✅ AI Scraper] Successfully structured: ${raw.name}`);
        }
      }

      await ProcessedSchemeModel.create({
        url: targetUrl,
        contentHash,
        lastProcessed: new Date()
      });

      await ScrapeJobModel.findOneAndUpdate(
        { url: targetUrl },
        { $set: { status: 'success', error: null } }
      );

      console.log('[✅ AI Scraper] Completed successfully.');
      return true;

    } catch (error: any) {
      console.error(`[🚨 AI Scraper] Attempt ${attempt} failed:`, error.message || error);
      
      if (attempt >= maxAttempts) {
        await ScrapeJobModel.findOneAndUpdate(
          { url: targetUrl },
          { $set: { status: 'failed', error: error.message || String(error) } }
        );
        throw error;
      }
      
      const waitTime = attempt === 1 ? 30000 : 60000;
      await ScrapeJobModel.findOneAndUpdate(
        { url: targetUrl },
        { $set: { status: 'retrying', error: error.message || String(error) } }
      );
      console.log(`[⏳ AI Scraper] Waiting ${waitTime/1000}s before retry...`);
      await delay(waitTime);
    }
  }
}
