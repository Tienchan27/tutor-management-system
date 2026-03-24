export interface TutorSummaryResponse {
  tutorId: string;
  tutorEmail: string;
  grossRevenue: number;
  netSalary: number;
  payoutStatus: string;
}

export interface TutorDashboardResponse {
  year: number;
  month: number;
  grossRevenue: number;
  netSalary: number;
  status: string;
}
