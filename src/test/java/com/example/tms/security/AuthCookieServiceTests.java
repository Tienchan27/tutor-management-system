package com.example.tms.security;

import com.example.tms.api.dto.auth.AuthResponse;
import com.example.tms.entity.enums.RoleName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthCookieServiceTests {

    @Test
    void buildRefreshCookiePath_defaultsToApiPrefixedRefreshEndpoint() {
        assertEquals("/api/auth/refresh", AuthCookieService.buildRefreshCookiePath("/api"));
        assertEquals("/api/auth/refresh", AuthCookieService.buildRefreshCookiePath("/api/"));
        assertEquals("/auth/refresh", AuthCookieService.buildRefreshCookiePath(""));
        assertEquals("/auth/refresh", AuthCookieService.buildRefreshCookiePath("/"));
    }

    @Test
    void setAuthCookies_usesPublicApiRefreshPath_andClearsLegacyPath() {
        AuthCookieService service = new AuthCookieService("/api", true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.setAuthCookies(response, sampleAuth());

        List<String> cookies = response.getHeaders("Set-Cookie");
        assertTrue(cookies.stream().anyMatch(c -> c.startsWith("accessToken=") && c.contains("Path=/") && c.contains("HttpOnly")));
        assertTrue(cookies.stream().anyMatch(c ->
                c.startsWith("refreshToken=") && c.contains("Path=/api/auth/refresh") && c.contains("Max-Age=2592000")));
        assertTrue(cookies.stream().anyMatch(c ->
                c.startsWith("refreshToken=") && c.contains("Path=/auth/refresh") && c.contains("Max-Age=0")));
    }

    private static AuthResponse sampleAuth() {
        return new AuthResponse(
                UUID.randomUUID(),
                "demo@tms.local",
                "Demo",
                "access-token-value",
                "refresh-token-value",
                false,
                false,
                List.of(RoleName.STUDENT),
                RoleName.STUDENT
        );
    }
}
