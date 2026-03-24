import { AxiosError } from 'axios';
import { AppRole } from '../types/app';
import { getAdminTutorSummary, getTutorDashboard } from './dashboardService';

function currentYearMonth(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function isDenied(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 401 || status === 403 || status === 404;
}

export async function resolveRolesByApi(): Promise<AppRole[]> {
  const roles: AppRole[] = [];
  const month = currentYearMonth();

  try {
    await getAdminTutorSummary(month);
    roles.push('ADMIN');
  } catch (error: unknown) {
    if (!isDenied(error)) {
      // Ignore unexpected errors and continue fallback role probing.
    }
  }

  try {
    await getTutorDashboard();
    roles.push('TUTOR');
  } catch (error: unknown) {
    if (!isDenied(error)) {
      // Ignore unexpected errors and continue fallback role probing.
    }
  }

  if (!roles.length) {
    roles.push('STUDENT');
  }

  return roles;
}
