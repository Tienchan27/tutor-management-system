import { EntityUserRef } from './common';

export interface TutorPayout {
  id: string;
  tutor: EntityUserRef;
  year: number;
  month: number;
  grossRevenue: number;
  netSalary: number;
  status: 'OPEN' | 'LOCKED' | 'PAID' | string;
  paidAt: string | null;
  paidBy: EntityUserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface TutorPayoutPayment {
  id: string;
  tutorPayout: TutorPayout;
  qrRef: string;
  qrPayload: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  paidAt: string | null;
  createdAt: string;
}
