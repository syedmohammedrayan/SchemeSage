import { Router, Response } from 'express';
import crypto from 'crypto';
import { scrapeSchemes } from '../scraper.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { sanitizeUser } from '../utils/helpers.js';
import { 
  UserModel, 
  ApplicationModel, 
  SchemeModel, 
  ScrapedSchemeModel, 
  NotificationModel 
} from '../models/index.js';

const router = Router();

router.use(authMiddleware);
router.use(roleGuard('admin'));

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await UserModel.find({});
    const allApps = await ApplicationModel.find({});
    const dbSchemes = await SchemeModel.find({});
    const allSchemes = dbSchemes.filter((s: any) => !/^s\d+$/.test(s.id));

    const applicationsByStatus = {
      saved: allApps.filter((a: any) => a.status === 'saved').length,
      started: allApps.filter((a: any) => a.status === 'started').length,
      submitted: allApps.filter((a: any) => a.status === 'submitted').length,
      approved: allApps.filter((a: any) => a.status === 'approved').length,
      rejected: allApps.filter((a: any) => a.status === 'rejected').length,
    };

    const mostViewedSchemes = [...allSchemes]
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 5)
      .map((s: any) => ({ id: s.id, name: s.name, views: s.views }));

    const mostSavedSchemes = [...allSchemes]
      .sort((a: any, b: any) => b.saves - a.saves)
      .slice(0, 5)
      .map((s: any) => ({ id: s.id, name: s.name, saves: s.saves }));

    const monthlyTrends = [];
    const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    const baseUsers = [820, 1050, 1340, 1580, 1890, 2100];
    const baseApps = [120, 180, 250, 310, 420, 380];
    for (let i = 0; i < 6; i++) {
      monthlyTrends.push({
        month: months[i],
        users: baseUsers[i],
        applications: baseApps[i],
      });
    }

    res.json({
      totalUsers: allUsers.filter((u: any) => u.role === 'citizen').length,
      totalApplications: allApps.length,
      totalSchemes: allSchemes.length,
      pendingApplications: allApps.filter((a: any) => a.status === 'submitted').length,
      applicationsByStatus,
      mostViewedSchemes,
      mostSavedSchemes,
      monthlyTrends,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await UserModel.find({});
    res.json({ users: users.map((u: any) => sanitizeUser(u.toObject())) });
  } catch(error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/applications', async (_req: AuthRequest, res: Response) => {
  try {
    const apps = await ApplicationModel.find({});
    const popApps = await Promise.all(apps.map(async (app: any) => {
      const user = await UserModel.findOne({ id: app.userId });
      return {
        ...app.toObject(),
        userName: user?.fullName || 'Unknown',
        userEmail: user?.email || '',
        userState: user?.state || '',
      };
    }));
    res.json({ applications: popApps });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/applications/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'submitted', 'started', 'saved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const app = await ApplicationModel.findOne({ id: req.params.id });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    app.status = status;
    app.updatedAt = new Date();
    await app.save();

    await NotificationModel.create({
      id: crypto.randomUUID(),
      userId: app.userId,
      title: `Application ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your application for ${app.schemeName} has been ${status}. ${status === 'approved' ? 'Congratulations!' : 'Please check the eligibility criteria and try again.'}`,
      type: 'update',
      read: false,
    });

    res.json({ application: app });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/schemes', async (req: AuthRequest, res: Response) => {
  try {
    const { name, ministry, description, benefits, eligibility, documents, deadline, applyLink, tags } = req.body;

    if (!name || !ministry || !description || !benefits) {
      return res.status(400).json({ error: 'name, ministry, description, and benefits are required' });
    }

    const scheme = await SchemeModel.create({
      id: crypto.randomUUID(),
      name,
      ministry,
      description,
      benefits,
      eligibility: eligibility || {},
      documents: documents || [],
      deadline,
      applyLink: applyLink || '#',
      tags: tags || [],
    });

    // Broadcast mapping
    const users = await UserModel.find({ role: 'citizen' });
    const notifs = users.map((u: any) => ({
      id: crypto.randomUUID(),
      userId: u.id,
      title: `New Scheme: ${name}`,
      message: `A new scheme "${name}" from ${ministry} has been added. Check if you're eligible!`,
      type: 'new_scheme',
      read: false
    }));
    await NotificationModel.insertMany(notifs);

    res.status(201).json({ scheme });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/schemes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updated = await SchemeModel.findOneAndUpdate({ id: req.params.id }, req.body, { returnDocument: 'after' });
    if (!updated) return res.status(404).json({ error: 'Scheme not found' });
    res.json({ scheme: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.delete('/schemes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await SchemeModel.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Scheme not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/notifications/broadcast', async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'title and message are required' });
    }
    
    const users = await UserModel.find({ role: 'citizen' });
    const notifs = users.map((u: any) => ({
      id: crypto.randomUUID(),
      userId: u.id,
      title,
      message,
      type: type || 'system',
      read: false
    }));
    await NotificationModel.insertMany(notifs);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/scraped-data', async (_req: AuthRequest, res: Response) => {
  try {
    const latest = await ScrapedSchemeModel.find({}).sort({ createdAt: -1 }).limit(10);
    const trending = await ScrapedSchemeModel.find({}).sort({ views: -1 }).limit(5);
    res.json({ success: true, latest, trending });
  } catch (err) {
    console.error('[Scraper Error]', err);
    res.status(500).json({ error: 'Failed to fetch scraped data.' });
  }
});

router.post('/scrape/trigger', async (_req: AuthRequest, res: Response) => {
  try {
    const scrapedCount = await scrapeSchemes();
    res.json({ success: true, count: scrapedCount });
  } catch (err: any) {
    console.error('[Scraper Trigger Error]', err);
    res.status(500).json({ error: err.message || 'Failed to trigger scraper' });
  }
});

// AI Agent Registry Routes
import { AIAgentModel } from '../models/index.js';
import { registerLeanIXAgent } from '../services/leanixAgentService.js';

router.get('/ai-agents', async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await AIAgentModel.find({}).sort({ createdAt: -1 });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/ai-agents', async (req: AuthRequest, res: Response) => {
  try {
    const agentData = {
      ...req.body,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    const agent = await AIAgentModel.create(agentData);
    
    // Auto-sync to LeanIX
    try {
      await registerLeanIXAgent(agentData);
    } catch (leanixErr) {
      console.error('Auto-sync to LeanIX failed, but agent was created locally', leanixErr);
    }

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/ai-agents/sync', async (req: AuthRequest, res: Response) => {
  try {
    const agents = await AIAgentModel.find({});
    const results = [];
    for (const agent of agents) {
      try {
        const result = await registerLeanIXAgent(agent);
        results.push({ name: agent.name, status: 'success', result });
      } catch (err: any) {
        results.push({ name: agent.name, status: 'error', error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
