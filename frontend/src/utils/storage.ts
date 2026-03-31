import { AuthSessionPayload, AuthUser } from '../types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_USER_KEY = 'authUser';

function clearSessionKeys(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.name === 'string' &&
    (typeof candidate.picture === 'string' || candidate.picture === null) &&
    typeof candidate.needsProfileCompletion === 'boolean' &&
    typeof candidate.needsTutorOnboarding === 'boolean' &&
    Array.isArray(candidate.roles) &&
    candidate.roles.every((role) => role === 'ADMIN' || role === 'TUTOR' || role === 'STUDENT') &&
    (candidate.activeRole === 'ADMIN' || candidate.activeRole === 'TUTOR' || candidate.activeRole === 'STUDENT')
  );
}

export function saveAuthSession(payload: AuthSessionPayload): void {
  const roles = payload.roles?.length ? payload.roles : ['STUDENT'];
  const desiredActiveRole = (payload.activeRole || roles[0] || 'STUDENT') as AuthUser['activeRole'];
  const activeRole = roles.includes(desiredActiveRole) ? desiredActiveRole : ((roles[0] || 'STUDENT') as AuthUser['activeRole']);

  localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken || '');
  localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken || '');
  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      picture: payload.picture || null,
      needsProfileCompletion: !!payload.needsProfileCompletion,
      needsTutorOnboarding: !!payload.needsTutorOnboarding,
      roles,
      activeRole,
    })
  );
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isAuthUser(parsed)) {
      return parsed;
    }
    // Clear stale schema from previous builds to avoid half-authenticated state.
    clearSessionKeys();
    return null;
  } catch {
    clearSessionKeys();
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken() && !!getAuthUser();
}

export function clearAuthSession(): void {
  clearSessionKeys();
}

export function markProfileCompleted(): void {
  const user = getAuthUser();
  if (!user) return;
  user.needsProfileCompletion = false;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function setNeedsProfileCompletion(needsProfileCompletion: boolean): void {
  const user = getAuthUser();
  if (!user) return;
  user.needsProfileCompletion = !!needsProfileCompletion;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function setNeedsTutorOnboarding(needsTutorOnboarding: boolean): void {
  const user = getAuthUser();
  if (!user) return;
  user.needsTutorOnboarding = !!needsTutorOnboarding;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function setAuthUserName(name: string): void {
  const user = getAuthUser();
  if (!user) return;
  const normalizedName = name?.trim();
  if (!normalizedName) return;
  user.name = normalizedName;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function setAuthUserActiveRole(activeRole: AuthUser['activeRole']): void {
  const user = getAuthUser();
  if (!user) return;
  user.activeRole = activeRole;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
