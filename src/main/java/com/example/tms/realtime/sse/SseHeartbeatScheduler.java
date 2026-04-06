package com.example.tms.realtime.sse;

import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class SseHeartbeatScheduler {
    private static final Logger log = LoggerFactory.getLogger(SseHeartbeatScheduler.class);

    private final SseConnectionRegistry registry;
    private final SseRealtimePublisher publisher;

    public SseHeartbeatScheduler(SseConnectionRegistry registry, SseRealtimePublisher publisher) {
        this.registry = registry;
        this.publisher = publisher;
    }

    @Scheduled(fixedDelayString = "${app.realtime.sse.heartbeat-ms:30000}")
    public void heartbeat() {
        // Best-effort: if we can't reach a client, cleanup happens via exception.
        int active = registry.getActiveConnections();
        if (active == 0) {
            return;
        }
        for (UUID userId : registry.getConnectedUserIds()) {
            sendHeartbeatToUser(userId);
        }
        log.debug("SSE heartbeat tick activeConnections={}", active);
    }

    public void sendHeartbeatToUser(UUID userId) {
        List<SseEmitter> emitters = registry.getUserEmitters(userId);
        if (emitters.isEmpty()) {
            return;
        }
        ClientEvent hb = ClientEvent.of(ClientEventType.HEARTBEAT, "heartbeat", null, java.util.Map.of());
        for (SseEmitter emitter : emitters) {
            try {
                boolean ok = publisher.trySend(emitter, hb);
                if (!ok) {
                    emitter.complete();
                }
            } catch (RuntimeException ex) {
                // cleanup handled by controller callbacks on error/timeout; best-effort here
            }
        }
    }
}

