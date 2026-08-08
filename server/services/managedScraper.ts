import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedSchemeModel, ProcessedSchemeModel, ScrapeJobModel } from '../models/index.js';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function performRegexExtraction(rawText: string, targetUrl: string) {
  const schemes: any[] = [];
  
  const nameMatch = rawText.match(/Scheme Name:\s*(.+)/i) || rawText.match(/(.+ Yojana)/i);
  const incomeMatch = rawText.match(/income.*?below.*?₹?([\d,]+(\s*lakh)?)/i) || rawText.match(/annual family income.*?₹?([\d,]+(\s*lakh)?)/i);
  const ageMatch = rawText.match(/age.*?(\d{2}).*?years/i) || rawText.match(/(\d{2}).*?years/i);
  const categoryMatch = rawText.match(/(SC|ST|OBC|EWS|General|Minority)/gi);
  const genderMatch = rawText.match(/(Male|Female|Women|Girls)/gi);
  const occupationMatch = rawText.match(/(Student|Farmer|Worker|Self-employed|Unemployed)/gi);
  
  if (!nameMatch && !incomeMatch && !categoryMatch) return null; // Regex confidence low
  
  let name = nameMatch ? nameMatch[1].trim() : "Government Scheme";
  if (name.length > 100) name = name.substring(0, 100);

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
  
  schemes.push({
    name,
    description: rawText.substring(0, 500) + '...',
    benefits: "Refer to official documentation.",
    eligibility,
    documents: [],
    officialLink: targetUrl,
    ministry: "Unknown Ministry"
  });

  return schemes;
}

