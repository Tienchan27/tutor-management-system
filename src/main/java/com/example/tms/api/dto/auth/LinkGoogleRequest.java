package com.example.tms.api.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for linking Google account to existing password-based account
 * Requires current password for security (prevent account takeover)
 */
public record LinkGoogleRequest(
        @NotBlank(message = "ID token is required")
        String idToken,

        @NotBlank(message = "Current password is required for security")
        String currentPassword
) {
}
