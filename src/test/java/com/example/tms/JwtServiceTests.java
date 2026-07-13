package com.example.tms;

import com.example.tms.security.JwtService;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtServiceTests {
    private static final String TEST_SECRET = "test-secret-key-for-jwt-service-should-be-long-enough-1234567890";

    @Test
    void accessTokenStoresActiveRoleClaim() {
        JwtService jwtService = new JwtService(TEST_SECRET);
        String token = jwtService.generateAccessToken(UUID.randomUUID(), "user@example.com", "ADMIN");
        jwtService.validateAccessToken(token);
        assertEquals("ADMIN", jwtService.extractActiveRole(token));
    }

}
