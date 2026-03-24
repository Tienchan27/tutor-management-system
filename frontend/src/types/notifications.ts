import { EntityUserRef } from './common';

export interface NotificationResponse {
  id: string;
  user: EntityUserRef;
  type: 'SESSION_FINANCIAL_EDIT' | 'PAYOUT_GENERATED' | 'PAYOUT_PAID' | string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}
