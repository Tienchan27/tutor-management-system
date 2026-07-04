package com.example.tms.api.dto.bank;

import java.time.LocalDateTime;

public record CenterBankAccountResponse(
        String bankBin,
        String bankCode,
        String bankName,
        String accountNumber,
        String accountHolderName,
        LocalDateTime updatedAt
) {
}
