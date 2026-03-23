package com.example.tms.api.dto.bank;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBankAccountRequest(
        @NotBlank(message = "Bank name is required")
        @Size(max = 50, message = "Bank name must not exceed 50 characters")
        String bankName,

        @NotBlank(message = "Account number is required")
        @Pattern(regexp = "^[0-9]{9,19}$", message = "Account number must be 9-19 digits")
        @Size(max = 30)
        String accountNumber,

        @NotBlank(message = "Account holder name is required")
        @Size(max = 100, message = "Account holder name must not exceed 100 characters")
        String accountHolderName
) {
}
