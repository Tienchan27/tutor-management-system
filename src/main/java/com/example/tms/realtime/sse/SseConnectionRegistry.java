package com.example.tms.realtime.sse;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory registry of SSE connections.
 *
 * Note: in multi-instance deployments, connections are local to each instance.
 */
public class SseConnectionRegistry {
    private final Map<UUID, CopyOnWriteArrayList<SseEmitter>> emittersByUserId = new ConcurrentHashMap<>();

    public void add(UUID userId, SseEmitter emitter, int maxConnectionsPerUser) {
        CopyOnWriteArrayList<SseEmitter> list = emittersByUserId.computeIfAbsent(userId, ignored -> new CopyOnWriteArrayList<>());
        if (maxConnectionsPerUser > 0 && list.size() >= maxConnectionsPerUser) {
            // Evict the oldest connection to keep memory bounded.
            try {
                SseEmitter oldest = list.get(0);
                oldest.complete();
            } catch (Exception ignored) {
            }
            if (!list.isEmpty()) {
                list.remove(0);
            }
        }
        list.add(emitter);
    }

    public void remove(UUID userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emittersByUserId.get(userId);
        if (list == null) {
            return;
        }
        list.remove(emitter);
        if (list.isEmpty()) {
            emittersByUserId.remove(userId);
        }
    }

    public List<SseEmitter> getUserEmitters(UUID userId) {
        CopyOnWriteArrayList<SseEmitter> list = emittersByUserId.get(userId);
        if (list == null || list.isEmpty()) {
            return List.of();
        }
        return new ArrayList<>(list);
    }

    public int getActiveConnections() {
        int total = 0;
        for (CopyOnWriteArrayList<SseEmitter> list : emittersByUserId.values()) {
            total += list.size();
        }
        return total;
    }

    public List<UUID> getConnectedUserIds() {
        return List.copyOf(emittersByUserId.keySet());
    }
}

