package com.example.tms.api.dto.bank;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateCenterBankAccountRequest(
        @NotBlank @Pattern(regexp = "\\d{6}", message = "bankBin must be a 6-digit BIN") String bankBin,
        @NotBlank @Size(max = 30) String accountNumber,
        @NotBlank @Size(max = 100) String accountHolderName
) {
}
