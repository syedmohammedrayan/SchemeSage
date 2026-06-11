/**
 * Frontend mirror of server/constants/applicationStatus.ts
 * Keep these two files in sync at all times.
 */
export const AppStatus = {
  DRAFT: 'draft',
  SAVED: 'saved',
  STARTED: 'started',
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  DOCUMENT_PENDING: 'document_pending',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_COMPLETED: 'payment_completed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type AppStatusType = typeof AppStatus[keyof typeof AppStatus];

export const ACTIVE_STATUSES: AppStatusType[] = [
  AppStatus.SUBMITTED,
  AppStatus.IN_REVIEW,
  AppStatus.DOCUMENT_PENDING,
  AppStatus.PAYMENT_PENDING,
  AppStatus.PAYMENT_COMPLETED,
];

export const TERMINAL_STATUSES: AppStatusType[] = [
  AppStatus.APPROVED,
  AppStatus.REJECTED,
];

export const STATUS_LABELS: Record<AppStatusType, string> = {
  draft: 'Draft',
  saved: 'Saved',
  started: 'In Progress',
  submitted: 'Submitted',
  in_review: 'Under Review',
  document_pending: 'Documents Pending',
  payment_pending: 'Payment Pending',
  payment_completed: 'Payment Completed',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<AppStatusType, string> = {
  draft: 'bg-slate-500/10 text-slate-500',
  saved: 'bg-blue-500/10 text-blue-600',
  started: 'bg-yellow-500/10 text-yellow-600',
  submitted: 'bg-info/10 text-info',
  in_review: 'bg-orange-500/10 text-orange-500',
  document_pending: 'bg-orange-500/10 text-orange-600',
  payment_pending: 'bg-amber-500/10 text-amber-600',
  payment_completed: 'bg-emerald-500/10 text-emerald-600',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};
