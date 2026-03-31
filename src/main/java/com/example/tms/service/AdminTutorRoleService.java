package com.example.tms.service;

import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminTutorRoleService {
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    public AdminTutorRoleService(UserRepository userRepository, UserRoleRepository userRoleRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void revokeTutorRole(User admin, UUID tutorId, String reason) {
        // Validate tutor exists (and fail fast with a clear message)
        userRepository.findById(tutorId)
                .orElseThrow(() -> new ApiException("Tutor not found"));

        UserRole userRole = userRoleRepository.findByUserIdAndRole(tutorId, RoleName.TUTOR)
                .orElseThrow(() -> new ApiException("Tutor role not found"));

        // Revoke only role, do not hard delete user account
        userRole.setStatus(UserRoleStatus.REVOKED);
        userRole.setRevokedReason(reason);
        userRole.setUpdatedBy(admin);
        userRoleRepository.save(userRole);
    }
}

