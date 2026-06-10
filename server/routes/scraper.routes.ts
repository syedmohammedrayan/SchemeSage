import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { runManagedScraper } from '../services/managedScraper.js';

const router = Router();

router.use(authMiddleware);
// Allow admin, agent, and government roles to access scraping
router.use(roleGuard('admin', 'agent', 'government'));

/**
 * @route POST /api/scrape/managed
 * @desc Trigger a high-reliability scrape using ScrapingBee and Gemini AI extraction
 */
router.post('/managed', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    console.log(`[Scraper Route] Triggering managed scrape for: ${url || 'default'}`);
    
    const result = await runManagedScraper(url);
    
    if (result.success && result.count > 0 && result.data) {
      const io = req.app.get('io');
      if (io) {
        io.emit('NEW_SCHEME_SCRAPED', result.data);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Managed scrape completed successfully.',
      count: result.count 
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
