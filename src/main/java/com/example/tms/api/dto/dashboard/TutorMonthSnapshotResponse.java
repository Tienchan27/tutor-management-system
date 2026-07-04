package com.example.tms.api.dto.dashboard;

public record TutorMonthSnapshotResponse(
        long sessionCount,
        long totalTuition
) {
}
