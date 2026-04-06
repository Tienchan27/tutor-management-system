package com.example.tms.realtime.core;

import com.example.tms.entity.enums.RoleName;
import com.example.tms.realtime.security.RealtimeAuthorizationService;
import com.example.tms.realtime.sse.SseConnectionRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Routes an event scope string to a concrete list of recipient userIds.
 *
 * Scope conventions (phase 1):
 * - user:{uuid}
 * - role:{ROLE_NAME}
 */
@Service
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeAudienceRouter {
    private final SseConnectionRegistry registry;
    private final RealtimeAuthorizationService authz;

    public RealtimeAudienceRouter(SseConnectionRegistry registry, RealtimeAuthorizationService authz) {
        this.registry = registry;
        this.authz = authz;
    }

    public List<UUID> resolveRecipients(String scope) {
        if (scope == null || scope.isBlank()) {
            return List.of();
        }
        String trimmed = scope.trim();
        if (trimmed.startsWith("user:")) {
            String id = trimmed.substring("user:".length()).trim();
            try {
                return List.of(UUID.fromString(id));
            } catch (Exception ignored) {
                return List.of();
            }
        }
        if (trimmed.startsWith("role:")) {
            String roleName = trimmed.substring("role:".length()).trim();
            RoleName role;
            try {
                role = RoleName.valueOf(roleName);
            } catch (Exception ignored) {
                return List.of();
            }
            List<UUID> recipients = new ArrayList<>();
            for (UUID userId : registry.getConnectedUserIds()) {
                if (authz.hasActiveRole(userId, role)) {
                    recipients.add(userId);
                }
            }
            return recipients;
        }
        return List.of();
    }
}

