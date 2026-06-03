package com.example.tms.api.dto.invoice;

import com.example.tms.entity.enums.EnrollmentStatus;

import java.util.UUID;

public record StudentClassResponse(
        UUID classId,
        String className,
        String subjectName,
        String tutorName,
        Long pricePerHour,
        EnrollmentStatus status
) {
}
