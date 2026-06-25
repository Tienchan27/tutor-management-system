package com.example.tms.service;

import com.example.tms.entity.NotificationOutboxEvent;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.exception.ApiException;
import com.example.tms.messaging.NotificationPayload;
import com.example.tms.repository.NotificationOutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class NotificationOutboxService {
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_FAILED = "FAILED";

    private final NotificationOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final CorrelationIdAccessor correlationIdAccessor;

    public NotificationOutboxService(
            NotificationOutboxRepository outboxRepository,
            ObjectMapper objectMapper,
            CorrelationIdAccessor correlationIdAccessor
    ) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.correlationIdAccessor = correlationIdAccessor;
    }

    @Transactional
    public UUID enqueue(User recipient, NotificationType type, String title, String content, String entityRef) {
        if (recipient == null || recipient.getId() == null) {
            throw new ApiException("Notification recipient is required");
        }
        if (type == null) {
            throw new ApiException("Notification type is required");
        }
        if (title == null || title.isBlank()) {
            throw new ApiException("Notification title is required");
        }
        if (content == null || content.isBlank()) {
            throw new ApiException("Notification content is required");
        }

        UUID eventId = UUID.randomUUID();
        String correlationId = correlationIdAccessor.getOrCreateCorrelationId();
        LocalDateTime now = LocalDateTime.now();

        NotificationPayload payload = new NotificationPayload(
                eventId,
                type.name(),
                recipient.getId(),
                entityRef,
                title.trim(),
                content.trim(),
                correlationId,
                now
        );

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new ApiException("Failed to serialize notification payload");
        }

        NotificationOutboxEvent event = new NotificationOutboxEvent();
        event.setId(eventId);
        event.setEventType(type.name());
        event.setRecipient(recipient);
        event.setEntityRef(entityRef);
        event.setPayloadJson(payloadJson);
        event.setCorrelationId(correlationId);
        event.setStatus(STATUS_PENDING);
        event.setAttempts(0);
        event.setNextAttemptAt(now);
        event.setCreatedAt(now);

        outboxRepository.save(event);
        return eventId;
    }
}

