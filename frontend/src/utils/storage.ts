import { AuthSessionPayload, AuthUser } from '../types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_USER_KEY = 'authUser';

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
    typeof candidate.needsProfileCompletion === 'boolean'
  );
}

export function saveAuthSession(payload: AuthSessionPayload): void {
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
    return isAuthUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function clearAuthSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
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
