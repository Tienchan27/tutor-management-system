package com.example.tms.service;

import com.example.tms.api.dto.auth.GoogleAuthRequest;
import com.example.tms.api.dto.auth.GoogleAuthResponse;
import com.example.tms.api.dto.auth.VerifyGoogleLinkOtpRequest;
import com.example.tms.entity.User;
import com.example.tms.entity.UserProvider;
import com.example.tms.entity.enums.OtpPurpose;
import com.example.tms.entity.enums.ProviderType;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.UserProviderRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.jpa.JpaObjectRetrievalFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GoogleAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthService.class);
    private static final String GOOGLE_AUTH_STATUS_AUTHENTICATED = "AUTHENTICATED";
    private static final String GOOGLE_AUTH_STATUS_PENDING_LINK_OTP = "PENDING_LINK_OTP";

    private final UserRepository userRepository;
    private final UserProviderRepository userProviderRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRoleService userRoleService;
    private final TutorInvitationService tutorInvitationService;
    private final OtpService otpService;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final String googleClientId;

    public GoogleAuthService(
            UserRepository userRepository,
            UserProviderRepository userProviderRepository,
            UserRoleRepository userRoleRepository,
            UserRoleService userRoleService,
            TutorInvitationService tutorInvitationService,
            OtpService otpService,
            TokenService tokenService,
            PasswordEncoder passwordEncoder,
            @Value("${GOOGLE_CLIENT_ID}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.userProviderRepository = userProviderRepository;
        this.userRoleRepository = userRoleRepository;
        this.userRoleService = userRoleService;
        this.tutorInvitationService = tutorInvitationService;
        this.otpService = otpService;
        this.tokenService = tokenService;
        this.passwordEncoder = passwordEncoder;
        this.googleClientId = googleClientId;
    }

    @Transactional
    public GoogleAuthResponse googleLogin(GoogleAuthRequest request, HttpServletRequest httpRequest) {
        GoogleIdToken.Payload payload = verifyGoogleToken(request.idToken());
        String googleUserId = payload.getSubject();
        String email = normalizeEmail(payload.getEmail());
        String picture = Optional.ofNullable(payload.get("picture")).map(Object::toString).orElse(null);
        String name = sanitizeName((String) payload.get("name"));

        Optional<UserProvider> providerOptional = userProviderRepository.findValidByProviderAndProviderId(
                ProviderType.GOOGLE, googleUserId);

        if (providerOptional.isEmpty()
                && userProviderRepository.existsByProviderAndProviderId(ProviderType.GOOGLE, googleUserId)) {
            userProviderRepository.deleteByProviderAndProviderId(ProviderType.GOOGLE, googleUserId);
        }

        if (providerOptional.isPresent()) {
            User user = providerOptional.get().getUser();
            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new ApiException("Account not active");
            }
            return buildAuthResponse(user, picture, false, httpRequest, null);
        }

        Optional<User> existingUserOptional = userRepository.findByEmail(email);
        if (existingUserOptional.isPresent()) {
            User existingUser = existingUserOptional.get();
            if (existingUser.getPassword() != null && !existingUser.getPassword().isBlank()) {
                otpService.issueOtp(email, OtpPurpose.GOOGLE_LINK, false);
                log.info("Google link OTP challenge issued for email {}", email);
                return pendingOtpChallengeResponse(existingUser, picture, name);
            }
            if (existingUser.getStatus() != UserStatus.ACTIVE) {
                existingUser.setStatus(UserStatus.ACTIVE);
                existingUser = userRepository.save(existingUser);
            }
            createProviderLink(existingUser, googleUserId);
            return buildAuthResponse(existingUser, picture, false, httpRequest, null);
        }

        User oauthUser = createOAuthUser(name, email);
        createProviderLink(oauthUser, googleUserId);
        return buildAuthResponse(oauthUser, picture, true, httpRequest, null);
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

        otpService.verifyOtpOrThrow(email, OtpPurpose.GOOGLE_LINK, request.otp());

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
        return buildAuthResponse(user, picture, false, httpRequest, null);
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

    private GoogleAuthResponse buildAuthResponse(
            User user, String picture, boolean isNewUser, HttpServletRequest httpRequest, RoleName requestedRole
    ) {
        var authResponse = tokenService.issueTokenPair(user, httpRequest, requestedRole);
        return new GoogleAuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                picture,
                authResponse.accessToken(),
                authResponse.refreshToken(),
                isNewUser,
                authResponse.needsProfileCompletion(),
                authResponse.needsTutorOnboarding(),
                authResponse.roles(),
                authResponse.activeRole(),
                GOOGLE_AUTH_STATUS_AUTHENTICATED,
                null
        );
    }

    private GoogleAuthResponse pendingOtpChallengeResponse(User user, String picture, String fallbackName) {
        List<RoleName> roles = userRoleRepository
                .findByUserIdAndStatus(user.getId(), UserRoleStatus.ACTIVE)
                .stream()
                .map(ur -> ur.getRole().getName())
                .distinct()
                .toList();
        return new GoogleAuthResponse(
                user.getId(),
                user.getEmail(),
                user.getName() == null || user.getName().isBlank() ? fallbackName : user.getName(),
                picture,
                null,
                null,
                false,
                needsProfileCompletion(user),
                false,
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

    private boolean isEmailVerified(Object emailVerifiedClaim) {
        if (emailVerifiedClaim instanceof Boolean value) return value;
        if (emailVerifiedClaim instanceof String value) return Boolean.parseBoolean(value);
        return false;
    }

    private boolean needsProfileCompletion(User user) {
        boolean hasPhone = user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank();
        boolean hasFacebook = user.getFacebookUrl() != null && !user.getFacebookUrl().isBlank();
        return !hasPhone && !hasFacebook;
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
