package com.example.tms.repository;

import com.example.tms.entity.Notification;
import com.example.tms.entity.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Slice<Notification> findByUserId(UUID userId, Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    int markAllReadForUser(@Param("userId") UUID userId);

    Optional<Notification> findTopByUserIdAndTypeAndTitleAndContentAndCreatedAtAfterOrderByCreatedAtDesc(
            UUID userId,
            NotificationType type,
            String title,
            String content,
            LocalDateTime createdAtAfter
    );
}
