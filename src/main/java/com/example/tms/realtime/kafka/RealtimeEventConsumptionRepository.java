package com.example.tms.realtime.kafka;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RealtimeEventConsumptionRepository extends JpaRepository<RealtimeEventConsumption, UUID> {
    boolean existsByEventIdAndConsumerName(UUID eventId, String consumerName);
}

