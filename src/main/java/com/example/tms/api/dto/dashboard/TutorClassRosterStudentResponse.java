package com.example.tms.api.dto.dashboard;

import java.util.UUID;

public record TutorClassRosterStudentResponse(
        UUID studentId,
        String studentName,
        Long tuitionAtLog
) {
}

