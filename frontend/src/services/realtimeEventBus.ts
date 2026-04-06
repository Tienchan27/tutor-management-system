export type ClientEventType =
  | 'HEARTBEAT'
  | 'ROLE_CHANGED'
  | 'MARKETPLACE_UPDATED'
  | 'NOTIFICATION_CREATED'
  | 'PAYOUT_UPDATED'
  | 'SESSION_FINANCIAL_UPDATED'
  | 'DASHBOARD_INVALIDATE'
  | 'PAYMENT_STATUS_CHANGED';

export interface ClientEvent {
  eventId: string;
  type: ClientEventType;
  occurredAt: string;
  scope: string;
  contextRef?: string | null;
  data?: Record<string, unknown> | null;
}

type Handler = (event: ClientEvent) => void;

class RealtimeEventBus {
  private readonly handlersByType = new Map<ClientEventType, Set<Handler>>();
  private readonly recentEventIds = new Map<string, number>();

  emit(event: ClientEvent): void {
    if (!event?.eventId || !event.type) {
      return;
    }

    // Best-effort dedupe window (at-least-once delivery).
    const now = Date.now();
    const seenAt = this.recentEventIds.get(event.eventId);
    if (seenAt && now - seenAt < 60_000) {
      return;
    }
    this.recentEventIds.set(event.eventId, now);
    this.gcRecent(now);

    const handlers = this.handlersByType.get(event.type);
    if (!handlers?.size) {
      return;
    }
    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch {
        // Ignore handler failures to keep bus resilient.
      }
    });
  }

  subscribe(type: ClientEventType, handler: Handler): () => void {
    const set = this.handlersByType.get(type) || new Set<Handler>();
    set.add(handler);
    this.handlersByType.set(type, set);
    return () => {
      const existing = this.handlersByType.get(type);
      if (!existing) {
        return;
      }
      existing.delete(handler);
      if (!existing.size) {
        this.handlersByType.delete(type);
      }
    };
  }

  private gcRecent(now: number): void {
    // Keep memory bounded.
    this.recentEventIds.forEach((ts, id) => {
      if (now - ts > 5 * 60_000) {
        this.recentEventIds.delete(id);
      }
    });
  }
}

export const realtimeEventBus = new RealtimeEventBus();

