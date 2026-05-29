package com.example.tms.api.dto.payout;

import com.example.tms.api.dto.common.UserRefResponse;

import java.time.LocalDateTime;
import java.util.UUID;

public record TutorPayoutResponse(
        UUID id,
        UserRefResponse tutor,
        int year,
        int month,
        long grossRevenue,
        long netSalary,
        String status,
        LocalDateTime paidAt,
        UserRefResponse paidBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
