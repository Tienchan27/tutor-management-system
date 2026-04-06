package com.example.tms.realtime.security;

import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Best-effort, in-memory limiter for SSE connect attempts.
 *
 * For multi-instance deployments, replace with Redis-based limiter.
 */
@Component
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class SseConnectRateLimiter {
    private static final long WINDOW_MILLIS = 60_000L;

    private static final class Counter {
        long windowStartMs;
        int count;
    }

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    public boolean allow(UUID userId, String ip, int limitPerMinute) {
        if (limitPerMinute <= 0) {
            return true;
        }
        String key = (userId == null ? "anonymous" : userId.toString()) + "|" + (ip == null ? "" : ip);
        long now = Instant.now().toEpochMilli();

        Counter counter = counters.computeIfAbsent(key, ignored -> {
            Counter c = new Counter();
            c.windowStartMs = now;
            c.count = 0;
            return c;
        });

        synchronized (counter) {
            if (now - counter.windowStartMs >= WINDOW_MILLIS) {
                counter.windowStartMs = now;
                counter.count = 0;
            }
            counter.count += 1;
            return counter.count <= limitPerMinute;
        }
    }
}

