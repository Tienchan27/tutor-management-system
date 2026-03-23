package com.example.tms.api.dto.bank;

import java.time.LocalDateTime;
import java.util.UUID;

public record BankAccountResponse(
        UUID id,
        String bankName,
        String maskedAccountNumber,
        String accountHolderName,
        boolean isPrimary,
        boolean isVerified,
        LocalDateTime verifiedAt,
        LocalDateTime createdAt
) {
}
