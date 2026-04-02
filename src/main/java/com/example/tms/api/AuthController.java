package com.example.tms.api;

import com.example.tms.api.dto.auth.AuthResponse;
import com.example.tms.api.dto.auth.ForgotPasswordRequest;
import com.example.tms.api.dto.auth.GoogleAuthRequest;
import com.example.tms.api.dto.auth.GoogleAuthResponse;
import com.example.tms.api.dto.auth.LinkGoogleRequest;
import com.example.tms.api.dto.auth.LoginRequest;
import com.example.tms.api.dto.auth.RegisterRequest;
import com.example.tms.api.dto.auth.ResetPasswordRequest;
import com.example.tms.api.dto.auth.SwitchRoleRequest;
import com.example.tms.api.dto.auth.VerifyGoogleLinkOtpRequest;
import com.example.tms.api.dto.auth.VerifyOtpRequest;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
    private final CurrentUserResolver currentUserResolver;

    public AuthController(AuthService authService, CurrentUserResolver currentUserResolver) {
        this.authService = authService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/register")
    public Map<String, String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return Map.of("message", "Registered. Please verify OTP sent to email.");
    }

    @PostMapping("/verify-otp")
    public AuthResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest request, HttpServletRequest httpRequest) {
        return authService.verifyOtp(request, httpRequest);
    }

    @PostMapping("/resend-otp")
    public Map<String, String> resendOtp(@RequestParam String email) {
        authService.resendOtp(email);
        return Map.of("message", "OTP resent");
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request, httpRequest);
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
    public AuthResponse refresh(@RequestBody Map<String, String> payload, HttpServletRequest httpRequest) {
        String refreshToken = payload.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Refresh token is required");
        }
        return authService.refreshToken(refreshToken, httpRequest);
    }

    @PostMapping("/logout")
    public Map<String, String> logout() {
        authService.logout(currentUserResolver.requireUserId());
        return Map.of("message", "Logged out successfully");
    }

    @PostMapping("/google")
    public GoogleAuthResponse googleLogin(@Valid @RequestBody GoogleAuthRequest request, HttpServletRequest httpRequest) {
        return authService.googleLogin(request, httpRequest);
    }

    @PostMapping("/google/verify-link-otp")
    public GoogleAuthResponse verifyGoogleLinkOtp(
            @Valid @RequestBody VerifyGoogleLinkOtpRequest request,
            HttpServletRequest httpRequest
    ) {
        return authService.verifyGoogleLinkOtp(request, httpRequest);
    }

    @PostMapping("/switch-role")
    public AuthResponse switchRole(@Valid @RequestBody SwitchRoleRequest request, HttpServletRequest httpRequest) {
        return authService.switchRole(currentUserResolver.requireUserId(), request.activeRole(), httpRequest);
    }

    @PostMapping("/google/link")
    public Map<String, String> linkGoogle(@Valid @RequestBody LinkGoogleRequest request) {
        authService.linkGoogleAccount(
                currentUserResolver.requireUserId(),
                request.idToken(),
                request.currentPassword()
        );
        return Map.of("message", "Google account linked successfully");
    }
}
