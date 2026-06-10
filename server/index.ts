import 'dotenv/config';
import { scrapeSchemes } from "./scraper";
import express from 'express';
import { connectDB, getDbStatus } from './config/db.js';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { seedData } from './store/seed.js';
import { runManagedScraper } from './services/managedScraper.js';

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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Expose io to routes if needed
app.set('io', io);

const PORT = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schemes', schemesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/saved-schemes', savedRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/government', governmentRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/agent', agentWorkflowRoutes);
app.use('/api/scrape', scraperRoutes);
app.use('/api/voice', voiceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  const dbStatus = getDbStatus();
  res.json({ 
    status: dbStatus.connected ? 'ok' : 'degraded', 
    database: dbStatus,
    timestamp: new Date().toISOString() 
  });
});

// Start Server function encapsulated for cleaner async flow
async function startServer() {
  try {
    console.log("📍 Initializing Scheme Sage Backend...");
    
    // 1. Connect to Database FIRST
    const dbSuccess = await connectDB();
    if (!dbSuccess) {
      console.error("❌ Critical: Could not connect to database. Server aborting.");
      process.exit(1);
    }

    // 2. Initial Seeding
    await seedData();

    // 3. Start Listening (Use httpServer instead of app)
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Backend server fully operational on http://127.0.0.1:${PORT}`);
      console.log(`📋 API endpoints available at http://127.0.0.1:${PORT}/api/*`);
      console.log(`🔌 WebSocket server attached.`);
      console.log(`📂 Static uploads available at http://127.0.0.1:${PORT}/uploads/*`);
      
      console.log(`\n🔑 Demo accounts:`);
      console.log(`   Citizen:    citizen@demo.com / demo123`);
      console.log(`   Admin:      admin@demo.com / demo123`);
      console.log(`   Government: gov@demo.com / demo123\n`);

      // 4. Register CRON and background tasks
      console.log("[🗓️ Cron] Registering internal automation routines...");
      cron.schedule("0 */6 * * *", async () => {
        console.log("[🗓️ Cron] Triggering every 6 hours: AI-Powered Global Scheme Scraper...");
        try {
          const result = await runManagedScraper();
          if (result && result.success && result.count > 0 && result.data) {
             io.emit('NEW_SCHEME_SCRAPED', result.data);
          }
        } catch (err) {
          console.error("[🗓️ Cron] Scraper failed:", err);
        }
      });
      
      setTimeout(async () => {
        console.log("[🚀 Boot] Performing initial global scheme sync...");
        try {
          const result = await runManagedScraper();
          if (result && result.success && result.count > 0 && result.data) {
             io.emit('NEW_SCHEME_SCRAPED', result.data);
          }
        } catch(err) {
          console.error("[🚀 Boot] Initial sync failed:", err);
        }
      }, 10000);
    });

    io.on('connection', (socket: any) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use.`);
        console.error(`💡 Try running: netstat -ano | findstr :${PORT} and then taskkill /F /PID <PID>\n`);
        process.exit(1);
      } else {
        console.error(`\n❌ Server error:`, e);
      }
    });

    // Graceful Shutdown Handlers
    const shutdown = () => {
      console.log("\n🛑 Gracefully shutting down server...");
      server.close(() => {
        console.log("📥 Server closed. Releasing resources.");
        process.exit(0);
      });
      
      // Force exit after 5s if server.close hangs
      setTimeout(() => {
        console.log("⚠️ Forcefully exiting...");
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error("💥 Fatal startup error:", err);
    process.exit(1);
  }
}

startServer();
