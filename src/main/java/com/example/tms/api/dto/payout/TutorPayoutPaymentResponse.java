package com.example.tms.api.dto.payout;

import java.time.LocalDateTime;
import java.util.UUID;

public record TutorPayoutPaymentResponse(
        UUID id,
        TutorPayoutResponse tutorPayout,
        String qrRef,
        String qrPayload,
        String status,
        LocalDateTime paidAt,
        LocalDateTime createdAt
) {
}
