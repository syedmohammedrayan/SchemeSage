import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { db } from '../config/db.js';

const router = Router();

// GET /profile — fetch own profile from Firestore
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId!).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const { password, ...safe } = userDoc.data() as any;
    res.json({ profile: safe });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /profile — update profile fields in Firestore
router.put('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId!).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const role = userDoc.data()?.role;

    // Base fields any user can update
    const baseFields = ['fullName', 'mobile', 'address', 'avatarUrl'];

    // Agent/Admin extra fields
    const agentFields = ['state', 'district', 'expertise'];

    const allowedFields = role === 'admin' || role === 'agent'
      ? [...baseFields, ...agentFields]
      : baseFields;

    const updates: any = { updatedAt: new Date().toISOString() };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await db.collection('users').doc(req.userId!).update(updates);

    const updated = await db.collection('users').doc(req.userId!).get();
    const { password, ...safe } = updated.data() as any;
    res.json({ profile: safe });
  } catch (error) {
    console.error('[Profile Update Error]', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
