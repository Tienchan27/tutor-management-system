const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_USER_KEY = 'authUser';

export function saveAuthSession(payload) {
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

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getAccessToken();
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function markProfileCompleted() {
  const user = getAuthUser();
  if (!user) return;
  user.needsProfileCompletion = false;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
