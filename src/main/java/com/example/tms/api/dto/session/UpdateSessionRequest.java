package com.example.tms.api.dto.session;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateSessionRequest(
        LocalDate date,
        @DecimalMin("0.01") BigDecimal durationHours,
        @Min(0) Long tuitionAtLog,
        @DecimalMin("0.00") BigDecimal salaryRateAtLog,
        String payrollMonth,
        String note,
        @NotBlank String reason
) {
}
