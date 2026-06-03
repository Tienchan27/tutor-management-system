import { AppRole } from '../types/app';

export function getRoleHomePath(role: AppRole): string {
  if (role === 'ADMIN') {
    return '/app/admin/tutors';
  }
  if (role === 'TUTOR') {
    return '/app/tutor/dashboard';
  }
  return '/app/student/classes';
}

export function roleLabel(role: AppRole): string {
  if (role === 'ADMIN') {
    return 'Admin';
  }
  if (role === 'TUTOR') {
    return 'Tutor';
  }
  return 'Student';
}

export const ROLE_ORDER: AppRole[] = ['ADMIN', 'TUTOR', 'STUDENT'];
