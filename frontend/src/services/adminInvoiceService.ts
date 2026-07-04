import api from './api';
import { InvoiceGenerationResult, StudentInvoice } from '../types/invoices';

export async function listAdminInvoices(month: string): Promise<StudentInvoice[]> {
  const response = await api.get<StudentInvoice[]>('/admin/invoices', { params: { month } });
  return response.data;
}

export async function closeStudentTuition(month: string, recalculate = false): Promise<InvoiceGenerationResult> {
  const response = await api.post<InvoiceGenerationResult>(
    '/admin/invoices/close-month',
    { recalculate },
    { params: { month } }
  );
  return response.data;
}

export async function confirmInvoicePaid(invoiceId: string): Promise<StudentInvoice> {
  const response = await api.post<StudentInvoice>(`/admin/invoices/${invoiceId}/confirm-paid`);
  return response.data;
}
