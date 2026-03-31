package com.example.tms.api.dto.classes;

import java.util.List;
import java.util.UUID;

public record PublishedClassResponse(
        UUID classId,
        String displayName,
        String subjectName,
        Long pricePerHour,
        String status,
        String note,
        List<String> studentNames,
        List<TutorClassApplicationResponse> applications
) {
}
