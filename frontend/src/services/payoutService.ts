import api from './api';
import { TutorPayout, TutorPayoutPayment } from '../types/payouts';

export async function generateMonthlyPayouts(month: string): Promise<TutorPayout[]> {
  const response = await api.post<TutorPayout[]>('/payouts/generate', null, {
    params: { month },
  });
  return response.data;
}

export async function generatePayoutQr(payoutId: string): Promise<TutorPayoutPayment> {
  const response = await api.post<TutorPayoutPayment>(`/payouts/${payoutId}/qr`);
  return response.data;
}

export async function confirmPayoutPaid(payoutId: string): Promise<TutorPayout> {
  const response = await api.post<TutorPayout>(`/payouts/${payoutId}/confirm-paid`);
  return response.data;
}

export async function overrideNetSalary(payoutId: string, netSalaryVnd: number): Promise<TutorPayout> {
  const response = await api.patch<TutorPayout>(`/payouts/${payoutId}/override-net-salary`, { netSalary: netSalaryVnd });
  return response.data;
}
