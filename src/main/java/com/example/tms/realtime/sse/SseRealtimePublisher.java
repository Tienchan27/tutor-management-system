package com.example.tms.realtime.sse;

import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.RealtimePublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public class SseRealtimePublisher implements RealtimePublisher {
    private static final Logger log = LoggerFactory.getLogger(SseRealtimePublisher.class);

    private final SseConnectionRegistry registry;
    private final ObjectMapper objectMapper;

    public SseRealtimePublisher(SseConnectionRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publishToUser(UUID userId, ClientEvent event) {
        List<SseEmitter> emitters = registry.getUserEmitters(userId);
        if (emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            boolean ok = trySend(emitter, event);
            if (!ok) {
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                }
            }
        }
    }

    @Override
    public void publishToScope(String scope, ClientEvent event) {
        // Scope-based routing is handled upstream (Kafka consumer/router).
        // This method exists to keep the transport interface stable for future WebSocket additions.
        log.debug("publishToScope called for scope={} eventType={}", scope, event.type());
    }

    public boolean trySend(SseEmitter emitter, ClientEvent event) {
        try {
            String json = objectMapper.writeValueAsString(event);
            emitter.send(
                    SseEmitter.event()
                            .name(event.type().name())
                            .data(json, MediaType.APPLICATION_JSON)
            );
            return true;
        } catch (IOException ex) {
            log.debug("SSE send failed (IO): {}", ex.getMessage());
            return false;
        } catch (Exception ex) {
            log.debug("SSE send failed: {}", ex.getMessage());
            return false;
        }
    }
}

