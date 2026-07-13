import type { QueryClient } from '@tanstack/react-query';
import type { ClientEventType } from '../services/realtimeEventBus';

export const queryKeys = {
  adminInvoices: {
    all: ['adminInvoices'] as const,
    month: (month: string) => ['adminInvoices', month] as const,
  },
  adminPayouts: {
    all: ['adminPayouts'] as const,
    month: (month: string) => ['adminPayouts', month] as const,
  },
  adminDashboard: {
    all: ['adminDashboard'] as const,
    month: (month: string) => ['adminDashboard', month] as const,
  },
  tutorHome: {
    all: ['tutorHome'] as const,
    month: (month: string) => ['tutorHome', month] as const,
  },
  tutorSessions: {
    all: ['tutorSessions'] as const,
    month: (month: string) => ['tutorSessions', month] as const,
  },
  tutorSessionClasses: ['tutorSessionClasses'] as const,
  tutorMyClasses: ['tutorMyClasses'] as const,
  tutorPayouts: ['tutorPayouts'] as const,
  studentInvoices: ['studentInvoices'] as const,
  studentHome: ['studentHome'] as const,
  notifications: {
    all: ['notifications'] as const,
  },
  unreadNotifications: ['unreadNotifications'] as const,
  availableClasses: ['availableClasses'] as const,
  publishedClasses: ['publishedClasses'] as const,
  subjects: ['subjects'] as const,
  bankCatalog: ['bankCatalog'] as const,
  centerAccount: ['centerAccount'] as const,
  tutorBankAccounts: ['tutorBankAccounts'] as const,
} as const;

type QueryKeyPrefix = readonly unknown[];

const REALTIME_INVALIDATION_MAP: Partial<Record<ClientEventType, readonly QueryKeyPrefix[]>> = {
  PAYMENT_STATUS_CHANGED: [
    queryKeys.adminInvoices.all,
    queryKeys.studentInvoices,
    queryKeys.studentHome,
  ],
  SESSION_FINANCIAL_UPDATED: [
    queryKeys.tutorSessions.all,
    queryKeys.tutorHome.all,
    queryKeys.tutorSessionClasses,
  ],
  PAYOUT_UPDATED: [queryKeys.adminPayouts.all, queryKeys.tutorPayouts],
  DASHBOARD_INVALIDATE: [
    queryKeys.tutorHome.all,
    queryKeys.adminDashboard.all,
    queryKeys.studentHome,
    queryKeys.tutorMyClasses,
  ],
  MARKETPLACE_UPDATED: [queryKeys.availableClasses, queryKeys.publishedClasses],
  NOTIFICATION_CREATED: [queryKeys.notifications.all, queryKeys.unreadNotifications],
  NOTIFICATIONS_CHANGED: [queryKeys.notifications.all, queryKeys.unreadNotifications],
};

export function invalidateQueryPrefixes(queryClient: QueryClient, prefixes: readonly QueryKeyPrefix[]): void {
  for (const queryKey of prefixes) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

export function invalidateForRealtimeEvent(queryClient: QueryClient, type: ClientEventType): void {
  const prefixes = REALTIME_INVALIDATION_MAP[type];
  if (!prefixes?.length) {
    return;
  }
  invalidateQueryPrefixes(queryClient, prefixes);
}

export const REALTIME_DATA_EVENTS = [
  'PAYMENT_STATUS_CHANGED',
  'SESSION_FINANCIAL_UPDATED',
  'PAYOUT_UPDATED',
  'DASHBOARD_INVALIDATE',
  'MARKETPLACE_UPDATED',
  'NOTIFICATION_CREATED',
  'NOTIFICATIONS_CHANGED',
] as const satisfies readonly ClientEventType[];
