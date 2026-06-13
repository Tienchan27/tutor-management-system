package com.example.tms.util;

import com.example.tms.api.dto.auth.AuthResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

public final class CookieUtils {

    private static final int ACCESS_TOKEN_MAX_AGE = 900;       // 15 min
    private static final int REFRESH_TOKEN_MAX_AGE = 2_592_000; // 30 days
    private static final String ACCESS_TOKEN_COOKIE = "accessToken";
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    private CookieUtils() {}

    public static void setAuthCookies(HttpServletResponse response, AuthResponse auth) {
        ResponseCookie access = ResponseCookie.from(ACCESS_TOKEN_COOKIE, auth.accessToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(ACCESS_TOKEN_MAX_AGE)
                .build();
        ResponseCookie refresh = ResponseCookie.from(REFRESH_TOKEN_COOKIE, auth.refreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/auth/refresh")
                .maxAge(REFRESH_TOKEN_MAX_AGE)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, access.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());
    }

    public static void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie access = ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
        ResponseCookie refresh = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/auth/refresh")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, access.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());
    }
}
