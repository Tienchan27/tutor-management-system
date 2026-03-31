package com.example.tms.api.dto.session;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TutorSessionStudentOptionResponse(
        @NotNull UUID id,
        @NotNull String name
) {
}

