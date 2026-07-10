import { PublishedClassResponse, SubjectOptionResponse } from '../../../../types/classAssignment';

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

export interface ClassEditSnapshot {
  displayName: string;
  pricePerHour: string;
  note: string;
}

export function isClassFormDirty(
  form: ClassFormState,
  modalMode: 'new' | 'edit' | null,
  editSnapshot: ClassEditSnapshot | null,
  baselineForm: ClassFormState,
  suggestedDisplayName: string
): boolean {
  if (!modalMode) {
    return false;
  }
  if (modalMode === 'edit' && editSnapshot) {
    return (
      form.displayName !== editSnapshot.displayName ||
      form.pricePerHour !== editSnapshot.pricePerHour ||
      form.note !== editSnapshot.note
    );
  }
  if (modalMode === 'new') {
    const displayNameDirty =
      form.isDisplayNameManuallyEdited ||
      (!!form.displayName.trim() && form.displayName.trim() !== suggestedDisplayName.trim());
    return (
      form.students.length > 0 ||
      form.studentEmail.trim() !== '' ||
      form.note.trim() !== '' ||
      displayNameDirty ||
      form.isPriceManuallyEdited ||
      form.subjectId !== baselineForm.subjectId
    );
  }
  return false;
}

export function assignedTutor(cls: PublishedClassResponse): string | null {
  return cls.applications.find((a) => a.status === 'APPROVED')?.tutorName ?? null;
}

export function emptyForm(subjects: SubjectOptionResponse[]): ClassFormState {
  const firstSubject = subjects[0];
  return {
    students: [],
    studentEmail: '',
    studentAdding: false,
    subjectId: firstSubject?.id ?? '',
    pricePerHour: firstSubject ? String(firstSubject.defaultPricePerHour) : '',
    isPriceManuallyEdited: false,
    displayName: '',
    isDisplayNameManuallyEdited: false,
    note: '',
  };
}
