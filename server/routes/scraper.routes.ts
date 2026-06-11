import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { runManagedScraper } from '../services/managedScraper.js';

const router = Router();

router.use(authMiddleware);
// Allow admin, agent, and government roles to access scraping
router.use(roleGuard('admin', 'agent', 'government'));

import crypto from 'crypto';

/**
 * @route POST /api/scrape/managed
 * @desc Trigger a high-reliability scrape using ScrapingBee and Gemini AI extraction (Async)
 */
router.post('/managed', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    console.log(`[Scraper Route] Queuing managed scrape for: ${url || 'default'}`);
    
    const jobId = crypto.randomUUID();
    const io = req.app.get('io');
    
    // Run in background
    runManagedScraper(url, io).catch(error => {
       console.error(`[🚨 Scraper Background Job Error ${jobId}]`, error.stack || error);
    });
    
    res.json({ 
      success: true, 
      message: 'Managed scrape job queued successfully.',
      jobId
    });
  } catch (error: any) {
    console.error('[🚨 Scraper Route Error]', error.stack || error);
    res.status(500).json({ 
      error: 'Failed to complete managed scrape.',
      details: error.message || 'Internal Server Error'
    });
  }
});

export default router;
