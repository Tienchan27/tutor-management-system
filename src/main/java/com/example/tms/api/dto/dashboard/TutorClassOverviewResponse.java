package com.example.tms.api.dto.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TutorClassOverviewResponse(
        UUID classId,
        String classDisplayName,
        String subjectName,
        String classStatus,
        Long pricePerHour,
        BigDecimal defaultSalaryRate,
        long sessionCount,
        LocalDate latestSessionDate
) {
}
