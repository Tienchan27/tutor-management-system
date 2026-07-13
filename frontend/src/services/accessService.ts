import { AppRole } from '../types/app';
import { AuthTokensResponse } from '../types/auth';
import { getAuthUser, saveAuthSession } from '../utils/storage';
import api from './api';

const ROLE_CACHE_PREFIX = 'appRoleCache:';
const ROLE_CACHE_TTL_MS = 10_000;

interface RoleCachePayload {
  roles: AppRole[];
  activeRole: AppRole;
  cachedAt: number;
}

function isValidRoleArray(value: unknown): value is AppRole[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => item === 'ADMIN' || item === 'TUTOR' || item === 'STUDENT');
}

function isValidRole(value: unknown): value is AppRole {
  return value === 'ADMIN' || value === 'TUTOR' || value === 'STUDENT';
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
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const payload = parsed as RoleCachePayload;
    if (
      isValidRoleArray(payload.roles) &&
      isValidRole(payload.activeRole) &&
      typeof payload.cachedAt === 'number' &&
      Date.now() - payload.cachedAt < ROLE_CACHE_TTL_MS
    ) {
      return payload.roles;
    }
    return null;
  } catch {
    return null;
  }
}

function writeRoleCache(roles: AppRole[], activeRole: AppRole): void {
  const cacheKey = getRoleCacheKey();
  if (!cacheKey) {
    return;
  }
  const payload: RoleCachePayload = { roles, activeRole, cachedAt: Date.now() };
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

  const response = await api.get<AuthTokensResponse>('/users/me/access');
  const access = response.data;
  const roles: AppRole[] = access.roles?.length ? access.roles : ['STUDENT'];
  const activeRole = access.activeRole && roles.includes(access.activeRole)
    ? access.activeRole
    : roles[0];
  const existing = getAuthUser();

  saveAuthSession({
    userId: access.userId,
    email: access.email,
    name: access.name || access.email?.split('@')[0] || 'User',
    picture: existing?.picture ?? null,
    needsProfileCompletion: !!access.needsProfileCompletion,
    needsTutorOnboarding: !!access.needsTutorOnboarding,
    roles,
    activeRole,
  });
  writeRoleCache(roles, activeRole);
  return roles;
}
