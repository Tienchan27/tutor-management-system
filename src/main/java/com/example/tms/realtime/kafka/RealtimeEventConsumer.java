package com.example.tms.realtime.kafka;

import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.RealtimeAudienceRouter;
import com.example.tms.realtime.core.RealtimePublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeEventConsumer {
    private static final String CONSUMER_NAME = "SSE";

    private final ObjectMapper objectMapper;
    private final RealtimeEventConsumptionRepository consumptionRepository;
    private final RealtimeAudienceRouter router;
    private final RealtimePublisher publisher;

    public RealtimeEventConsumer(
            ObjectMapper objectMapper,
            RealtimeEventConsumptionRepository consumptionRepository,
            RealtimeAudienceRouter router,
            RealtimePublisher publisher
    ) {
        this.objectMapper = objectMapper;
        this.consumptionRepository = consumptionRepository;
        this.router = router;
        this.publisher = publisher;
    }

    @KafkaListener(
            topics = "${app.realtime.kafka.topic.events}",
            groupId = "tms-realtime-sse",
            containerFactory = "realtimeKafkaListenerContainerFactory"
    )
    public void consume(String messageJson) throws Exception {
        ClientEvent event = objectMapper.readValue(messageJson, ClientEvent.class);
        withCorrelationId(event);
        try {
            if (event.eventId() == null) {
                throw new IllegalArgumentException("eventId is required");
            }
            if (alreadyProcessed(event.eventId())) {
                return;
            }

            for (UUID recipient : router.resolveRecipients(event.scope())) {
                publisher.publishToUser(recipient, event);
            }

            markProcessed(event.eventId());
        } finally {
            MDC.remove("correlationId");
        }
    }

    private boolean alreadyProcessed(UUID eventId) {
        return consumptionRepository.existsByEventIdAndConsumerName(eventId, CONSUMER_NAME);
    }

    private void markProcessed(UUID eventId) {
        RealtimeEventConsumption c = new RealtimeEventConsumption();
        c.setId(UUID.randomUUID());
        c.setEventId(eventId);
        c.setConsumerName(CONSUMER_NAME);
        c.setProcessedAt(LocalDateTime.now());
        try {
            consumptionRepository.save(c);
        } catch (DataIntegrityViolationException ignored) {
        }
    }

    private static void withCorrelationId(ClientEvent event) {
        // Correlation id can be propagated later; keep minimal for now.
        // Using eventId as a stable trace key.
        if (event == null || event.eventId() == null) {
            return;
        }
        MDC.put("correlationId", event.eventId().toString());
    }
}

