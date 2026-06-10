import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { ScrapedSchemeModel } from './models/index.js';

export interface ScrapedScheme {
  name: string;
  description: string;
  benefits: string;
  eligibility: string;
  documents: string;
  officialLink: string;
  source: string;
}

export async function scrapeSchemes() {
  console.log('[🚀 Scraper] Initializing light-weight cheerio scraper...');
  
  const urls = [
    'https://www.india.gov.in/topics/social-development',
    'https://www.india.gov.in/my-government/schemes'
  ];

  const allSchemes: ScrapedScheme[] = [];

  for (const url of urls) {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      
      const links = $('a');
      
      for (let i = 0; i < links.length; i++) {
        const title = $(links[i]).text().trim();
        const href = $(links[i]).attr('href');

        if (title && title.toLowerCase().includes('scheme') && href) {
          const absoluteUrl = href.startsWith('http') ? href : `https://www.india.gov.in${href}`;
          
          allSchemes.push({
            name: title,
            description: `Government scheme: ${title}. Visit official portal for more details.`,
            benefits: 'Financial assistance, healthcare support, or social security based on eligibility.',
            eligibility: 'Varies by scheme. Open to eligible Indian citizens.',
            documents: 'Aadhaar Card, Income Certificate, Resident Proof.',
            officialLink: absoluteUrl,
            source: 'india.gov.in'
          });
        }
      }
    } catch (err) {
      console.error(`[🚨 Scraper] Failed to scrape ${url}:`, err);
    }
  }

  // Deduplicate and limit
  const uniqueSchemes = Array.from(new Map(allSchemes.map(s => [s.name, s])).values()).slice(0, 20);

  console.log(`[🤖 Scraper] Found ${uniqueSchemes.length} schemes. Updating database...`);

  for (const scheme of uniqueSchemes) {
    try {
      await ScrapedSchemeModel.findOneAndUpdate(
        { name: scheme.name },
        { 
          id: `scraped-${crypto.randomUUID()}`,
          ...scheme,
          updatedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      console.error(`[⚠️ Scraper] Error saving scheme ${scheme.name}:`, err);
    }
  }

  return uniqueSchemes;
}
