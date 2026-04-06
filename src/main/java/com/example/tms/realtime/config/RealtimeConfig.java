package com.example.tms.realtime.config;

import com.example.tms.realtime.sse.SseConnectionRegistry;
import com.example.tms.realtime.sse.SseRealtimePublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeConfig {
    @Bean
    public SseConnectionRegistry sseConnectionRegistry() {
        return new SseConnectionRegistry();
    }

    @Bean
    public SseRealtimePublisher sseRealtimePublisher(SseConnectionRegistry registry, ObjectMapper objectMapper) {
        return new SseRealtimePublisher(registry, objectMapper);
    }
}

