import { AppRole } from '../types/app';

export function getRoleHomePath(role: AppRole): string {
  if (role === 'ADMIN') {
    return '/app/admin/dashboard';
  }
  if (role === 'TUTOR') {
    return '/app/tutor/home';
  }
  return '/app/student/home';
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
