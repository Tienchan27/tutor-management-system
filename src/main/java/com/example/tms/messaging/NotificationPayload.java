package com.example.tms.messaging;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Serialized form of a notification stored in the outbox payload column and
 * drained in-process by {@link NotificationOutboxDispatcher}.
 */
public record NotificationPayload(
        UUID eventId,
        String eventType,
        UUID recipientUserId,
        String entityRef,
        String title,
        String content,
        String correlationId,
        LocalDateTime occurredAt
) {
}
