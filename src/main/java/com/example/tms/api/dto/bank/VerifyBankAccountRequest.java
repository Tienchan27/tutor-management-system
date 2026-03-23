package com.example.tms.api.dto.bank;

import jakarta.validation.constraints.Size;

public record VerifyBankAccountRequest(
        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
