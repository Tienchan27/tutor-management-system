export interface SessionSubject {
  id: string;
  name: string;
  defaultPricePerHour?: number;
}

export interface SessionClassRef {
  id: string;
  subject?: SessionSubject;
}

export interface TutorSessionClassOptionResponse {
  id: string;
  className: string;
  subjectName: string;
  pricePerHour: number;
  defaultSalaryRate: number;
  students: { id: string; name: string }[];
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
  salaryRateAtLog: number;
  studentTuitions: { studentId: string; tuitionAtLog: number }[];
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
