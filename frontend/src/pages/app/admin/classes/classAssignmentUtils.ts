import { PublishedClassResponse } from '../../../../types/classAssignment';

export interface StudentEntry {
  email: string;
  name: string;
  isNew?: boolean;
}

export interface ClassFormState {
  students: StudentEntry[];
  studentEmail: string;
  studentAdding: boolean;
  subjectId: string;
  pricePerHour: string;
  isPriceManuallyEdited: boolean;
  displayName: string;
  isDisplayNameManuallyEdited: boolean;
  note: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isLikelyEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function defaultNameFromEmail(email: string): string {
  const local = normalizeEmail(email).split('@')[0] || 'student';
  return local ? `${local[0].toUpperCase()}${local.slice(1)}` : 'Student';
}

export function buildSuggestedClassName(subjectName: string, studentNames: string[]): string {
  if (!subjectName) return '';
  if (!studentNames.length) return `[${subjectName}] Class`;
  return `[${subjectName}] ${studentNames.join(' - ')}`;
}

export function classStatusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'AVAILABLE') return 'warning';
  return 'neutral';
}

export function classStatusLabel(status: string): string {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'AVAILABLE') return 'Awaiting tutor';
  return status;
}

export function assignedTutor(cls: PublishedClassResponse): string | null {
  return cls.applications.find((a) => a.status === 'APPROVED')?.tutorName ?? null;
}
