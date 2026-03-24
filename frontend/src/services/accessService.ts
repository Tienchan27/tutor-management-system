import { AxiosError } from 'axios';
import { AppRole } from '../types/app';
import { getAdminTutorSummary, getTutorDashboard } from './dashboardService';
import { getAuthUser } from '../utils/storage';

const ROLE_CACHE_PREFIX = 'appRoleCache:';

interface RoleCachePayload {
  roles: AppRole[];
}

function currentYearMonth(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function isDenied(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 401 || status === 403 || status === 404;
}

function isValidRoleArray(value: unknown): value is AppRole[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => item === 'ADMIN' || item === 'TUTOR' || item === 'STUDENT');
}

function getRoleCacheKey(): string | null {
  const user = getAuthUser();
  if (!user?.userId) {
    return null;
  }
  return `${ROLE_CACHE_PREFIX}${user.userId}`;
}

function readRoleCache(): AppRole[] | null {
  const cacheKey = getRoleCacheKey();
  if (!cacheKey) {
    return null;
  }
  const raw = sessionStorage.getItem(cacheKey);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      isValidRoleArray((parsed as RoleCachePayload).roles)
    ) {
      return (parsed as RoleCachePayload).roles;
    }
    return null;
  } catch {
    return null;
  }
}

function writeRoleCache(roles: AppRole[]): void {
  const cacheKey = getRoleCacheKey();
  if (!cacheKey) {
    return;
  }
  const payload: RoleCachePayload = { roles };
  sessionStorage.setItem(cacheKey, JSON.stringify(payload));
}

export function clearRoleCache(): void {
  const cacheKey = getRoleCacheKey();
  if (cacheKey) {
    sessionStorage.removeItem(cacheKey);
    return;
  }
  const keysToDelete: string[] = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(ROLE_CACHE_PREFIX)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => sessionStorage.removeItem(key));
}

export async function resolveRolesByApi(): Promise<AppRole[]> {
  const cachedRoles = readRoleCache();
  if (cachedRoles?.length) {
    return cachedRoles;
  }
  const month = currentYearMonth();

  try {
    await getAdminTutorSummary(month);
    const roles: AppRole[] = ['ADMIN'];
    writeRoleCache(roles);
    return roles;
  } catch (error: unknown) {
    if (!isDenied(error)) {
      // Ignore unexpected errors and continue fallback role probing.
    }
  }

  try {
    await getTutorDashboard();
    const roles: AppRole[] = ['TUTOR'];
    writeRoleCache(roles);
    return roles;
  } catch (error: unknown) {
    if (!isDenied(error)) {
      // Ignore unexpected errors and continue fallback role probing.
    }
  }

  const roles: AppRole[] = ['STUDENT'];
  writeRoleCache(roles);
  return roles;
}
