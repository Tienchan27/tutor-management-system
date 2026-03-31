package com.example.tms.api.dto.payout;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OverrideNetSalaryRequest(
        @NotNull
        @Min(0)
        Long netSalary
) {
}

