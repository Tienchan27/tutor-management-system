package com.example.tms.api.dto.dashboard;

import java.util.UUID;

public record TutorSummaryResponse(
        UUID tutorId,
        String tutorName,
        String tutorEmail,
        Long grossRevenue,
        Long netSalary,
        Long classesReceivingThisMonth,
        String payoutStatus
) {
}
