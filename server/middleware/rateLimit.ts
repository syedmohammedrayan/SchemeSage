import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

// ─── General API Rate Limit ───────────────────────────────────────────────────
// 120 requests per minute per IP for all API routes
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
  handler: (req, res, _next, options) => {
    logger.warn('General rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});

// ─── Auth Rate Limit ──────────────────────────────────────────────────────────
// 10 login/register attempts per 15 minutes per IP
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' },
  handler: (req, res, _next, options) => {
    logger.warn('Auth rate limit exceeded', { ip: req.ip, email: req.body?.email });
    res.status(429).json(options.message);
  },
});

// ─── AI Rate Limit ────────────────────────────────────────────────────────────
// 15 AI requests per minute per IP — prevents abuse of Gemini API calls
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait a moment before making more AI requests.' },
  handler: (req, res, _next, options) => {
    logger.warn('AI rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});

// ─── Scraper Rate Limit ───────────────────────────────────────────────────────
// Only 3 manual scraper triggers per 10 minutes
export const scraperRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Scraper is cooling down. Automated scraping runs every 6 hours. Please wait before triggering manually.' },
});
