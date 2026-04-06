package com.example.tms.realtime.outbox;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface RealtimeOutboxRepository extends JpaRepository<RealtimeOutboxEvent, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select e from RealtimeOutboxEvent e
            where e.status = :status
              and (e.nextAttemptAt is null or e.nextAttemptAt <= :now)
            order by e.createdAt asc
            """)
    List<RealtimeOutboxEvent> findNextBatchForPublishing(
            @Param("status") String status,
            @Param("now") LocalDateTime now
    );
}

