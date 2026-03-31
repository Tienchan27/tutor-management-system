package com.example.tms.api.dto.dashboard;

public record TutorDashboardResponse(
        int year,
        int month,
        Long grossRevenue,
        Long netSalary,
        String status
) {
}
