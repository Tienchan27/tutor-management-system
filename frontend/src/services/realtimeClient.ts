import { fetchEventSource } from '@microsoft/fetch-event-source';
import axios from 'axios';
import { clearAuthSession, getAccessToken, getRefreshToken, saveAuthSession } from '../utils/storage';
import api from './api';
import { ClientEvent, realtimeEventBus } from './realtimeEventBus';

export type RealtimeConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

let controller: AbortController | null = null;
let running = false;
let state: RealtimeConnectionState = 'idle';

export function getRealtimeState(): RealtimeConnectionState {
  return state;
}

function setState(next: RealtimeConnectionState): void {
  state = next;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
    const payload = response.data as any;
    if (!payload?.accessToken || !payload?.refreshToken) {
      return null;
    }
    saveAuthSession({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      needsProfileCompletion: !!payload.needsProfileCompletion,
      needsTutorOnboarding: !!payload.needsTutorOnboarding,
      roles: payload.roles || [],
      activeRole: payload.activeRole,
    });
    return payload.accessToken as string;
  } catch {
    return null;
  }
}

function jitter(ms: number): number {
  const spread = Math.round(ms * 0.2);
  return ms + Math.floor(Math.random() * (spread * 2 + 1)) - spread;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseClientEvent(data: string): ClientEvent | null {
  try {
    const parsed = JSON.parse(data) as ClientEvent;
    if (!parsed?.eventId || !parsed?.type) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function startRealtime(): Promise<void> {
  if (running) {
    return;
  }
  if (String(process.env.REACT_APP_REALTIME_ENABLED || 'true').toLowerCase() === 'false') {
    return;
  }
  running = true;
  setState('connecting');

  let attempt = 0;
  while (running) {
    const token = getAccessToken();
    if (!token) {
      setState('closed');
      running = false;
      return;
    }

    controller = new AbortController();
    const baseURL = api.defaults.baseURL || '/api';
    const url = `${baseURL}/events/stream`;

    try {
      await fetchEventSource(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        openWhenHidden: true,
        onopen: async (response) => {
          if (response.status === 401) {
            const newToken = await refreshAccessToken();
            if (!newToken) {
              clearAuthSession();
              throw new Error('Unauthorized');
            }
            throw new Error('RetryWithNewToken');
          }
          if (response.status === 404 || response.status === 501) {
            // Backend realtime disabled or not deployed; stop reconnect loop.
            running = false;
            setState('closed');
            return;
          }
          if (response.ok) {
            attempt = 0;
            setState('connected');
            return;
          }
          throw new Error(`Unexpected SSE response: ${response.status}`);
        },
        onmessage: (msg) => {
          if (msg.event === 'HEARTBEAT') {
            return;
          }
          const event = parseClientEvent(msg.data);
          if (!event) {
            return;
          }
          realtimeEventBus.emit(event);
        },
        onclose: () => {
          throw new Error('SSE closed');
        },
        onerror: (err) => {
          throw err;
        },
      });
    } catch (err: any) {
      if (!running) {
        setState('closed');
        return;
      }
      // Abort is normal when user logs out or page unmounts.
      if (controller?.signal.aborted) {
        setState('closed');
        return;
      }

      attempt += 1;
      setState('reconnecting');
      const baseDelay = Math.min(30_000, 500 * 2 ** Math.min(attempt, 6));
      await sleep(jitter(baseDelay));
      continue;
    }
  }
}

export function stopRealtime(): void {
  running = false;
  setState('closed');
  if (controller) {
    controller.abort();
    controller = null;
  }
}

