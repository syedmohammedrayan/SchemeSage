import 'dotenv/config';
import { scrapeSchemes } from "./scraper";
import express from 'express';
import helmet from 'helmet';
import { connectDB, getDbStatus } from './config/db.js';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { seedData } from './store/seed.js';
import { runManagedScraper } from './services/managedScraper.js';
import { requestLogger, logger } from './utils/logger.js';
import { generalRateLimit, authRateLimit, aiRateLimit, scraperRateLimit } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.routes.js';
import schemesRoutes from './routes/schemes.routes.js';
import profileRoutes from './routes/profile.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import savedRoutes from './routes/saved.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';
import governmentRoutes from './routes/government.routes.js';
import agentsRoutes from './routes/agents.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import agentWorkflowRoutes from './routes/agent.workflow.routes.js';
import scraperRoutes from './routes/scraper.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import withdrawalRoutes from './routes/withdrawal.routes.js';

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
// Helmet sets secure HTTP headers (X-Content-Type, X-Frame-Options, etc.)
app.use(helmet({
  // Allow inline scripts for Vite dev server
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS — use explicit origin, never wildcard in production
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? CLIENT_URL : [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// ─── WebSocket Server ─────────────────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    // FIX: Was hardcoded '*'. Now uses CLIENT_URL env variable.
    origin: process.env.NODE_ENV === 'production' ? CLIENT_URL : '*',
  },
});

// Expose io to routes for real-time events
app.set('io', io);

const PORT = parseInt(process.env.PORT || '3001');

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

// ─── Rate-Limited Route Mounting ──────────────────────────────────────────────
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/ai', aiRateLimit, aiRoutes);
app.use('/api/admin/scrape', scraperRateLimit); // Scraper rate limit before admin routes
app.use('/api', generalRateLimit); // General limit for all other API routes

// ─── Route Mounting ───────────────────────────────────────────────────────────
app.use('/api/schemes', schemesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/saved-schemes', savedRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/government', governmentRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/agent', agentWorkflowRoutes);
app.use('/api/scrape', scraperRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/withdrawal', withdrawalRoutes);

// Health check — exposes DB status without sensitive info
app.get('/api/health', (_req, res) => {
  const dbStatus = getDbStatus();
  res.json({ 
    status: dbStatus.connected ? 'ok' : 'degraded', 
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Server Startup ───────────────────────────────────────────────────────────
async function startServer() {
  try {
    logger.info('Initializing SchemeSage Backend...');
    
    // 1. Connect to Database FIRST
    const dbSuccess = await connectDB();
    if (!dbSuccess) {
      logger.error('Critical: Could not connect to database. Server aborting.');
      process.exit(1);
    }

    // 2. Initial Seeding
    await seedData();

    // 3. Start Listening
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`Backend server operational on port ${PORT}`);
      logger.info(`API available at http://127.0.0.1:${PORT}/api/*`);
      logger.info(`WebSocket attached — Client origin: ${CLIENT_URL}`);

      // 4. Register CRON jobs
      cron.schedule('0 */6 * * *', async () => {
        logger.info('[Cron] Triggering scheduled AI scheme scraper...');
        try {
          const result = await runManagedScraper();
          if (result && result.success && result.count > 0 && result.data) {
            io.emit('NEW_SCHEME_SCRAPED', result.data);
            logger.info('[Cron] Scraper completed', { count: result.count });
          }
        } catch (err: any) {
          logger.error('[Cron] Scraper failed', { error: err.message });
        }
      });
      
      // 5. Initial scheme sync after 10s boot delay
      setTimeout(async () => {
        logger.info('[Boot] Performing initial global scheme sync...');
        try {
          const result = await runManagedScraper();
          if (result && result.success && result.count > 0 && result.data) {
            io.emit('NEW_SCHEME_SCRAPED', result.data);
          }
        } catch (err: any) {
          logger.error('[Boot] Initial sync failed', { error: err.message });
        }
      }, 10000);
    });

    io.on('connection', (socket: any) => {
      logger.debug(`WebSocket client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        logger.debug(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use.`);
        process.exit(1);
      } else {
        logger.error('Server error', { error: e.message });
      }
    });

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Gracefully shutting down server...');
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 5000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err: any) {
    logger.error('Fatal startup error', { error: err.message });
    process.exit(1);
  }
}

startServer();
