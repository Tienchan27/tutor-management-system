import axios from 'axios';
import { saveAuthSession } from '../utils/storage';
import { AuthTokensResponse } from '../types/auth';

const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';

export type RefreshSessionResult = 'ok' | 'no_refresh_token' | 'failed';

/**
 * Calls POST /auth/refresh using the httpOnly refreshToken cookie.
 * Does not import the shared axios `api` instance to avoid circular dependency with its interceptor.
 */
export async function refreshSessionFromStorage(): Promise<RefreshSessionResult> {
  try {
    const response = await axios.post<AuthTokensResponse>(
      `${apiBaseUrl}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const payload = response.data;
    if (!payload?.userId) {
      return 'failed';
    }
    saveAuthSession({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
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
