import { AxiosError } from 'axios';
import api from './api';
import { clearAuthSession, saveAuthSession } from '../utils/storage';
import { GoogleAuthResponse } from '../types/auth';

export async function googleLogin(idToken: string): Promise<GoogleAuthResponse> {
  // Always start OAuth from a clean local session to avoid stale token/user state
  // after rebuilds or manual DB cleanup.
  clearAuthSession();
  try {
    const response = await api.post<GoogleAuthResponse>('/auth/google', { idToken });
    if (response.data.authStatus === 'AUTHENTICATED') {
      saveAuthSession(response.data);
    }
    return { ...response.data, authStatus: response.data.authStatus || 'AUTHENTICATED' };
  } catch (error: unknown) {
    const status = (error as AxiosError)?.response?.status;
    if (status !== 401) {
      throw error;
    }

    // Recover from stale client session immediately after rebuild/deploy.
    clearAuthSession();
    const retryResponse = await api.post<GoogleAuthResponse>('/auth/google', { idToken });
    if (retryResponse.data.authStatus === 'AUTHENTICATED') {
      saveAuthSession(retryResponse.data);
    }
    return { ...retryResponse.data, authStatus: retryResponse.data.authStatus || 'AUTHENTICATED' };
  }
}
