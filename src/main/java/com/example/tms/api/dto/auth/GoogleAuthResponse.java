package com.example.tms.api.dto.auth;

import java.util.UUID;

/**
 * Response DTO for Google OAuth2 login
 * Contains user info, JWT tokens, and flags for profile completion
 */
public record GoogleAuthResponse(
        UUID userId,
        String email,
        String name,
        String picture,  // Google profile picture URL
        String accessToken,
        String refreshToken,
        boolean isNewUser,  // true if account just created
        boolean needsProfileCompletion  // true if user needs to complete profile (phone/facebook)
) {
}
