package com.example.tms.security;

import com.example.tms.entity.User;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class CurrentUserResolver {
    private final UserRepository userRepository;

    public CurrentUserResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User requireUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ApiException("Not authenticated");
        }

        UUID userId = (UUID) authentication.getPrincipal();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
    }

    public UUID requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ApiException("Not authenticated");
        }
        return (UUID) authentication.getPrincipal();
    }

    public RoleName requireActiveRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ApiException("Not authenticated");
        }
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(authority -> authority != null && authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .findFirst()
                .map(this::parseRoleName)
                .filter(role -> role != null)
                .orElseThrow(() -> new ApiException("Active role is required"));
    }

    private RoleName parseRoleName(String value) {
        try {
            return RoleName.valueOf(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
