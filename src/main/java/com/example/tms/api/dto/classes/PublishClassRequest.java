package com.example.tms.api.dto.classes;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PublishClassRequest(
        @NotNull
        @Size(min = 1, message = "At least one student is required")
        List<@Valid PublishClassStudentRequest> students,

        @NotNull
        UUID subjectId,

        @Min(0)
        Long pricePerHour,

        @Size(max = 255)
        String displayName,

        String note
) {
}
