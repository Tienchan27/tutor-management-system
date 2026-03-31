package com.example.tms.api.dto.dashboard;

import java.util.UUID;

public record AdminTutorPayoutSnapshotResponse(
        UUID payoutId,
        Integer year,
        Integer month,
        Long grossRevenue,
        Long netSalary,
        String status
) {
}
