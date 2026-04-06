package com.example.tms.realtime.outbox;

import com.example.tms.exception.ApiException;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.service.CorrelationIdAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class RealtimeOutboxService {
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_FAILED = "FAILED";

    private final RealtimeOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final CorrelationIdAccessor correlationIdAccessor;

    public RealtimeOutboxService(
            RealtimeOutboxRepository outboxRepository,
            ObjectMapper objectMapper,
            CorrelationIdAccessor correlationIdAccessor
    ) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.correlationIdAccessor = correlationIdAccessor;
    }

    @Transactional
    public UUID enqueue(String scope, String contextRef, ClientEvent event) {
        if (scope == null || scope.isBlank()) {
            throw new ApiException("Realtime scope is required");
        }
        if (event == null || event.eventId() == null || event.type() == null) {
            throw new ApiException("Realtime event is required");
        }
        String correlationId = correlationIdAccessor.getOrCreateCorrelationId();
        LocalDateTime now = LocalDateTime.now();

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new ApiException("Failed to serialize realtime payload");
        }

        RealtimeOutboxEvent outboxEvent = new RealtimeOutboxEvent();
        outboxEvent.setId(event.eventId());
        outboxEvent.setEventType(event.type().name());
        outboxEvent.setScope(scope.trim());
        outboxEvent.setContextRef(contextRef);
        outboxEvent.setPayloadJson(payloadJson);
        outboxEvent.setCorrelationId(correlationId);
        outboxEvent.setStatus(STATUS_PENDING);
        outboxEvent.setAttempts(0);
        outboxEvent.setNextAttemptAt(now);
        outboxEvent.setCreatedAt(now);

        outboxRepository.save(outboxEvent);
        return outboxEvent.getId();
    }
}

