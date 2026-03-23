package com.example.tms.api.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for Google OAuth2 login
 * Frontend sends Google ID token received from Google Sign-In
 */
public record GoogleAuthRequest(
        @NotBlank(message = "ID token is required")
        String idToken
) {
}
