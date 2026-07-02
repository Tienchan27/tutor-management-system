package com.example.tms.service;

import com.example.tms.api.dto.notification.NotificationResponse;
import com.example.tms.api.mapper.NotificationMapper;
import com.example.tms.entity.Notification;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.NotificationRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    private Notification requireOwned(UUID userId, UUID notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> ApiException.notFound("NOTIFICATION_NOT_FOUND", "Notification not found"));
        if (n.getUser() == null || n.getUser().getId() == null || !n.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("FORBIDDEN", "Not authorized to access this notification");
        }
        return n;
    }

    @Transactional
    public NotificationResponse markReadResponse(UUID userId, UUID notificationId) {
        Notification n = requireOwned(userId, notificationId);
        n.setRead(true);
        return NotificationMapper.toResponse(notificationRepository.save(n));
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return notificationRepository.markAllReadForUser(userId);
    }

    @Transactional
    public void delete(UUID userId, UUID notificationId) {
        Notification n = requireOwned(userId, notificationId);
        notificationRepository.delete(n);
    }

    public Slice<NotificationResponse> getMyNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserId(userId, pageable)
                .map(NotificationMapper::toResponse);
    }
}
