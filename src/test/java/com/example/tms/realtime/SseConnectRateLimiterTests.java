package com.example.tms.realtime;

import com.example.tms.realtime.security.SseConnectRateLimiter;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SseConnectRateLimiterTests {
    @Test
    void shouldEnforceLimitPerMinute() {
        SseConnectRateLimiter limiter = new SseConnectRateLimiter();
        UUID userId = UUID.randomUUID();

        assertTrue(limiter.allow(userId, "127.0.0.1", 2));
        assertTrue(limiter.allow(userId, "127.0.0.1", 2));
        assertFalse(limiter.allow(userId, "127.0.0.1", 2));
    }
}

