package com.example.tms.realtime.core;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Minimal, transport-agnostic event delivered to browser clients.
 *
 * Payload should be treated as a signal; clients refetch authoritative REST data.
 */
public record ClientEvent(
        UUID eventId,
        ClientEventType type,
        Instant occurredAt,
        String scope,
        String contextRef,
        Map<String, Object> data
) {
    public static ClientEvent of(ClientEventType type, String scope, String contextRef, Map<String, Object> data) {
        return new ClientEvent(UUID.randomUUID(), type, Instant.now(), scope, contextRef, data);
    }
}

