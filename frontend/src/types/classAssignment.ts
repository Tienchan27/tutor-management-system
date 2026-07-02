export interface SubjectOptionResponse {
  id: string;
  name: string;
  defaultPricePerHour: number;
}

export interface PublishClassRequest {
  students: PublishClassStudentInput[];
  subjectId: string;
  pricePerHour?: number | null;
  displayName?: string | null;
  note?: string | null;
}

export interface PublishClassStudentInput {
  email: string;
  name?: string | null;
}

export interface StudentLookupResponse {
  exists: boolean;
  email: string;
  name: string;
}

export interface TutorClassApplicationResponse {
  applicationId: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  status: string;
  appliedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface ClassStudentResponse {
  studentId: string;
  name: string;
}

export interface PublishedClassResponse {
  classId: string;
  displayName: string;
  subjectName: string;
  pricePerHour: number;
  status: string;
  note: string | null;
  students: ClassStudentResponse[];
  applications: TutorClassApplicationResponse[];
}

export interface AvailableClassResponse {
  classId: string;
  displayName: string;
  subjectName: string;
  pricePerHour: number;
  note: string | null;
  studentNames: string[];
  hasApplied: boolean;
}

export interface UpdateClassRequest {
  displayName?: string | null;
  pricePerHour?: number | null;
  note?: string | null;
}

export interface ApplyClassResponse {
  applicationId: string;
  classId: string;
  status: string;
  appliedAt: string;
}
