export type InvoiceStatus = 'UNPAID' | 'PAID' | 'OVERDUE';

export interface StudentInvoice {
  id: string;
  studentId: string;
  studentName: string;
  year: number;
  month: number;
  totalHours: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
}

export interface InvoiceGenerationResult {
  month: string;
  createdCount: number;
  skippedCount: number;
  invoices: StudentInvoice[];
}
