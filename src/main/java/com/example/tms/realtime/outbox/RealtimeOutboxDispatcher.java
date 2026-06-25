package com.example.tms.realtime.outbox;

import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.RealtimeAudienceRouter;
import com.example.tms.realtime.core.RealtimePublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Drains the realtime outbox in-process and pushes events straight to connected SSE clients
 * (no message broker). Replaces the former Kafka publisher + consumer. Single-instance only —
 * the SSE registry is in-memory.
 */
@Component
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeOutboxDispatcher {
    private static final Logger log = LoggerFactory.getLogger(RealtimeOutboxDispatcher.class);
    private static final int BATCH_LIMIT = 50;

    private final RealtimeOutboxRepository outboxRepository;
    private final RealtimeAudienceRouter router;
    private final RealtimePublisher publisher;
    private final ObjectMapper objectMapper;
    private final int maxAttempts;

    public RealtimeOutboxDispatcher(
            RealtimeOutboxRepository outboxRepository,
            RealtimeAudienceRouter router,
            RealtimePublisher publisher,
            ObjectMapper objectMapper,
            @Value("${app.realtime.outbox.max-attempts:5}") int maxAttempts
    ) {
        this.outboxRepository = outboxRepository;
        this.router = router;
        this.publisher = publisher;
        this.objectMapper = objectMapper;
        this.maxAttempts = maxAttempts;
    }

    @Scheduled(fixedDelayString = "${app.realtime.outbox.publisher.delay-ms:1000}")
    @Transactional
    public void dispatchPending() {
        List<RealtimeOutboxEvent> batch = outboxRepository.findNextBatchForPublishing(
                RealtimeOutboxService.STATUS_PENDING,
                LocalDateTime.now()
        );
        if (batch.isEmpty()) {
            return;
        }
        int limit = Math.min(batch.size(), BATCH_LIMIT);
        for (int i = 0; i < limit; i++) {
            dispatchOne(batch.get(i));
        }
    }

    private void dispatchOne(RealtimeOutboxEvent event) {
        String correlationId = event.getCorrelationId();
        if (correlationId != null && !correlationId.isBlank()) {
            MDC.put("correlationId", correlationId);
        }
        try {
            ClientEvent clientEvent = objectMapper.readValue(event.getPayloadJson(), ClientEvent.class);
            for (UUID recipient : router.resolveRecipients(event.getScope())) {
                publisher.publishToUser(recipient, clientEvent);
            }
            event.setStatus(RealtimeOutboxService.STATUS_PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            event.setNextAttemptAt(null);
        } catch (Exception ex) {
            int attempts = event.getAttempts() + 1;
            event.setAttempts(attempts);
            event.setLastError(truncate(ex.getMessage(), 500));
            if (attempts >= maxAttempts) {
                event.setStatus(RealtimeOutboxService.STATUS_FAILED);
                event.setNextAttemptAt(null);
                log.warn("Realtime outbox event {} failed after {} attempts", event.getId(), attempts);
            } else {
                Duration delay = Duration.ofSeconds(Math.min(60, attempts * 5L));
                event.setNextAttemptAt(LocalDateTime.now().plus(delay));
            }
        } finally {
            MDC.remove("correlationId");
            outboxRepository.save(event);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        String trimmed = s.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
