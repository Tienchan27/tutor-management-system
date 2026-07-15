package com.example.tms.api;

import com.example.tms.api.dto.auth.AuthResponse;
import com.example.tms.api.dto.auth.ForgotPasswordRequest;
import com.example.tms.api.dto.auth.GoogleAuthRequest;
import com.example.tms.api.dto.auth.GoogleAuthResponse;
import com.example.tms.api.dto.auth.LoginRequest;
import com.example.tms.api.dto.auth.RegisterRequest;
import com.example.tms.api.dto.auth.ResetPasswordRequest;
import com.example.tms.api.dto.auth.SwitchRoleRequest;
import com.example.tms.api.dto.auth.VerifyGoogleLinkOtpRequest;
import com.example.tms.api.dto.auth.VerifyOtpRequest;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.exception.ApiException;
import com.example.tms.security.AuthCookieService;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.AuthService;
import com.example.tms.service.GoogleAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;
    private final CurrentUserResolver currentUserResolver;
    private final AuthCookieService authCookieService;

    public AuthController(
            AuthService authService,
            GoogleAuthService googleAuthService,
            CurrentUserResolver currentUserResolver,
            AuthCookieService authCookieService
    ) {
        this.authService = authService;
        this.googleAuthService = googleAuthService;
        this.currentUserResolver = currentUserResolver;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/register")
    public Map<String, String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return Map.of("message", "Registered. Please verify OTP sent to email.");
    }

    @PostMapping("/verify-otp")
    public AuthResponse verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse auth = authService.verifyOtp(request, httpRequest);
        authCookieService.setAuthCookies(httpResponse, auth);
        return auth;
    }

    @PostMapping("/resend-otp")
    public Map<String, String> resendOtp(@RequestParam String email) {
        authService.resendOtp(email);
        return Map.of("message", "OTP resent");
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse auth = authService.login(request, httpRequest);
        authCookieService.setAuthCookies(httpResponse, auth);
        return auth;
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return Map.of("message", "If an account exists for this email, we sent a reset code.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.email(), request.otp(), request.newPassword());
        return Map.of("message", "Password updated successfully");
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException("Refresh token required");
        }
        AuthResponse auth = authService.refreshToken(refreshToken, httpRequest);
        authCookieService.setAuthCookies(httpResponse, auth);
        return auth;
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletResponse httpResponse) {
        authService.logout(currentUserResolver.requireUserId());
        authCookieService.clearAuthCookies(httpResponse);
        return Map.of("message", "Logged out successfully");
    }

    @PostMapping("/switch-role")
    public AuthResponse switchRole(
            @Valid @RequestBody SwitchRoleRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        RoleName role = request.activeRole();
        AuthResponse auth = authService.switchRole(currentUserResolver.requireUserId(), role, httpRequest);
        authCookieService.setAuthCookies(httpResponse, auth);
        return auth;
    }

    @PostMapping("/google")
    public GoogleAuthResponse googleLogin(
            @Valid @RequestBody GoogleAuthRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        GoogleAuthResponse googleAuth = googleAuthService.googleLogin(request, httpRequest);
        if (googleAuth.accessToken() != null) {
            authCookieService.setAuthCookies(httpResponse, toAuthResponse(googleAuth));
        }
        return googleAuth;
    }

    @PostMapping("/google/verify-link-otp")
    public GoogleAuthResponse verifyGoogleLinkOtp(
            @Valid @RequestBody VerifyGoogleLinkOtpRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        GoogleAuthResponse googleAuth = googleAuthService.verifyGoogleLinkOtp(request, httpRequest);
        if (googleAuth.accessToken() != null) {
            authCookieService.setAuthCookies(httpResponse, toAuthResponse(googleAuth));
        }
        return googleAuth;
    }

    private AuthResponse toAuthResponse(GoogleAuthResponse g) {
        return new AuthResponse(
                g.userId(),
                g.email(),
                g.name(),
                g.accessToken(),
                g.refreshToken(),
                g.needsProfileCompletion(),
                g.needsTutorOnboarding(),
                g.roles(),
                g.activeRole()
        );
    }
}
