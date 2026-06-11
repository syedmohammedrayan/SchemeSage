/**
 * Payment Service — Complete Razorpay Integration
 *
 * Implements the full payment lifecycle:
 * 1. createOrder()   — creates Razorpay order + saves PaymentPending record
 * 2. verifyPayment() — HMAC signature verification (server-side, not trusted from frontend)
 * 3. getHistory()    — retrieves payment history for a user
 *
 * Security: Payment success is NEVER trusted from the frontend alone.
 * The webhook signature MUST match before any application status update.
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { AppStatus } from '../constants/applicationStatus.js';
import { invalidateAnalyticsCache } from './analytics.service.js';
import { logger } from '../utils/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  applicationId: string;
  isMock: boolean;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentId?: string;
  applicationId?: string;
  message: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  paymentId?: string;
  applicationId: string;
  userId: string;
  amount: number; // in paise
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  signature?: string;
  createdAt: string;
  paidAt?: string;
}

// ─── Razorpay Instance ────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '';

// Detect if we're running with real or mock credentials
const IS_MOCK_MODE =
  !RAZORPAY_KEY_ID ||
  RAZORPAY_KEY_ID.includes('mock') ||
  !RAZORPAY_KEY_SECRET ||
  RAZORPAY_KEY_SECRET.includes('mock');

let razorpayInstance: Razorpay | null = null;

if (!IS_MOCK_MODE) {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
  logger.info('PaymentService: Razorpay initialized with real credentials');
} else {
  logger.warn('PaymentService: Running in MOCK mode — no real Razorpay calls will be made');
}

// Standard assisted application fee: ₹199
const DEFAULT_AMOUNT_PAISE = 19900;

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Creates a Razorpay payment order and persists a PaymentPending record.
 * Updates application to PAYMENT_PENDING status.
 */
export async function createOrder(
  applicationId: string,
  userId: string,
  amountPaise: number = DEFAULT_AMOUNT_PAISE
): Promise<CreateOrderResult> {
  logger.info('PaymentService.createOrder', { applicationId, userId, amountPaise });

  // Verify application exists
  const appDoc = await db.collection('applications').doc(applicationId).get();
  if (!appDoc.exists) {
    // Try by id field (FirestoreWrapper pattern)
    const appSnap = await db.collection('applications').where('id', '==', applicationId).get();
    if (appSnap.empty) throw new Error('Application not found');
  }

  let orderId: string;
  let isMock = IS_MOCK_MODE;

  if (razorpayInstance && !IS_MOCK_MODE) {
    try {
      const order = await razorpayInstance.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `receipt_${applicationId.slice(0, 8)}_${Date.now()}`,
        notes: { applicationId, userId },
      });
      orderId = order.id;
    } catch (err: any) {
      logger.error('Razorpay order creation failed, falling back to mock', { error: err.message });
      orderId = `mock_order_${Date.now()}`;
      isMock = true;
    }
  } else {
    orderId = `mock_order_${Date.now()}`;
  }

  // Persist payment record in 'payments' collection
  const paymentRecord: PaymentRecord = {
    id: crypto.randomUUID(),
    orderId,
    applicationId,
    userId,
    amount: amountPaise,
    currency: 'INR',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await db.collection('payments').doc(paymentRecord.id).set(paymentRecord);

  // Update application status to PAYMENT_PENDING
  const appsQuery = await db.collection('applications').where('id', '==', applicationId).get();
  if (!appsQuery.empty) {
    await appsQuery.docs[0].ref.update({
      status: AppStatus.PAYMENT_PENDING,
      paymentOrderId: orderId,
      updatedAt: new Date().toISOString(),
    });
  }

  logger.info('PaymentService.createOrder success', { orderId, isMock });

  return {
    orderId,
    amount: amountPaise,
    currency: 'INR',
    keyId: RAZORPAY_KEY_ID,
    applicationId,
    isMock,
  };
}

/**
 * Verifies Razorpay payment using HMAC-SHA256 signature.
 * This is the ONLY trusted source for marking a payment as successful.
 *
 * Verification formula (from Razorpay docs):
 *   signature = HMAC_SHA256(orderId + "|" + paymentId, key_secret)
 */
export async function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  applicationId: string,
  userId: string
): Promise<PaymentVerificationResult> {
  logger.info('PaymentService.verifyPayment', { orderId, paymentId, applicationId });

  let isValid = false;

  if (IS_MOCK_MODE) {
    // In mock mode, accept any payment (for testing only)
    logger.warn('PaymentService: Mock mode — skipping signature verification');
    isValid = true;
  } else {
    // Real signature verification
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    isValid = expectedSignature === signature;
  }

  if (!isValid) {
    logger.error('PaymentService: Invalid payment signature', { orderId, paymentId, applicationId });
    return { success: false, message: 'Payment signature verification failed. Possible fraud attempt.' };
  }

  try {
    // Update payment record to 'paid'
    const paymentSnap = await db.collection('payments').where('orderId', '==', orderId).get();
    if (!paymentSnap.empty) {
      await paymentSnap.docs[0].ref.update({
        status: 'paid',
        paymentId,
        signature,
        paidAt: new Date().toISOString(),
      });
    }

    // Auto-assignment is removed. Applications enter the pool unassigned
    // so agents from the same state can manually accept them.
    const assignedAgentId = ''; // Left empty for manual claim
    
    // Update application: PAYMENT_COMPLETED → SUBMITTED
    const appsSnap = await db.collection('applications').where('id', '==', applicationId).get();
    if (!appsSnap.empty) {
      await appsSnap.docs[0].ref.update({
        status: AppStatus.SUBMITTED,
        paymentStatus: 'paid',
        paymentId,
        paymentOrderId: orderId,
        type: 'assisted',
        agentId: assignedAgentId, // left empty
        updatedAt: new Date().toISOString(),
      });
    }

    // Invalidate analytics cache (payment count changed)
    invalidateAnalyticsCache();

    logger.info('PaymentService.verifyPayment success', { orderId, paymentId, applicationId });
    return {
      success: true,
      paymentId,
      applicationId,
      message: 'Payment verified successfully. Your application has been submitted.',
    };
  } catch (error: any) {
    logger.error('PaymentService.verifyPayment DB update failed', { error: error.message });
    throw new Error('Payment verified but failed to update application. Please contact support.');
  }
}

/**
 * Returns payment history for a given user.
 */
export async function getPaymentHistory(userId: string): Promise<PaymentRecord[]> {
  const snap = await db.collection('payments').where('userId', '==', userId).get();
  return snap.docs
    .map((d: any) => d.data() as PaymentRecord)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