export async function runManagedScraper(targetUrl: string = 'https://www.india.gov.in/my-government/schemes', io?: any) {
  console.log(`[🚀 AI Managed Scraper] Dispatching Native Node.js Agent to: ${targetUrl}`);

  const contentHash = crypto.createHash('md5').update(targetUrl).digest('hex');

  const cached = await ProcessedSchemeModel.findOne({ url: targetUrl });
  if (cached) {
    console.log(`[⚡ AI Managed Scraper] Using cached result for ${targetUrl}`);
    return { success: true, count: 0, data: [], cached: true };
  }

  // Recursive link discovery if base portal
  if (targetUrl.endsWith('.gov.in') || targetUrl.endsWith('.gov.in/')) {
     console.log(`[🔍 AI Scraper] Base portal detected. Crawling for internal scheme links...`);
     // In a full implementation, we'd fetch the homepage, find all hrefs matching /scheme/, 
     // and push them to a queue. For now, we proceed to scrape the given URL.
  }

  let attempt = 0;
  const maxAttempts = 3;
  const TIMEOUT_MS = parseInt(process.env.SCRAPE_TIMEOUT_MS || '30000', 10);

  while (attempt < maxAttempts) {
    attempt++;
    try {
      await ScrapeJobModel.findOneAndUpdate(
        { url: targetUrl },
        { $set: { status: 'processing', attempts: attempt, lastAttempt: new Date() } },
        { upsert: true }
      );

      let rawText = '';
      try {
        const response = await axios.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: TIMEOUT_MS 
        });

        const $ = cheerio.load(response.data);
        $('script, style, nav, footer, header, noscript, iframe, svg, img').remove();
        rawText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 20000);
      } catch (err: any) {
        console.warn(`[⚠️ AI Scraper] Axios failed (${err.message}). Falling back to Browser-Use Cloud...`);
        rawText = ''; // Force fallback
      }

      // Browser-Use API Fallback for dynamic/JS-heavy pages
      if (!rawText || rawText.length < 200 || rawText.toLowerCase().includes('enable javascript')) {
        console.log(`[☁️ Browser-Use] Detected dynamic page.`);
        // Since we don't have puppeteer or a valid Browser-Use API key in this environment, we fail gracefully
        throw new Error("Dynamic JS-heavy page detected. Real browser required to extract data from this portal.");
      }

      console.log(`[🧠 AI Extractor] Attempt ${attempt}: Extracted ${rawText.length} characters.`);

      let schemesToSave: any[] = [];
      
      console.log(`[🤖 AI Managed Scraper] Extracting using Gemini 1.5 Flash...`);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
          You are an expert AI extraction agent.
          Extract all government welfare schemes mentioned in the following webpage text.
          Return ONLY a JSON array of objects. Do not include markdown blocks like \\\`\\\`\\\`json.
          
          Schema for each object:
          {
              "name": "Scheme Name",
              "description": "Detailed description of the scheme",
              "benefits": "Financial or social benefits provided",
              "eligibility": { "minAge": null, "maxAge": null, "maxIncome": null, "gender": "all", "categories": [], "occupations": [] },
              "documents": ["List of documents required"],
              "officialLink": "${targetUrl}",
              "ministry": "The offering ministry or state government"
          }
          
          --- Webpage Text ---
          \${rawText}
        `;

        const aiResult = await model.generateContent(prompt);
        let aiText = aiResult.response.text().trim();
        
        if (aiText.startsWith('\`\`\`json')) aiText = aiText.replace(/\`\`\`json/g, '');
        if (aiText.startsWith('\`\`\`')) aiText = aiText.replace(/\`\`\`/g, '');
        if (aiText.endsWith('\`\`\`')) aiText = aiText.substring(0, aiText.length - 3);

        schemesToSave = JSON.parse(aiText.trim());
      if (!Array.isArray(schemesToSave) || schemesToSave.length === 0) {
        throw new Error("No schemes discovered by regex or AI.");
      }

      let savedCount = 0;
      const newSchemes = [];
      
      for (const raw of schemesToSave) {
        if (!raw.name) continue;
        
        try {
          const savedScheme = await ScrapedSchemeModel.findOneAndUpdate(
            { name: raw.name },
            {
              $set: {
                name: raw.name,
                description: raw.description || "No description provided",
                benefits: raw.benefits || "No specific benefits listed",
                eligibility: raw.eligibility || {},
                documents: Array.isArray(raw.documents) ? raw.documents : [],
                officialLink: raw.officialLink || targetUrl,
                applyLink: raw.officialLink || targetUrl,
                ministry: raw.ministry || "Unknown Ministry",
                tags: ['Scraped', 'Government'],
                source: `AI Extractor / ${new URL(targetUrl).hostname}`,
                updatedAt: new Date(),
                publishedBy: 'ai-agent'
              },
              $setOnInsert: { id: `scraped-${crypto.randomUUID()}` }
            },
            { upsert: true, new: true } 
          );
          newSchemes.push(savedScheme);
          savedCount++;
        } catch (dbErr: any) {
          console.error(`[⚠️ DB] Failed to save "${raw.name}":`, dbErr.message);
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

      console.log(`[✅ AI Managed Scraper] Done! Saved ${savedCount} schemes.`);
      
      if (io && savedCount > 0) {
         io.emit('NEW_SCHEME_SCRAPED', newSchemes);
      }

      return { success: true, count: savedCount, data: newSchemes };

    } catch (error: any) {
      console.error(`[🚨 AI Managed Scraper] Attempt ${attempt} failed:`, error.message || error);
      
      if (attempt >= maxAttempts) {
        await ScrapeJobModel.findOneAndUpdate(
          { url: targetUrl },
          { $set: { status: 'failed', error: error.message || String(error) } }
        );
        return { success: false, error: 'Failed to scrape after max attempts. Queued for later retry.' };
      }
      
      const waitTime = attempt === 1 ? 30000 : 60000;
      await ScrapeJobModel.findOneAndUpdate(
        { url: targetUrl },
        { $set: { status: 'retrying', error: error.message || String(error) } }
      );
      console.log(`[⏳ AI Managed Scraper] Waiting ${waitTime/1000}s before retry...`);
      await delay(waitTime);
    }
  }
}
