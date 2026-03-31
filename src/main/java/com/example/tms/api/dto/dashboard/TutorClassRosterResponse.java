package com.example.tms.api.dto.dashboard;

import java.util.List;
import java.util.UUID;

public record TutorClassRosterResponse(
        UUID classId,
        List<TutorClassRosterStudentResponse> students
) {
}

