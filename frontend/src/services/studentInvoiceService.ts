import api from './api';
import { StudentInvoice } from '../types/invoices';

export async function listMyInvoices(): Promise<StudentInvoice[]> {
  const response = await api.get<StudentInvoice[]>('/student/invoices');
  return response.data;
}
