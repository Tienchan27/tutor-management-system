package com.example.tms.security;

import com.example.tms.api.dto.auth.AuthResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

/**
 * Issues browser auth cookies using paths that match the <em>public</em> URL
 * (Nginx/Vite {@code /api} prefix), not the Spring controller path after rewrite.
 */
@Service
public class AuthCookieService {

    private static final int ACCESS_TOKEN_MAX_AGE = 900;       // 15 min
    private static final int REFRESH_TOKEN_MAX_AGE = 2_592_000; // 30 days
    private static final String ACCESS_TOKEN_COOKIE = "accessToken";
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    /** Pre-fix path that ignored the reverse-proxy {@code /api} prefix. */
    private static final String LEGACY_REFRESH_COOKIE_PATH = "/auth/refresh";

    private final String refreshCookiePath;
    private final boolean secure;

    public AuthCookieService(
            @Value("${app.security.cookie.public-api-prefix:/api}") String publicApiPrefix,
            @Value("${app.security.cookie.secure:true}") boolean secure
    ) {
        this.refreshCookiePath = buildRefreshCookiePath(publicApiPrefix);
        this.secure = secure;
    }

    public void setAuthCookies(HttpServletResponse response, AuthResponse auth) {
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie(auth.accessToken(), ACCESS_TOKEN_MAX_AGE).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(auth.refreshToken(), refreshCookiePath, REFRESH_TOKEN_MAX_AGE).toString());
        // Drop any leftover cookie from the pre-fix Path=/auth/refresh.
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", LEGACY_REFRESH_COOKIE_PATH, 0).toString());
    }

    public void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie("", 0).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", refreshCookiePath, 0).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", LEGACY_REFRESH_COOKIE_PATH, 0).toString());
    }

    String refreshCookiePath() {
        return refreshCookiePath;
    }

    private ResponseCookie accessCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(ACCESS_TOKEN_COOKIE, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
    }

    private ResponseCookie refreshCookie(String value, String path, long maxAgeSeconds) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(path)
                .maxAge(maxAgeSeconds)
                .build();
    }

    static String buildRefreshCookiePath(String publicApiPrefix) {
        String prefix = publicApiPrefix == null ? "" : publicApiPrefix.trim();
        while (prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        if (prefix.isEmpty() || "/".equals(prefix)) {
            return "/auth/refresh";
        }
        if (!prefix.startsWith("/")) {
            prefix = "/" + prefix;
        }
        return prefix + "/auth/refresh";
    }
}
