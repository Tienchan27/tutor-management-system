package com.example.tms.realtime.observability;

import com.example.tms.realtime.sse.SseConnectionRegistry;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeMetrics {
    public RealtimeMetrics(MeterRegistry meterRegistry, SseConnectionRegistry registry) {
        Gauge.builder("tms_realtime_sse_active_connections", registry, SseConnectionRegistry::getActiveConnections)
                .description("Number of active SSE connections")
                .register(meterRegistry);
    }
}

