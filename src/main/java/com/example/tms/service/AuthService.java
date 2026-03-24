package com.example.tms.service;

import com.example.tms.api.dto.auth.AuthResponse;
import com.example.tms.api.dto.auth.GoogleAuthRequest;
import com.example.tms.api.dto.auth.GoogleAuthResponse;
import com.example.tms.api.dto.auth.LinkGoogleRequest;
import com.example.tms.api.dto.auth.LoginRequest;
import com.example.tms.api.dto.auth.RegisterRequest;
import com.example.tms.api.dto.auth.VerifyOtpRequest;
import com.example.tms.entity.OtpVerification;
import com.example.tms.entity.RefreshToken;
import com.example.tms.entity.Role;
import com.example.tms.entity.User;
import com.example.tms.entity.UserProvider;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.OtpPurpose;
import com.example.tms.entity.enums.OtpStatus;
import com.example.tms.entity.enums.ProviderType;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.OtpVerificationRepository;
import com.example.tms.repository.RefreshTokenRepository;
import com.example.tms.repository.RoleRepository;
import com.example.tms.repository.UserProviderRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.jpa.JpaObjectRetrievalFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OtpVerificationRepository otpVerificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserProviderRepository userProviderRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final JwtService jwtService;
    private final String googleClientId;

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int OTP_MAX_ATTEMPTS = 5;
    private static final int OTP_RESEND_COOLDOWN_SECONDS = 60;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            OtpVerificationRepository otpVerificationRepository,
            RefreshTokenRepository refreshTokenRepository,
            UserProviderRepository userProviderRepository,
            PasswordEncoder passwordEncoder,
            MailService mailService,
            JwtService jwtService,
            @Value("${GOOGLE_CLIENT_ID}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.otpVerificationRepository = otpVerificationRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userProviderRepository = userProviderRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.jwtService = jwtService;
        this.googleClientId = googleClientId;
    }

    @Transactional
    public void register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
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
        assignRole(user, RoleName.STUDENT);
        issueOtp(normalizedEmail);
    }

    @Transactional
    public void resendOtp(String email) {
        String normalizedEmail = normalizeEmail(email);
        Optional<User> userOptional = userRepository.findByEmail(normalizedEmail);
        if (userOptional.isEmpty()) {
            return;
        }
        User user = userOptional.get();
        if (user.getStatus() == UserStatus.ACTIVE) {
            return;
        }

        // Check for recent OTP to prevent spam
        otpVerificationRepository.findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(
                normalizedEmail,
                OtpPurpose.REGISTER,
                OtpStatus.ACTIVE
        ).ifPresent(recentOtp -> {
            LocalDateTime cooldownEnd = recentOtp.getCreatedAt().plusSeconds(OTP_RESEND_COOLDOWN_SECONDS);
            if (LocalDateTime.now().isBefore(cooldownEnd)) {
                long secondsLeft = java.time.Duration.between(LocalDateTime.now(), cooldownEnd).getSeconds();
                throw new ApiException("Please wait " + secondsLeft + " seconds before requesting a new OTP");
            }
        });

        issueOtp(normalizedEmail);
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = normalizeEmail(request.email());
        OtpVerification otp = otpVerificationRepository
                .findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(
                        normalizedEmail,
                        OtpPurpose.REGISTER,
                        OtpStatus.ACTIVE
                )
                .orElseThrow(() -> new ApiException("Invalid or expired OTP"));

        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            otp.setStatus(OtpStatus.EXPIRED);
            otpVerificationRepository.save(otp);
            throw new ApiException("Invalid or expired OTP");
        }
        if (otp.getAttemptCount() >= OTP_MAX_ATTEMPTS) {
            otp.setStatus(OtpStatus.EXPIRED);
            otpVerificationRepository.save(otp);
            throw new ApiException("Too many attempts");
        }

        String hash = hashOtp(request.otp());
        if (!hash.equals(otp.getOtpHash())) {
            otp.setAttemptCount(otp.getAttemptCount() + 1);
            if (otp.getAttemptCount() >= OTP_MAX_ATTEMPTS) {
                otp.setStatus(OtpStatus.EXPIRED);
            }
            otpVerificationRepository.save(otp);
            throw new ApiException("Invalid or expired OTP");
        }
        otp.setStatus(OtpStatus.VERIFIED);
        otpVerificationRepository.save(otp);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException("User not found"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        return generateAuthResponse(user, httpRequest);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = normalizeEmail(request.email());
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ApiException("Invalid credentials");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException("Invalid credentials");
        }
        return generateAuthResponse(user, httpRequest);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenValue, HttpServletRequest httpRequest) {
        // Validate JWT structure and expiration
        jwtService.validateRefreshToken(refreshTokenValue);
        UUID userId = jwtService.extractUserId(refreshTokenValue);

        // Hash and check if token exists in database
        String tokenHash = hashToken(refreshTokenValue);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHashAndRevokedFalseForUpdate(tokenHash)
                .orElseThrow(() -> new ApiException("Invalid refresh token"));

        // Check if token belongs to the user
        if (!refreshToken.getUser().getId().equals(userId)) {
            throw new ApiException("Invalid refresh token");
        }

        // Check if token is expired
        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException("Refresh token expired");
        }

        User user = refreshToken.getUser();

        // Revoke the old refresh token (token rotation)
        refreshToken.setRevoked(true);
        refreshToken.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.saveAndFlush(refreshToken);

        // Generate new tokens
        return generateAuthResponse(user, httpRequest);
    }

    @Transactional
    public void logout(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        refreshTokenRepository.revokeAllByUser(user, LocalDateTime.now());
    }

    private void issueOtp(String email) {
        String otp = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1000000));
        OtpVerification verification = new OtpVerification();
        verification.setEmail(email);
        verification.setOtpHash(hashOtp(otp));
        verification.setPurpose(OtpPurpose.REGISTER);
        verification.setStatus(OtpStatus.ACTIVE);
        verification.setAttemptCount(0);
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        otpVerificationRepository.save(verification);
        mailService.sendOtpEmail(email, otp);
    }

    private AuthResponse generateAuthResponse(User user, HttpServletRequest httpRequest) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail());

        // Store refresh token in database
        RefreshToken token = new RefreshToken();
        token.setTokenHash(hashToken(refreshToken));
        token.setUser(user);
        token.setExpiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshTokenTtlSeconds()));
        token.setIpAddress(getClientIp(httpRequest));
        token.setUserAgent(httpRequest.getHeader("User-Agent"));
        refreshTokenRepository.save(token);

        return new AuthResponse(user.getId(), user.getEmail(), accessToken, refreshToken);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void assignRole(User user, RoleName roleName) {
        Role role = roleRepository.findByName(roleName).orElseGet(() -> {
            Role created = new Role();
            created.setName(roleName);
            return roleRepository.save(created);
        });
        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRole.setStatus(UserRoleStatus.ACTIVE);
        userRole.setUpdatedBy(user);
        userRoleRepository.save(userRole);
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(otp.getBytes()));
        } catch (Exception ex) {
            throw new ApiException("Failed to hash OTP");
        }
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes()));
        } catch (Exception ex) {
            throw new ApiException("Failed to hash token");
        }
    }

    @Transactional
    public GoogleAuthResponse googleLogin(GoogleAuthRequest request, HttpServletRequest httpRequest) {
        GoogleIdToken.Payload payload = verifyGoogleToken(request.idToken());
        String googleUserId = payload.getSubject();
        String email = normalizeEmail(payload.getEmail());
        String picture = Optional.ofNullable(payload.get("picture")).map(Object::toString).orElse(null);
        String name = sanitizeName((String) payload.get("name"));

        Optional<UserProvider> providerOptional = userProviderRepository.findValidByProviderAndProviderId(
                ProviderType.GOOGLE,
                googleUserId
        );

        // Historical data may contain orphan provider rows (provider record exists but user row was removed).
        // Clean those rows up to avoid INTERNAL_ERROR and let login continue through normal email linking flow.
        if (providerOptional.isEmpty()
                && userProviderRepository.existsByProviderAndProviderId(ProviderType.GOOGLE, googleUserId)) {
            userProviderRepository.deleteByProviderAndProviderId(ProviderType.GOOGLE, googleUserId);
        }

        if (providerOptional.isPresent()) {
            User user = providerOptional.get().getUser();
            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new ApiException("Account not active");
            }
            return generateGoogleAuthResponse(user, picture, false, httpRequest);
        }

        Optional<User> existingUserOptional = userRepository.findByEmail(email);
        if (existingUserOptional.isPresent()) {
            User existingUser = existingUserOptional.get();
            if (existingUser.getPassword() != null && !existingUser.getPassword().isBlank()) {
                throw new ApiException("EMAIL_CONFLICT");
            }
            createProviderLink(existingUser, googleUserId);
            return generateGoogleAuthResponse(existingUser, picture, false, httpRequest);
        }

        User oauthUser = createOAuthUser(name, email);
        createProviderLink(oauthUser, googleUserId);
        return generateGoogleAuthResponse(oauthUser, picture, true, httpRequest);
    }

    @Transactional
    public void linkGoogleAccount(UUID userId, String idToken, String currentPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new ApiException("Password login is not configured for this account");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ApiException("Invalid current password");
        }

        GoogleIdToken.Payload payload = verifyGoogleToken(idToken);
        String email = normalizeEmail(payload.getEmail());
        String googleUserId = payload.getSubject();

        if (!email.equals(normalizeEmail(user.getEmail()))) {
            throw new ApiException("Google account email does not match current account");
        }

        if (userProviderRepository.existsByUserAndProvider(user, ProviderType.GOOGLE)) {
            throw new ApiException("Google account already linked");
        }

        Optional<UserProvider> existingProvider = userProviderRepository
                .findByProviderAndProviderId(ProviderType.GOOGLE, googleUserId);
        if (existingProvider.isPresent() && !existingProvider.get().getUser().getId().equals(user.getId())) {
            throw new ApiException("Google account is already linked to another user");
        }

        createProviderLink(user, googleUserId);
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            ).setAudience(Collections.singletonList(googleClientId)).build();

            GoogleIdToken googleIdToken = verifier.verify(idToken);
            if (googleIdToken == null) {
                throw new ApiException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = googleIdToken.getPayload();
            String issuer = payload.getIssuer();
            boolean validIssuer = "accounts.google.com".equals(issuer) || "https://accounts.google.com".equals(issuer);
            if (!validIssuer) {
                throw new ApiException("Invalid Google token issuer");
            }

            Long exp = payload.getExpirationTimeSeconds();
            if (exp == null || exp <= (System.currentTimeMillis() / 1000)) {
                throw new ApiException("Google token expired");
            }

            if (!isEmailVerified(payload.get("email_verified"))) {
                throw new ApiException("Google email is not verified");
            }

            String email = payload.getEmail();
            if (email == null || email.isBlank()) {
                throw new ApiException("Google token does not contain email");
            }
            return payload;
        } catch (GeneralSecurityException | IOException ex) {
            throw new ApiException("Failed to verify Google token");
        }
    }

    private GoogleAuthResponse generateGoogleAuthResponse(
            User user,
            String picture,
            boolean isNewUser,
            HttpServletRequest httpRequest
    ) {
        AuthResponse authResponse = generateAuthResponse(user, httpRequest);
        return new GoogleAuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                picture,
                authResponse.accessToken(),
                authResponse.refreshToken(),
                isNewUser,
                needsProfileCompletion(user)
        );
    }

    private User createOAuthUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(null);
        user.setStatus(UserStatus.ACTIVE);
        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException("Email already exists");
        }
        assignRole(user, RoleName.STUDENT);
        return user;
    }

    private void createProviderLink(User user, String googleUserId) {
        if (userProviderRepository.existsByProviderAndProviderId(ProviderType.GOOGLE, googleUserId)) {
            throw new ApiException("Google account is already linked");
        }
        UserProvider provider = new UserProvider();
        provider.setUser(user);
        provider.setProvider(ProviderType.GOOGLE);
        provider.setProviderId(googleUserId);
        try {
            userProviderRepository.saveAndFlush(provider);
        } catch (DataIntegrityViolationException | JpaObjectRetrievalFailureException ex) {
            throw new ApiException("Google account is already linked");
        }
    }

    private boolean needsProfileCompletion(User user) {
        boolean hasPhone = user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank();
        boolean hasFacebook = user.getFacebookUrl() != null && !user.getFacebookUrl().isBlank();
        return !hasPhone && !hasFacebook;
    }

    private boolean isEmailVerified(Object emailVerifiedClaim) {
        if (emailVerifiedClaim instanceof Boolean value) {
            return value;
        }
        if (emailVerifiedClaim instanceof String value) {
            return Boolean.parseBoolean(value);
        }
        return false;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ApiException("Email is required");
        }
        return email.trim().toLowerCase();
    }

    private String sanitizeName(String name) {
        if (name == null || name.isBlank()) {
            return "User";
        }
        String trimmed = name.trim();
        return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
    }
}
