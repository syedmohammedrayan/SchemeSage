import { z } from 'zod';
import { ALL_STATUSES } from '../constants/applicationStatus.js';

// ─── Application Validators ───────────────────────────────────────────────────

export const CreateApplicationSchema = z.object({
  schemeId: z.string().min(1, 'schemeId is required'),
  schemeName: z.string().min(1, 'schemeName is required'),
  formData: z.record(z.unknown()).optional().default({}),
  type: z.enum(['free', 'assisted']).optional().default('free'),
});

export const SubmitApplicationSchema = z.object({
  id: z.string().min(1, 'Application ID is required'),
  documents: z.array(z.unknown()).optional().default([]),
  type: z.enum(['free', 'assisted']).optional(),
  paymentStatus: z.string().optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(ALL_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${ALL_STATUSES.join(', ')}` }),
  }),
  notes: z.string().optional(),
});

// ─── Scheme Validators ────────────────────────────────────────────────────────

export const CreateSchemeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  ministry: z.string().min(2, 'Ministry is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  benefits: z.string().min(10, 'Benefits are required'),
  eligibility: z.record(z.unknown()).optional().default({}),
  documents: z.array(z.string()).optional().default([]),
  deadline: z.string().optional(),
  applyLink: z.string().url('Apply link must be a valid URL').optional().or(z.literal('#')),
  tags: z.array(z.string()).optional().default([]),
});

export const UpdateSchemeSchema = CreateSchemeSchema.partial();

// ─── Auth Validators ──────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  loginRole: z.enum(['admin', 'government']).optional(),
});

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  state: z.string().optional(),
  district: z.string().optional(),
  role: z.enum(['admin', 'agent']).optional().default('admin'),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
  meeSevaId: z.string().optional(),
  address: z.string().optional(),
  expertise: z.string().optional(),
});

// ─── Payment Validators ───────────────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  applicationId: z.string().min(1, 'applicationId is required'),
  amount: z.number().int().positive().optional(), // in paise; defaults to ₹299
});

export const VerifyPaymentSchema = z.object({
  applicationId: z.string().min(1),
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
});

// ─── Broadcast Validators ─────────────────────────────────────────────────────

export const BroadcastSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  type: z.enum(['system', 'new_scheme', 'update']).optional().default('system'),
});

// ─── Validation Middleware Factory ────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.body = result.data; // use parsed+coerced data
    next();
  };
}
