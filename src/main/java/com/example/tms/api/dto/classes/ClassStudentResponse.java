package com.example.tms.api.dto.classes;

import java.util.UUID;

public record ClassStudentResponse(
        UUID studentId,
        String name
) {
}
