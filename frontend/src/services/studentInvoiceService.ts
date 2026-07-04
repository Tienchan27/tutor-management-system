import api from './api';
import { StudentInvoice } from '../types/invoices';
import { PaymentQrResponse } from '../types/payments';

export async function listMyInvoices(): Promise<StudentInvoice[]> {
  const response = await api.get<StudentInvoice[]>('/student/invoices');
  return response.data;
}

export async function getInvoiceQr(invoiceId: string): Promise<PaymentQrResponse> {
  const response = await api.get<PaymentQrResponse>(`/student/invoices/${invoiceId}/qr`);
  return response.data;
}

