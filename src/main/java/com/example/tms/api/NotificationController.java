package com.example.tms.api;

import com.example.tms.entity.Notification;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final CurrentUserResolver currentUserResolver;

    public NotificationController(NotificationService notificationService, CurrentUserResolver currentUserResolver) {
        this.notificationService = notificationService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/me")
    public List<Notification> myNotifications() {
        return notificationService.getMyNotifications(currentUserResolver.requireUserId());
    }

    @PostMapping("/{id}/read")
    public Notification markRead(@PathVariable UUID id) {
        return notificationService.markRead(id);
    }
}
