package com.example.tms.service;

import com.example.tms.api.dto.notification.NotificationResponse;
import com.example.tms.api.mapper.NotificationMapper;
import com.example.tms.entity.Notification;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.NotificationRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    private Notification markRead(UUID userId, UUID notificationId) {
        if (userId == null) {
            throw new ApiException("User is required");
        }
        Notification n = notificationRepository.findById(notificationId).orElseThrow();
        if (n.getUser() == null || n.getUser().getId() == null || !n.getUser().getId().equals(userId)) {
            throw new ApiException("Not authorized to mark this notification");
        }
        n.setRead(true);
        return notificationRepository.save(n);
    }

    public NotificationResponse markReadResponse(UUID userId, UUID notificationId) {
        Notification saved = markRead(userId, notificationId);
        return NotificationMapper.toResponse(saved);
    }

    public Slice<NotificationResponse> getMyNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserId(userId, pageable)
                .map(NotificationMapper::toResponse);
    }
}
