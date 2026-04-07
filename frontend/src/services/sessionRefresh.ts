import axios from 'axios';
import { getRefreshToken, saveAuthSession } from '../utils/storage';
import { AuthTokensResponse } from '../types/auth';

const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';

export type RefreshSessionResult = 'ok' | 'no_refresh_token' | 'failed';

/**
 * Calls POST /auth/refresh using refresh token from storage.
 * Does not import the shared axios `api` instance to avoid circular dependency with its interceptor.
 */
export async function refreshSessionFromStorage(): Promise<RefreshSessionResult> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return 'no_refresh_token';
  }
  try {
    const response = await axios.post<AuthTokensResponse>(`${apiBaseUrl}/auth/refresh`, { refreshToken });
    const payload = response.data;
    if (!payload?.accessToken || !payload?.refreshToken) {
      return 'failed';
    }
    saveAuthSession({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      needsProfileCompletion: !!payload.needsProfileCompletion,
      needsTutorOnboarding: !!payload.needsTutorOnboarding,
      roles: payload.roles,
      activeRole: payload.activeRole,
    });
    return 'ok';
  } catch {
    return 'failed';
  }
}
