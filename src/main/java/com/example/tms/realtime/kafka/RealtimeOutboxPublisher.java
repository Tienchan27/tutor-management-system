package com.example.tms.realtime.kafka;

import com.example.tms.realtime.config.RealtimeProperties;
import com.example.tms.realtime.outbox.RealtimeOutboxEvent;
import com.example.tms.realtime.outbox.RealtimeOutboxRepository;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Component
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeOutboxPublisher {
    private static final Logger log = LoggerFactory.getLogger(RealtimeOutboxPublisher.class);

    private final RealtimeOutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final RealtimeProperties props;

    public RealtimeOutboxPublisher(
            RealtimeOutboxRepository outboxRepository,
            KafkaTemplate<String, String> kafkaTemplate,
            RealtimeProperties props
    ) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.props = props;
    }

    @Scheduled(fixedDelayString = "${app.realtime.outbox.publisher.delay-ms:1000}")
    @Transactional
    public void publishPending() {
        List<RealtimeOutboxEvent> batch = outboxRepository.findNextBatchForPublishing(
                RealtimeOutboxService.STATUS_PENDING,
                LocalDateTime.now()
        );
        if (batch.isEmpty()) {
            return;
        }
        int limit = Math.min(batch.size(), 50);
        for (int i = 0; i < limit; i++) {
            publishOne(batch.get(i));
        }
    }

    private void publishOne(RealtimeOutboxEvent event) {
        String correlationId = event.getCorrelationId();
        if (correlationId != null && !correlationId.isBlank()) {
            MDC.put("correlationId", correlationId);
        }
        try {
            String topic = props.kafka().topic().events();
            String key = event.getScope();
            kafkaTemplate.send(topic, key, event.getPayloadJson()).get();

            event.setStatus(RealtimeOutboxService.STATUS_PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            event.setNextAttemptAt(null);
        } catch (Exception ex) {
            int attempts = event.getAttempts() + 1;
            event.setAttempts(attempts);
            event.setLastError(truncate(ex.getMessage(), 500));

            if (attempts >= props.outbox().maxAttempts()) {
                event.setStatus(RealtimeOutboxService.STATUS_FAILED);
                event.setNextAttemptAt(null);
                log.warn("Realtime outbox event {} failed after {} attempts", event.getId(), attempts);
                return;
            }

            Duration delay = Duration.ofSeconds(Math.min(60, attempts * 5L));
            event.setNextAttemptAt(LocalDateTime.now().plus(delay));
            log.debug("Realtime outbox event {} publish failed attempt {}", event.getId(), attempts);
        } finally {
            MDC.remove("correlationId");
            outboxRepository.save(event);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        String trimmed = s.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}

