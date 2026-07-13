package com.example.tms.service;

import com.example.tms.api.dto.auth.AuthResponse;
import com.example.tms.entity.RefreshToken;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.RefreshTokenRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class TokenService {
    private static final int REFRESH_TOKEN_BYTES = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenRedisService refreshTokenRedisService;
    private final UserRoleRepository userRoleRepository;
    private final TutorBankAccountRepository tutorBankAccountRepository;

    public TokenService(
            JwtService jwtService,
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenRedisService refreshTokenRedisService,
            UserRoleRepository userRoleRepository,
            TutorBankAccountRepository tutorBankAccountRepository
    ) {
        this.jwtService = jwtService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenRedisService = refreshTokenRedisService;
        this.userRoleRepository = userRoleRepository;
        this.tutorBankAccountRepository = tutorBankAccountRepository;
    }

    @Transactional
    public AuthResponse issueTokenPair(User user, HttpServletRequest request) {
        return issueTokenPair(user, request, null);
    }

    @Transactional
    public AuthResponse issueTokenPair(User user, HttpServletRequest request, RoleName requestedRole) {
        List<RoleName> roles = getActiveRoles(user);
        if (roles.isEmpty()) {
            roles = List.of(RoleName.STUDENT);
        }
        RoleName activeRole = requestedRole == null
                ? resolveDefaultActiveRole(roles)
                : roleOrThrow(user, requestedRole);

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), activeRole.name());
        String refreshToken = generateOpaqueRefreshToken();

        RefreshToken token = new RefreshToken();
        token.setTokenHash(hashToken(refreshToken));
        token.setUser(user);
        token.setActiveRole(activeRole);
        token.setExpiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshTokenTtlSeconds()));
        token.setIpAddress(request.getRemoteAddr());
        token.setUserAgent(request.getHeader("User-Agent"));
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

    @Transactional
    public AuthResponse refresh(String refreshTokenValue, HttpServletRequest request) {
        String tokenHash = hashToken(refreshTokenValue);
        if (refreshTokenRedisService.isBlacklisted(tokenHash)) {
            throw new ApiException("Invalid refresh token");
        }
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHashAndRevokedFalseForUpdate(tokenHash)
                .orElseThrow(() -> new ApiException("Invalid refresh token"));

        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException("Refresh token expired");
        }

        User user = refreshToken.getUser();
        RoleName requestedRole = refreshToken.getActiveRole();
        if (requestedRole == null) {
            throw new ApiException("Invalid refresh token");
        }

        refreshToken.setRevoked(true);
        refreshToken.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.saveAndFlush(refreshToken);

        java.time.Duration ttl = java.time.Duration.between(LocalDateTime.now(), refreshToken.getExpiresAt());
        if (!ttl.isNegative() && !ttl.isZero()) {
            refreshTokenRedisService.blacklist(tokenHash, ttl);
        }

        return issueTokenPair(user, request, requestedRole);
    }

    @Transactional
    public void revokeAll(User user) {
        refreshTokenRepository.revokeAllByUser(user, LocalDateTime.now());
    }

    String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes()));
        } catch (Exception ex) {
            throw new ApiException("Failed to hash token");
        }
    }

    private String generateOpaqueRefreshToken() {
        byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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
        if (roles.contains(RoleName.ADMIN)) return RoleName.ADMIN;
        if (roles.contains(RoleName.TUTOR)) return RoleName.TUTOR;
        return RoleName.STUDENT;
    }

    private RoleName roleOrThrow(User user, RoleName roleName) {
        boolean hasRole = userRoleRepository.hasRole(user.getId(), roleName, UserRoleStatus.ACTIVE);
        if (!hasRole) {
            throw new ApiException("Forbidden for role " + roleName);
        }
        return roleName;
    }

    private boolean needsProfileCompletion(User user) {
        boolean hasPhone = user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank();
        boolean hasFacebook = user.getFacebookUrl() != null && !user.getFacebookUrl().isBlank();
        return !hasPhone && !hasFacebook;
    }

    private boolean needsTutorOnboarding(User user) {
        boolean isTutor = userRoleRepository.hasRole(user.getId(), RoleName.TUTOR, UserRoleStatus.ACTIVE);
        if (!isTutor) return false;
        return tutorBankAccountRepository.countByUserId(user.getId()) == 0;
    }
}
