package com.example.tms.realtime.security;

import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeAuthorizationService {
    private final UserRoleRepository userRoleRepository;

    public RealtimeAuthorizationService(UserRoleRepository userRoleRepository) {
        this.userRoleRepository = userRoleRepository;
    }

    public boolean hasActiveRole(UUID userId, RoleName roleName) {
        return userRoleRepository.hasRole(userId, roleName, UserRoleStatus.ACTIVE);
    }
}

