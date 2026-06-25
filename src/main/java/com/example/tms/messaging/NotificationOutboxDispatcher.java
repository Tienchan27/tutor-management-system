package com.example.tms.messaging;

import com.example.tms.entity.Notification;
import com.example.tms.entity.NotificationOutboxEvent;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.NotificationOutboxRepository;
import com.example.tms.repository.NotificationRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.service.MailService;
import com.example.tms.service.NotificationOutboxService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Drains the notification outbox in-process (no message broker): persists the in-app
 * notification, pushes a realtime "notification created" event, and sends email for the
 * relevant types. Replaces the former Kafka publisher + two @KafkaListener consumers.
 */
@Component
public class NotificationOutboxDispatcher {
    private static final Logger log = LoggerFactory.getLogger(NotificationOutboxDispatcher.class);
    private static final Duration DEDUPE_WINDOW = Duration.ofMinutes(5);
    private static final int BATCH_LIMIT = 50;
    private static final Set<NotificationType> EMAIL_TYPES = Set.of(
            NotificationType.PAYOUT_PAID,
            NotificationType.CLASS_APPLICATION_APPROVED,
            NotificationType.CLASS_APPLICATION_REJECTED,
            NotificationType.TUTOR_ROLE_REVOKED
    );

    private final NotificationOutboxRepository outboxRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final RealtimeOutboxService realtimeOutboxService;
    private final ObjectMapper objectMapper;
    private final int maxAttempts;

    public NotificationOutboxDispatcher(
            NotificationOutboxRepository outboxRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            MailService mailService,
            RealtimeOutboxService realtimeOutboxService,
            ObjectMapper objectMapper,
            @Value("${app.notifications.outbox.max-attempts:5}") int maxAttempts
    ) {
        this.outboxRepository = outboxRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.mailService = mailService;
        this.realtimeOutboxService = realtimeOutboxService;
        this.objectMapper = objectMapper;
        this.maxAttempts = maxAttempts;
    }

    @Scheduled(fixedDelayString = "${app.notifications.outbox.delay-ms:1000}")
    @Transactional
    public void dispatchPending() {
        List<NotificationOutboxEvent> batch = outboxRepository.findNextBatchForPublishing(
                NotificationOutboxService.STATUS_PENDING,
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

    private void dispatchOne(NotificationOutboxEvent event) {
        String correlationId = event.getCorrelationId();
        if (correlationId != null && !correlationId.isBlank()) {
            MDC.put("correlationId", correlationId);
        }
        try {
            NotificationPayload payload = objectMapper.readValue(event.getPayloadJson(), NotificationPayload.class);
            User recipient = userRepository.findById(payload.recipientUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));
            NotificationType type = NotificationType.valueOf(payload.eventType());
            String title = payload.title().trim();
            String content = payload.content().trim();

            // In-app notification, with a best-effort 5-minute dedupe against noisy repeats.
            LocalDateTime after = LocalDateTime.now().minus(DEDUPE_WINDOW);
            boolean recentlyExists = notificationRepository
                    .findTopByUserIdAndTypeAndTitleAndContentAndCreatedAtAfterOrderByCreatedAtDesc(
                            recipient.getId(), type, title, content, after)
                    .isPresent();
            if (!recentlyExists) {
                Notification notification = new Notification();
                notification.setUser(recipient);
                notification.setType(type);
                notification.setTitle(title);
                notification.setContent(content);
                notification.setRead(false);
                notificationRepository.save(notification);

                ClientEvent realtimeEvent = ClientEvent.of(
                        ClientEventType.NOTIFICATION_CREATED,
                        "user:" + recipient.getId(),
                        payload.entityRef(),
                        Map.of("notificationType", type.name())
                );
                realtimeOutboxService.enqueue("user:" + recipient.getId(), payload.entityRef(), realtimeEvent);
            }

            // Email is best-effort: a transient mail failure must not roll back the in-app row
            // or re-process the event (which would double-post in-app).
            if (EMAIL_TYPES.contains(type)) {
                try {
                    mailService.sendNotificationEmail(recipient.getEmail(), title, content);
                } catch (Exception mailEx) {
                    log.warn("Notification email failed for event {}: {}", event.getId(), mailEx.getMessage());
                }
            }

            event.setStatus(NotificationOutboxService.STATUS_PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            event.setNextAttemptAt(null);
        } catch (Exception ex) {
            int attempts = event.getAttempts() + 1;
            event.setAttempts(attempts);
            event.setLastError(truncate(ex.getMessage(), 500));
            if (attempts >= maxAttempts) {
                event.setStatus(NotificationOutboxService.STATUS_FAILED);
                event.setNextAttemptAt(null);
                log.warn("Notification outbox event {} failed after {} attempts", event.getId(), attempts);
            } else {
                Duration delay = Duration.ofSeconds(Math.min(60, attempts * 5L));
                event.setNextAttemptAt(LocalDateTime.now().plus(delay));
                log.debug("Notification outbox event {} dispatch failed attempt {}", event.getId(), attempts);
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
