/**
 * Centralized Application Status Enum — Single Source of Truth
 * ALL routes, services, repositories, dashboards, and analytics must use these constants.
 * No raw string literals for status values are permitted anywhere in the codebase.
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

/** Statuses that indicate an active, unresolved application */
export const ACTIVE_STATUSES: AppStatusType[] = [
  AppStatus.SUBMITTED,
  AppStatus.IN_REVIEW,
  AppStatus.DOCUMENT_PENDING,
  AppStatus.PAYMENT_PENDING,
  AppStatus.PAYMENT_COMPLETED,
];

/** Statuses that indicate a terminal (resolved) application */
export const TERMINAL_STATUSES: AppStatusType[] = [
  AppStatus.APPROVED,
  AppStatus.REJECTED,
];

/** Statuses visible to an agent in their work pool */
export const AGENT_POOL_STATUSES: AppStatusType[] = [
  AppStatus.SUBMITTED,
  AppStatus.IN_REVIEW,
];

/** Valid status transitions — prevents illegal state jumps */
export const VALID_TRANSITIONS: Record<AppStatusType, AppStatusType[]> = {
  [AppStatus.DRAFT]: [AppStatus.SAVED, AppStatus.STARTED],
  [AppStatus.SAVED]: [AppStatus.STARTED, AppStatus.SUBMITTED],
  [AppStatus.STARTED]: [AppStatus.SUBMITTED, AppStatus.DOCUMENT_PENDING],
  [AppStatus.SUBMITTED]: [AppStatus.IN_REVIEW, AppStatus.PAYMENT_PENDING, AppStatus.APPROVED, AppStatus.REJECTED],
  [AppStatus.IN_REVIEW]: [AppStatus.APPROVED, AppStatus.REJECTED, AppStatus.DOCUMENT_PENDING],
  [AppStatus.DOCUMENT_PENDING]: [AppStatus.SUBMITTED, AppStatus.IN_REVIEW],
  [AppStatus.PAYMENT_PENDING]: [AppStatus.PAYMENT_COMPLETED, AppStatus.REJECTED],
  [AppStatus.PAYMENT_COMPLETED]: [AppStatus.SUBMITTED, AppStatus.IN_REVIEW],
  [AppStatus.APPROVED]: [],
  [AppStatus.REJECTED]: [],
};

/** Check whether a status transition is valid */
export function isValidTransition(from: AppStatusType, to: AppStatusType): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** All valid status values as an array — used for Zod enum validation */
export const ALL_STATUSES = Object.values(AppStatus) as [AppStatusType, ...AppStatusType[]];
