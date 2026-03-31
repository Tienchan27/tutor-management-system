package com.example.tms.api.dto.classes;

import java.util.List;
import java.util.UUID;

public record AvailableClassResponse(
        UUID classId,
        String displayName,
        String subjectName,
        Long pricePerHour,
        String note,
        List<String> studentNames,
        boolean hasApplied
) {
}
