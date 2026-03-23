package com.example.tms.service;

import com.example.tms.api.dto.user.ProfileResponse;
import com.example.tms.api.dto.user.UpdateProfileRequest;
import com.example.tms.entity.User;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public ProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        return mapToProfileResponse(user);
    }

    @Transactional
    public ProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));

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
}
