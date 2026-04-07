package com.example.tms.service;

import com.example.tms.api.dto.auth.AuthResponse;
import com.example.tms.api.dto.auth.GoogleAuthRequest;
import com.example.tms.api.dto.auth.GoogleAuthResponse;
import com.example.tms.api.dto.auth.LoginRequest;
import com.example.tms.api.dto.auth.RegisterRequest;
import com.example.tms.api.dto.auth.VerifyGoogleLinkOtpRequest;
import com.example.tms.api.dto.auth.VerifyOtpRequest;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.RefreshToken;
import com.example.tms.entity.User;
import com.example.tms.entity.UserProvider;
import com.example.tms.entity.enums.OtpPurpose;
import com.example.tms.entity.enums.ProviderType;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.RefreshTokenRepository;
import com.example.tms.repository.TutorBankAccountRepository;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final OtpRedisService otpRedisService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenRedisService refreshTokenRedisService;
    private final TutorBankAccountRepository tutorBankAccountRepository;
    private final UserProviderRepository userProviderRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserRoleService userRoleService;
    private final TutorInvitationService tutorInvitationService;
    private final MailService mailService;
    private final JwtService jwtService;
    private final String googleClientId;

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int OTP_MAX_ATTEMPTS = 5;
    private static final int OTP_RESEND_COOLDOWN_SECONDS = 60;
    private static final String GOOGLE_AUTH_STATUS_AUTHENTICATED = "AUTHENTICATED";
    private static final String GOOGLE_AUTH_STATUS_PENDING_LINK_OTP = "PENDING_LINK_OTP";

    public AuthService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            OtpRedisService otpRedisService,
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenRedisService refreshTokenRedisService,
            TutorBankAccountRepository tutorBankAccountRepository,
            UserProviderRepository userProviderRepository,
            PasswordEncoder passwordEncoder,
            UserRoleService userRoleService,
            TutorInvitationService tutorInvitationService,
            MailService mailService,
            JwtService jwtService,
            @Value("${GOOGLE_CLIENT_ID}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.otpRedisService = otpRedisService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenRedisService = refreshTokenRedisService;
        this.tutorBankAccountRepository = tutorBankAccountRepository;
        this.userProviderRepository = userProviderRepository;
        this.passwordEncoder = passwordEncoder;
        this.userRoleService = userRoleService;
        this.tutorInvitationService = tutorInvitationService;
        this.mailService = mailService;
        this.jwtService = jwtService;
        this.googleClientId = googleClientId;
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
                issueOtp(normalizedEmail, OtpPurpose.REGISTER, false);
                return;
            }
            if (existingUser.getStatus() == UserStatus.PENDING_VERIFICATION) {
                throw new ApiException(
                        "This email is already registered."
                );
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
        issueOtp(normalizedEmail, OtpPurpose.REGISTER, false);
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

        issueOtp(normalizedEmail, OtpPurpose.REGISTER, true);
    }

    @Transactional
    public void forgotPassword(String email) {
        String normalizedEmail = normalizeEmail(email);
        Optional<User> opt = userRepository.findByEmail(normalizedEmail);
        if (opt.isEmpty()) {
            return;
        }
        User user = opt.get();
        if (user.getStatus() != UserStatus.PENDING_VERIFICATION && user.getStatus() != UserStatus.ACTIVE) {
            return;
        }
        issueOtp(normalizedEmail, OtpPurpose.PASSWORD_RESET, true);
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        String normalizedEmail = normalizeEmail(email);
        verifyOtpOrThrow(normalizedEmail, OtpPurpose.PASSWORD_RESET, otp);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException("User not found"));
        if (user.getStatus() != UserStatus.PENDING_VERIFICATION && user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException("The account is no longer active. Please contact support.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUser(user, LocalDateTime.now());
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = normalizeEmail(request.email());
        verifyOtpOrThrow(normalizedEmail, OtpPurpose.REGISTER, request.otp());

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
                .orElseThrow(() -> new ApiException("INVALID_EMAIL", "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ApiException("INVALID_PASSWORD", "Invalid email or password");
        }
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new ApiException(
                    "PENDING_VERIFICATION",
                    "Please verify your email before signing in. A new verification code will be sent when you continue."
            );
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            if (user.getStatus() == UserStatus.BLOCKED) {
                throw new ApiException(
                        "ACCOUNT_BLOCKED",
                        "Your account is blocked. Please contact support."
                );
            }
            throw new ApiException(
                    "ACCOUNT_NOT_ACTIVE",
                    "The account is no longer active. Please contact support."
            );
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
        if (refreshTokenRedisService.isBlacklisted(tokenHash)) {
            throw new ApiException("Invalid refresh token");
        }
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
        RoleName requestedRole = parseRoleName(jwtService.extractActiveRole(refreshTokenValue));

        // Revoke the old refresh token (token rotation)
        refreshToken.setRevoked(true);
        refreshToken.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.saveAndFlush(refreshToken);

        java.time.Duration ttl = java.time.Duration.between(LocalDateTime.now(), refreshToken.getExpiresAt());
        if (!ttl.isNegative() && !ttl.isZero()) {
            refreshTokenRedisService.blacklist(tokenHash, ttl);
        }

        // Generate new tokens
        return generateAuthResponse(user, httpRequest, requestedRole);
    }

    @Transactional
    public void logout(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        refreshTokenRepository.revokeAllByUser(user, LocalDateTime.now());
    }

    @Transactional
    public AuthResponse switchRole(UUID userId, RoleName activeRole, HttpServletRequest httpRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
        roleOrThrow(user, activeRole);
        log.info("User {} switched active role to {}", user.getId(), activeRole);
        return generateAuthResponse(user, httpRequest, activeRole);
    }

    private void issueOtp(String email, OtpPurpose purpose, boolean strictCooldown) {
        String normalizedEmail = normalizeEmail(email);
        String purposeKey = purpose.name();

        long sendCount = otpRedisService.incrementSendCount(
                normalizedEmail,
                purposeKey,
                java.time.Duration.ofSeconds(OTP_RESEND_COOLDOWN_SECONDS)
        );
        if (sendCount > 1) {
            if (strictCooldown) {
                throw new ApiException("Please wait before requesting a new OTP");
            }
            return;
        }

        String otp = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1000000));
        String otpHash = hashOtp(otp);
        otpRedisService.storeOtp(
                normalizedEmail,
                purposeKey,
                otpHash,
                java.time.Duration.ofMinutes(OTP_EXPIRY_MINUTES)
        );
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            mailService.sendPasswordResetOtp(normalizedEmail, otp);
        } else {
            mailService.sendOtpEmail(normalizedEmail, otp);
        }
    }

    private AuthResponse generateAuthResponse(User user, HttpServletRequest httpRequest) {
        return generateAuthResponse(user, httpRequest, null);
    }

    private AuthResponse generateAuthResponse(User user, HttpServletRequest httpRequest, RoleName requestedRole) {
        List<RoleName> roles = getActiveRoles(user);
        if (roles.isEmpty()) {
            roles = List.of(RoleName.STUDENT);
        }
        RoleName activeRole = requestedRole == null ? resolveDefaultActiveRole(roles) : roleOrThrow(user, requestedRole);
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), activeRole.name());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail(), activeRole.name());

        // Store refresh token in database
        RefreshToken token = new RefreshToken();
        token.setTokenHash(hashToken(refreshToken));
        token.setUser(user);
        token.setExpiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshTokenTtlSeconds()));
        token.setIpAddress(getClientIp(httpRequest));
        token.setUserAgent(httpRequest.getHeader("User-Agent"));
        refreshTokenRepository.save(token);

        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                accessToken,
                refreshToken,
                needsProfileCompletion(user),
                needsTutorOnboarding(user),
                roles,
                activeRole
        );
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
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

        if (providerOptional.isEmpty()
                && userProviderRepository.existsByProviderAndProviderId(ProviderType.GOOGLE, googleUserId)) {
            userProviderRepository.deleteByProviderAndProviderId(ProviderType.GOOGLE, googleUserId);
        }

        if (providerOptional.isPresent()) {
            User user = providerOptional.get().getUser();
            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new ApiException("Account not active");
            }
            return generateGoogleAuthResponse(user, picture, false, httpRequest, null);
        }

        Optional<User> existingUserOptional = userRepository.findByEmail(email);
        if (existingUserOptional.isPresent()) {
            User existingUser = existingUserOptional.get();
            if (existingUser.getPassword() != null && !existingUser.getPassword().isBlank()) {
                issueOtp(email, OtpPurpose.GOOGLE_LINK, false);
                log.info("Google link OTP challenge issued for email {}", email);
                return pendingGoogleOtpChallengeResponse(existingUser, picture, name);
            }
            if (existingUser.getStatus() != UserStatus.ACTIVE) {
                existingUser.setStatus(UserStatus.ACTIVE);
                existingUser = userRepository.save(existingUser);
            }
            createProviderLink(existingUser, googleUserId);
            return generateGoogleAuthResponse(existingUser, picture, false, httpRequest, null);
        }

        User oauthUser = createOAuthUser(name, email);
        createProviderLink(oauthUser, googleUserId);
        return generateGoogleAuthResponse(oauthUser, picture, true, httpRequest, null);
    }

    @Transactional
    public GoogleAuthResponse verifyGoogleLinkOtp(VerifyGoogleLinkOtpRequest request, HttpServletRequest httpRequest) {
        GoogleIdToken.Payload payload = verifyGoogleToken(request.idToken());
        String email = normalizeEmail(payload.getEmail());
        String requestEmail = normalizeEmail(request.email());
        if (!email.equals(requestEmail)) {
            throw new ApiException("Google account email does not match OTP email");
        }
        String googleUserId = payload.getSubject();
        String picture = Optional.ofNullable(payload.get("picture")).map(Object::toString).orElse(null);

        verifyOtpOrThrow(email, OtpPurpose.GOOGLE_LINK, request.otp());

        User user = userRepository.findByEmail(email).orElseThrow(() -> new ApiException("User not found"));
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new ApiException("Password login is not configured for this account");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            user.setStatus(UserStatus.ACTIVE);
            user = userRepository.save(user);
        }
        if (!userProviderRepository.existsByProviderAndProviderId(ProviderType.GOOGLE, googleUserId)) {
            createProviderLink(user, googleUserId);
        }
        log.info("Google provider linked after OTP challenge for user {}", user.getId());
        return generateGoogleAuthResponse(user, picture, false, httpRequest, null);
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
            HttpServletRequest httpRequest,
            RoleName requestedRole
    ) {
        AuthResponse authResponse = generateAuthResponse(user, httpRequest, requestedRole);
        return new GoogleAuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                picture,
                authResponse.accessToken(),
                authResponse.refreshToken(),
                isNewUser,
                needsProfileCompletion(user),
                authResponse.needsTutorOnboarding(),
                authResponse.roles(),
                authResponse.activeRole(),
                GOOGLE_AUTH_STATUS_AUTHENTICATED,
                null
        );
    }

    private GoogleAuthResponse pendingGoogleOtpChallengeResponse(User user, String picture, String fallbackName) {
        List<RoleName> roles = getActiveRoles(user);
        return new GoogleAuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName() == null || user.getName().isBlank() ? fallbackName : user.getName(),
                picture,
                null,
                null,
                false,
                needsProfileCompletion(user),
                needsTutorOnboarding(user),
                roles,
                null,
                GOOGLE_AUTH_STATUS_PENDING_LINK_OTP,
                user.getEmail()
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
        userRoleService.ensureActiveRole(user, RoleName.STUDENT, user);
        tutorInvitationService.acceptPendingInvitation(user);
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

    private boolean needsTutorOnboarding(User user) {
        boolean isTutor = userRoleRepository.hasRole(user.getId(), RoleName.TUTOR, UserRoleStatus.ACTIVE);
        if (!isTutor) {
            return false;
        }
        return tutorBankAccountRepository.countByUserId(user.getId()) == 0;
    }

    private List<RoleName> getActiveRoles(User user) {
        return userRoleRepository.findByUserIdAndStatus(user.getId(), UserRoleStatus.ACTIVE)
                .stream()
                .map(UserRole::getRole)
                .map(role -> role.getName())
                .distinct()
                .toList();
    }

    private RoleName resolveDefaultActiveRole(List<RoleName> roles) {
        if (roles.contains(RoleName.ADMIN)) {
            return RoleName.ADMIN;
        }
        if (roles.contains(RoleName.TUTOR)) {
            return RoleName.TUTOR;
        }
        return RoleName.STUDENT;
    }

    private RoleName roleOrThrow(User user, RoleName roleName) {
        boolean hasRole = userRoleRepository.hasRole(user.getId(), roleName, UserRoleStatus.ACTIVE);
        if (!hasRole) {
            throw new ApiException("Forbidden for role " + roleName);
        }
        return roleName;
    }

    private RoleName parseRoleName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return RoleName.valueOf(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private void verifyOtpOrThrow(String email, OtpPurpose purpose, String rawOtp) {
        String normalizedEmail = normalizeEmail(email);
        String purposeKey = purpose.name();

        Optional<String> maybeHash = otpRedisService.getOtpHash(normalizedEmail, purposeKey);
        if (maybeHash.isEmpty()) {
            throw new ApiException("Invalid or expired OTP");
        }

        long attempts = otpRedisService.incrementAttempts(
                normalizedEmail,
                purposeKey,
                java.time.Duration.ofMinutes(OTP_EXPIRY_MINUTES)
        );
        if (attempts > OTP_MAX_ATTEMPTS) {
            otpRedisService.clearOtp(normalizedEmail, purposeKey);
            throw new ApiException("Too many attempts");
        }

        String expectedHash = maybeHash.get();
        String actualHash = hashOtp(rawOtp);
        if (!actualHash.equals(expectedHash)) {
            throw new ApiException("Invalid or expired OTP");
        }

        otpRedisService.clearOtp(normalizedEmail, purposeKey);
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
