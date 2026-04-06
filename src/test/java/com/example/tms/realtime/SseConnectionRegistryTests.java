package com.example.tms.realtime;

import com.example.tms.realtime.sse.SseConnectionRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class SseConnectionRegistryTests {

    @Test
    void addShouldEvictOldestWhenMaxExceeded() {
        SseConnectionRegistry registry = new SseConnectionRegistry();
        UUID userId = UUID.randomUUID();

        registry.add(userId, new SseEmitter(), 1);
        registry.add(userId, new SseEmitter(), 1);

        assertEquals(1, registry.getUserEmitters(userId).size());
        assertEquals(1, registry.getActiveConnections());
    }
}

