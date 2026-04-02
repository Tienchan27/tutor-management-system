export interface TutorSummaryResponse {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  grossRevenue: number;
  netSalary: number;
  classesReceivingThisMonth: number;
  payoutStatus: string;
}

export interface TutorDashboardResponse {
  year: number;
  month: number;
  grossRevenue: number;
  netSalary: number;
  status: string;
}

export interface TutorClassOverviewResponse {
  classId: string;
  classDisplayName: string;
  subjectName: string;
  classStatus: string;
  pricePerHour: number;
  defaultSalaryRate: number;
  sessionCount: number;
  latestSessionDate: string | null;
}

export interface TutorClassRosterStudentResponse {
  studentId: string;
  studentName: string;
  tuitionAtLog: number;
}

export interface TutorClassRosterResponse {
  classId: string;
  students: TutorClassRosterStudentResponse[];
}

export interface AdminTutorPayoutSnapshotResponse {
  payoutId: string;
  year: number;
  month: number;
  grossRevenue: number;
  netSalary: number;
  status: string;
}

export interface AdminTutorBankAccountResponse {
  id: string;
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  primary: boolean;
  verified: boolean;
  verifiedAt: string | null;
}

export interface AdminTutorDetailResponse {
  tutorId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  facebookUrl: string | null;
  address: string | null;
  payout: AdminTutorPayoutSnapshotResponse | null;
  bankAccounts: AdminTutorBankAccountResponse[];
  managedClasses: TutorClassOverviewResponse[];
}

export interface InviteTutorRequest {
  email: string;
}

export interface InviteTutorResponse {
  email: string;
  status: string;
  existingUser: boolean;
  tutorRoleAssigned: boolean;
  message: string;
}
