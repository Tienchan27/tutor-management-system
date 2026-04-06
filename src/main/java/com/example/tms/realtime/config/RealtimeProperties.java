package com.example.tms.realtime.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.realtime")
public record RealtimeProperties(
        boolean enabled,
        Sse sse,
        Kafka kafka,
        Outbox outbox
) {
    public record Sse(
            long heartbeatMs,
            long emitterTimeoutMs,
            int maxConnectionsPerUser,
            int connectLimitPerMinute
    ) {
    }

    public record Kafka(
            Topic topic
    ) {
    }

    public record Topic(
            String events,
            String eventsDlq
    ) {
    }

    public record Outbox(
            int maxAttempts,
            Publisher publisher
    ) {
    }

    public record Publisher(
            long delayMs
    ) {
    }
}

