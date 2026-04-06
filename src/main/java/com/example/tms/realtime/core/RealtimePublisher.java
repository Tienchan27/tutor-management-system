package com.example.tms.realtime.core;

import java.util.UUID;

/**
 * Transport abstraction for pushing events to connected clients.
 * SSE is the first implementation; WebSocket can be added later.
 */
public interface RealtimePublisher {
    void publishToUser(UUID userId, ClientEvent event);

    void publishToScope(String scope, ClientEvent event);
}

