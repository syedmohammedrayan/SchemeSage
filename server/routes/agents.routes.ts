import crypto from 'crypto';
import { Router, Response } from "express";
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from "../middleware/auth.js";
import { db, auth } from '../config/db.js';
import { AgentRequestModel, NotificationModel, AuditLogModel } from '../models/index.js';

const router = Router();

// Public: Get all approved agents from Firestore users collection
router.get("/", async (req, res) => {
  try {
    const { location, expertise } = req.query;

    const snapshot = await db.collection('users')
      .where('role', 'in', ['admin', 'agent'])
      .where('status', '==', 'active')
      .get();

    let agents = snapshot.docs.map((d: any) => {
      const { password, aadharNumber, panNumber, meeSevaId, ...safe } = d.data();
      return safe;
    });

    // Filter by location (state) if provided
    if (location && typeof location === 'string') {
      agents = agents.filter((a: any) =>
        a.state?.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by expertise if provided
    if (expertise && typeof expertise === 'string') {
      agents = agents.filter((a: any) =>
        a.expertise?.toLowerCase().includes(expertise.toLowerCase())
      );
    }

    res.json(agents);
  } catch (e: any) {
    console.error('[Agents GET Error]', e.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin/Gov/Agent: Get all callback requests from citizens
router.get("/all-requests", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'government' && req.user?.role !== 'agent') {
      return res.status(403).json({ error: "Unauthorized access to Help Centre pool" });
    }
    const requests = await AgentRequestModel.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Citizen: Request help/callback from an agent (Public access for guests)
router.post("/request", optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const payload = {
      ...req.body,
      id: crypto.randomUUID(),
      userId: req.userId || 'guest',
      agentId: req.body.agentId || 'all',
      message: req.body.message || `Requested expert assistance for scheme: ${req.body.schemeName || 'Unknown'}`
    };

    console.log("[Help Request] Creating lead:", payload.userName, "for", payload.schemeName);
    const request = await AgentRequestModel.create(payload);

    // Notify specific agent if targeted
    if (payload.agentId && payload.agentId !== 'all') {
      await NotificationModel.create({
        id: crypto.randomUUID(),
        userId: payload.agentId,
        title: 'New Lead: Callback Request',
        message: `${payload.userName || 'A guest user'} has requested help with ${payload.schemeName || 'a scheme'}. Contact: ${payload.userPhone}`,
        type: 'update',
        read: false,
      });
    }

    res.json(request);
  } catch (e: any) {
    console.error("[Help Request Error]", e.message || e);
    res.status(500).json({ error: e.message || 'Server Error' });
  }
});

// Specific Agent requests
router.get("/requests/:agentId", authMiddleware, async (req, res) => {
  try {
    const data = await AgentRequestModel.find({ agentId: req.params.agentId });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// RESTRICTED TO GOVERNMENT: Delete an agent completely from website and database
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'government') {
      return res.status(403).json({ error: "Agent management is restricted to Government officials." });
    }
    const agentId = req.params.id as string;
    const agentDoc = await db.collection('users').doc(agentId).get();
    if (!agentDoc.exists) return res.status(404).json({ error: "Agent not found" });

    // 1. Delete from Firebase Auth if it exists
    if (auth) {
      try {
        await auth.deleteUser(agentId);
        console.log(`[Firebase Auth] Successfully deleted user ${agentId}`);
      } catch (authErr: any) {
        console.warn(`[Firebase Auth Warning] Could not delete auth user ${agentId}:`, authErr.message);
      }
    }

    // 2. Delete from Firestore users collection
    await db.collection('users').doc(agentId).delete();
    console.log(`[Firestore] Successfully deleted agent ${agentId} from users`);

    // 3. Create Audit Log for agent deletion
    try {
      await AuditLogModel.create({
        id: crypto.randomUUID(),
        actorId: req.user?.id,
        actorName: req.user?.fullName,
        action: 'delete_agent',
        targetId: agentId,
        details: `Government official ${req.user?.fullName} completely deleted agent: ${agentDoc.data()?.fullName || agentId} (${agentId}) from the system.`,
      });
      console.log(`[Audit Trail] Logged deletion of agent: ${agentId}`);
    } catch (auditErr: any) {
      console.error('[Audit Log Error] Failed to log agent deletion:', auditErr.message);
    }

    res.json({ success: true, message: 'Agent removed completely.' });
  } catch (e: any) {
    console.error('[Agents DELETE Error]', e.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
