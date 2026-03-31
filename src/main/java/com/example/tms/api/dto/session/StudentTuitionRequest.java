package com.example.tms.api.dto.session;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StudentTuitionRequest(
        @NotNull UUID studentId,
        @NotNull @Min(0) Long tuitionAtLog
) {
}

