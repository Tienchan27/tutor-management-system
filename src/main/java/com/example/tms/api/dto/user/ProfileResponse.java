package com.example.tms.api.dto.user;

import com.example.tms.entity.enums.UserStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ProfileResponse(
        UUID id,
        String name,
        String email,
        UserStatus status,
        BigDecimal defaultSalaryRate,
        String phoneNumber,
        String facebookUrl,
        String parentPhone,
        String address,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
