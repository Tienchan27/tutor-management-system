package com.example.tms.api.dto.bank;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Attach the correct catalog bank (and BIN) to an existing account; account number is left unchanged. */
public record UpdateBankAccountRequest(
        @NotBlank @Pattern(regexp = "\\d{6}", message = "bankBin must be a 6-digit BIN") String bankBin,

        @Size(max = 120) String bankName,

        @Size(max = 20) String bankCode,

        @NotBlank @Size(max = 100) String accountHolderName
) {
}
