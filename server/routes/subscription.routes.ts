import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { PLANS, checkApplicationLimit } from '../services/subscription.service.js';
import { AgentSubscriptionModel, SubscriptionPaymentModel } from '../models/index.js';
import { logger } from '../utils/logger.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = Router();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '';

const IS_MOCK_MODE = !RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.includes('mock') || !RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET.includes('mock');

let razorpayInstance: Razorpay | null = null;
if (!IS_MOCK_MODE) {
  razorpayInstance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

// Get all plans
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

router.use(authMiddleware);
router.use(roleGuard('agent', 'admin'));

// Get current status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await checkApplicationLimit(req.userId!);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create subscription order
router.post('/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const { planKey } = req.body;
    const plan = PLANS[planKey as keyof typeof PLANS];
    if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

    let orderId = `mock_sub_${Date.now()}`;
    let isMock = IS_MOCK_MODE;

    if (razorpayInstance && !IS_MOCK_MODE) {
      try {
        const order = await razorpayInstance.orders.create({
          amount: plan.price,
          currency: 'INR',
          receipt: `sub_${req.userId?.slice(0, 8)}_${Date.now()}`,
          notes: { agentId: req.userId!, planKey },
        });
        orderId = order.id;
      } catch (err: any) {
        logger.error('Razorpay sub order failed, fallback to mock', { error: err.message });
        isMock = true;
      }
    }

    // Save pending payment
    await SubscriptionPaymentModel.create({
      id: crypto.randomUUID(),
      agentId: req.userId,
      planKey,
      amount: plan.price,
      orderId,
      status: 'pending'
    });

    res.json({ orderId, amount: plan.price, currency: 'INR', keyId: RAZORPAY_KEY_ID, isMock });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify subscription payment
router.post('/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    
    let isValid = false;
    if (IS_MOCK_MODE) {
      isValid = true;
    } else {
      const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      isValid = expectedSignature === signature;
    }

    if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

    const paymentSnap = await SubscriptionPaymentModel.find({ orderId });
    if (paymentSnap.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const payment = paymentSnap[0];
    await SubscriptionPaymentModel.findOneAndUpdate({ id: payment.id }, { status: 'paid', paymentId });

    const { activateSubscription } = await import('../services/subscription.service.js');
    const newSub = await activateSubscription(req.userId!, payment.planKey as any, paymentId);

    // Invalidate analytics so subscription revenue updates
    const { invalidateAnalyticsCache } = await import('../services/analytics.service.js');
    invalidateAnalyticsCache();

    res.json({ success: true, subscription: newSub });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
