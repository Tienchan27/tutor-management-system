package com.example.tms.service;

import com.example.tms.api.dto.auth.AuthResponse;
import com.example.tms.api.dto.auth.LoginRequest;
import com.example.tms.api.dto.auth.RegisterRequest;
import com.example.tms.api.dto.auth.VerifyOtpRequest;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.OtpPurpose;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserRoleService userRoleService;
    private final TutorInvitationService tutorInvitationService;
    private final OtpService otpService;
    private final TokenService tokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            UserRoleService userRoleService,
            TutorInvitationService tutorInvitationService,
            OtpService otpService,
            TokenService tokenService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userRoleService = userRoleService;
        this.tutorInvitationService = tutorInvitationService;
        this.otpService = otpService;
        this.tokenService = tokenService;
    }

    @Transactional
    public void register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        User existingUser = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (existingUser != null) {
            if (existingUser.getStatus() == UserStatus.PENDING_VERIFICATION
                    && (existingUser.getPassword() == null || existingUser.getPassword().isBlank())) {
                existingUser.setName(sanitizeName(request.name()));
                existingUser.setPassword(passwordEncoder.encode(request.password()));
                userRepository.save(existingUser);
                userRoleService.ensureActiveRole(existingUser, RoleName.STUDENT, existingUser);
                tutorInvitationService.acceptPendingInvitation(existingUser);
                otpService.issueOtp(normalizedEmail, OtpPurpose.REGISTER, false);
                return;
            }
            if (existingUser.getStatus() == UserStatus.PENDING_VERIFICATION) {
                throw new ApiException("This email is already registered.");
            }
            throw new ApiException("Email already exists");
        }
        User user = new User();
        user.setName(sanitizeName(request.name()));
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException("Email already exists");
        }
        userRoleService.ensureActiveRole(user, RoleName.STUDENT, user);
        tutorInvitationService.acceptPendingInvitation(user);
        otpService.issueOtp(normalizedEmail, OtpPurpose.REGISTER, false);
    }

    @Transactional
    public void resendOtp(String email) {
        String normalizedEmail = normalizeEmail(email);
        Optional<User> userOptional = userRepository.findByEmail(normalizedEmail);
        if (userOptional.isEmpty()) return;
        User user = userOptional.get();
        if (user.getStatus() == UserStatus.ACTIVE) return;
        otpService.issueOtp(normalizedEmail, OtpPurpose.REGISTER, true);
    }

    @Transactional
    public void forgotPassword(String email) {
        String normalizedEmail = normalizeEmail(email);
        Optional<User> opt = userRepository.findByEmail(normalizedEmail);
        if (opt.isEmpty()) return;
        User user = opt.get();
        if (user.getStatus() != UserStatus.PENDING_VERIFICATION && user.getStatus() != UserStatus.ACTIVE) return;
        otpService.issueOtp(normalizedEmail, OtpPurpose.PASSWORD_RESET, true);
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        String normalizedEmail = normalizeEmail(email);
        otpService.verifyOtpOrThrow(normalizedEmail, OtpPurpose.PASSWORD_RESET, otp);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException("User not found"));
        if (user.getStatus() != UserStatus.PENDING_VERIFICATION && user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException("The account is no longer active. Please contact support.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenService.revokeAll(user);
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = normalizeEmail(request.email());
        otpService.verifyOtpOrThrow(normalizedEmail, OtpPurpose.REGISTER, request.otp());
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException("User not found"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        return tokenService.issueTokenPair(user, httpRequest);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = normalizeEmail(request.email());
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException("INVALID_CREDENTIALS", "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ApiException("INVALID_CREDENTIALS", "Invalid email or password");
        }
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new ApiException(
                    "PENDING_VERIFICATION",
                    "Please verify your email before signing in. A new verification code will be sent when you continue."
            );
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            if (user.getStatus() == UserStatus.BLOCKED) {
                throw new ApiException("ACCOUNT_BLOCKED", "Your account is blocked. Please contact support.");
            }
            throw new ApiException("ACCOUNT_NOT_ACTIVE", "The account is no longer active. Please contact support.");
        }
        return tokenService.issueTokenPair(user, httpRequest);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenValue, HttpServletRequest httpRequest) {
        return tokenService.refresh(refreshTokenValue, httpRequest);
    }

    @Transactional
    public void logout(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        tokenService.revokeAll(user);
    }

    @Transactional
    public AuthResponse switchRole(UUID userId, RoleName activeRole, HttpServletRequest httpRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        return tokenService.issueTokenPair(user, httpRequest, activeRole);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) throw new ApiException("Email is required");
        return email.trim().toLowerCase();
    }

    private String sanitizeName(String name) {
        if (name == null || name.isBlank()) return "User";
        String trimmed = name.trim();
        return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
    }
}
