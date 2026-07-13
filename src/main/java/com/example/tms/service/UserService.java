package com.example.tms.service;

import com.example.tms.api.dto.user.ProfileResponse;
import com.example.tms.api.dto.user.UpdateProfileRequest;
import com.example.tms.api.dto.user.UserAccessResponse;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final TutorBankAccountRepository tutorBankAccountRepository;

    public UserService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            TutorBankAccountRepository tutorBankAccountRepository
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.tutorBankAccountRepository = tutorBankAccountRepository;
    }

    public ProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found"));
        return mapToProfileResponse(user);
    }

    public UserAccessResponse getAccess(UUID userId, RoleName activeRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found"));
        List<RoleName> roles = userRoleRepository.findByUserIdAndStatus(userId, UserRoleStatus.ACTIVE)
                .stream()
                .map(UserRole::getRole)
                .map(role -> role.getName())
                .distinct()
                .toList();
        if (activeRole == null || !roles.contains(activeRole)) {
            throw ApiException.forbidden("ACTIVE_ROLE_REVOKED", "Current role is no longer available");
        }
        return new UserAccessResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                roles,
                activeRole,
                needsProfileCompletion(user),
                needsTutorOnboarding(user)
        );
    }

    @Transactional
    public ProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found"));

        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().trim());
        }

        // Update contact fields
        user.setPhoneNumber(request.phoneNumber());
        user.setFacebookUrl(request.facebookUrl());
        user.setParentPhone(request.parentPhone());
        user.setAddress(request.address());

        user = userRepository.save(user);
        return mapToProfileResponse(user);
    }

    private ProfileResponse mapToProfileResponse(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getStatus(),
                user.getDefaultSalaryRate(),
                user.getPhoneNumber(),
                user.getFacebookUrl(),
                user.getParentPhone(),
                user.getAddress(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private boolean needsProfileCompletion(User user) {
        boolean hasPhone = user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank();
        boolean hasFacebook = user.getFacebookUrl() != null && !user.getFacebookUrl().isBlank();
        return !hasPhone && !hasFacebook;
    }

    private boolean needsTutorOnboarding(User user) {
        boolean isTutor = userRoleRepository.hasRole(user.getId(), RoleName.TUTOR, UserRoleStatus.ACTIVE);
        if (!isTutor) {
            return false;
        }
        return tutorBankAccountRepository.countByUserId(user.getId()) == 0;
    }
}
