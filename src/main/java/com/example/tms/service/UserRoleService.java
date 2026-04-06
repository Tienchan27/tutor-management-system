package com.example.tms.service;

import com.example.tms.entity.Role;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.RoleRepository;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class UserRoleService {
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final RealtimeOutboxService realtimeOutboxService;

    public UserRoleService(
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            RealtimeOutboxService realtimeOutboxService
    ) {
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.realtimeOutboxService = realtimeOutboxService;
    }

    @Transactional
    public void ensureActiveRole(User user, RoleName roleName, User updatedBy) {
        UserRole existing = userRoleRepository.findByUserIdAndRole(user.getId(), roleName).orElse(null);
        if (existing != null) {
            existing.setStatus(UserRoleStatus.ACTIVE);
            existing.setRevokedReason(null);
            existing.setUpdatedBy(updatedBy);
            userRoleRepository.save(existing);

            emitRoleChangedIfNeeded(user, roleName);
            return;
        }

        Role role = roleRepository.findByName(roleName).orElseGet(() -> {
            Role created = new Role();
            created.setName(roleName);
            return roleRepository.save(created);
        });

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRole.setStatus(UserRoleStatus.ACTIVE);
        userRole.setUpdatedBy(updatedBy);
        userRoleRepository.save(userRole);

        emitRoleChangedIfNeeded(user, roleName);
    }

    private void emitRoleChangedIfNeeded(User user, RoleName roleName) {
        if (roleName != RoleName.TUTOR && roleName != RoleName.ADMIN) {
            return;
        }
        ClientEvent event = ClientEvent.of(
                ClientEventType.ROLE_CHANGED,
                "user:" + user.getId(),
                null,
                Map.of("role", roleName.name(), "status", UserRoleStatus.ACTIVE.name())
        );
        realtimeOutboxService.enqueue("user:" + user.getId(), null, event);
    }
}
