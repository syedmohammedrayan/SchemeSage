import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { NotificationModel } from '../models/index.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await NotificationModel.find({ userId: req.userId }).sort({ createdAt: -1 });
    const unreadCount = await NotificationModel.countDocuments({ userId: req.userId, read: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await NotificationModel.findOneAndUpdate({ id: req.params.id, userId: req.userId }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await NotificationModel.updateMany({ userId: req.userId }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
