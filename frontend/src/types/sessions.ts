export interface TutorSessionClassOptionResponse {
  id: string;
  className: string;
  subjectName: string;
  pricePerHour: number;
  defaultSalaryRate: number;
  students: { id: string; name: string }[];
}

/** Matches GET /sessions list items (SessionListItemResponse). */
export interface SessionListItem {
  id: string;
  classId: string;
  date: string;
  durationHours: number;
  tuitionAtLog: number;
  salaryRateAtLog: number;
  payrollMonth: string;
  note: string | null;
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
