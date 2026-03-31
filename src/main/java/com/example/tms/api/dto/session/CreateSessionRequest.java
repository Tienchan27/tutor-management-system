package com.example.tms.api.dto.session;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateSessionRequest(
        @NotNull UUID classId,
        @NotNull LocalDate date,
        @NotNull @DecimalMin("0.25") BigDecimal durationHours,
        @NotNull @NotEmpty List<StudentTuitionRequest> studentTuitions,
        @NotNull @DecimalMin("0.00") BigDecimal salaryRateAtLog,
        String payrollMonth,
        String note
) {
}
