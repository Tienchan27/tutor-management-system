export interface SessionSubject {
  id: string;
  name: string;
  defaultPricePerHour?: number;
}

export interface SessionClassRef {
  id: string;
  subject?: SessionSubject;
}

export interface SessionResponse {
  id: string;
  tutorClass?: SessionClassRef;
  date: string;
  durationHours: number;
  tuitionAtLog: number;
  salaryRateAtLog: number;
  payrollMonth: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  classId: string;
  date: string;
  durationHours: number;
  tuitionAtLog: number;
  salaryRateAtLog: number;
  payrollMonth?: string;
  note?: string;
}

export interface UpdateSessionFinancialRequest {
  tuitionAtLog?: number | null;
  salaryRateAtLog?: number | null;
  payrollMonth?: string | null;
  note?: string | null;
  reason: string;
}
