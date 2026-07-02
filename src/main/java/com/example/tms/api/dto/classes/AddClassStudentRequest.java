package com.example.tms.api.dto.classes;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddClassStudentRequest(
        @NotBlank @Email String email,
        String name
) {
}
