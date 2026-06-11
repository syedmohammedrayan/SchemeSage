import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createOrder, verifyPayment, getPaymentHistory } from '../services/payment.service.js';
import { validate, CreateOrderSchema, VerifyPaymentSchema } from '../validators/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/payment/create-order
 * Creates a Razorpay payment order for assisted application.
 * Requires authentication — citizen must be logged in.
 */
router.post('/create-order', authMiddleware, validate(CreateOrderSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, amount } = req.body;
    const result = await createOrder(applicationId, req.userId!, amount);
    res.json(result);
  } catch (error: any) {
    logger.error('[PaymentRoute] create-order failed', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
});

/**
 * POST /api/payment/verify
 * Server-side verification of Razorpay payment using HMAC signature.
 * Payment status is NEVER trusted from the frontend alone.
 */
router.post('/verify', authMiddleware, validate(VerifyPaymentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const result = await verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      applicationId,
      req.userId!
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('[PaymentRoute] verify failed', { error: error.message });
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

/**
 * GET /api/payment/history
 * Returns payment history for the authenticated user.
 */
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const history = await getPaymentHistory(req.userId!);
    res.json({ payments: history });
  } catch (error: any) {
    logger.error('[PaymentRoute] history failed', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export default router;
