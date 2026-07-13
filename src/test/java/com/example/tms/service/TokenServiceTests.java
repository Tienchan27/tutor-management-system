package com.example.tms.service;

import com.example.tms.entity.RefreshToken;
import com.example.tms.entity.Role;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.repository.RefreshTokenRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TokenServiceTests {

    private static final String JWT_SECRET =
            "tms-test-jwt-secret-key-minimum-256bits-please-change-1234567890abcd";

    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private RefreshTokenRedisService refreshTokenRedisService;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private TutorBankAccountRepository tutorBankAccountRepository;
    @Mock private HttpServletRequest request;

    private TokenService service() {
        return new TokenService(
                new JwtService(JWT_SECRET),
                refreshTokenRepository,
                refreshTokenRedisService,
                userRoleRepository,
                tutorBankAccountRepository
        );
    }

    @Test
    void issueTokenPair_usesOpaqueRefreshTokenAndStoresOnlyHashWithActiveRole() {
        User user = user(RoleName.TUTOR);
        when(userRoleRepository.findByUserIdAndStatus(user.getId(), UserRoleStatus.ACTIVE))
                .thenReturn(List.of(userRole(user, RoleName.TUTOR)));
        when(userRoleRepository.hasRole(user.getId(), RoleName.TUTOR, UserRoleStatus.ACTIVE)).thenReturn(true);

        var response = service().issueTokenPair(user, request, RoleName.TUTOR);

        assertFalse(response.refreshToken().contains("."));
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();
        assertEquals(hash(response.refreshToken()), saved.getTokenHash());
        assertNotEquals(response.refreshToken(), saved.getTokenHash());
        assertEquals(RoleName.TUTOR, saved.getActiveRole());
    }

    @Test
    void refresh_usesStoredActiveRoleAndRotatesOpaqueToken() {
        User user = user(RoleName.TUTOR);
        String oldRefreshToken = "old-refresh-token-secret";
        RefreshToken existing = new RefreshToken();
        existing.setUser(user);
        existing.setTokenHash(hash(oldRefreshToken));
        existing.setActiveRole(RoleName.TUTOR);
        existing.setExpiresAt(LocalDateTime.now().plusDays(1));
        when(refreshTokenRedisService.isBlacklisted(hash(oldRefreshToken))).thenReturn(false);
        when(refreshTokenRepository.findByTokenHashAndRevokedFalseForUpdate(hash(oldRefreshToken)))
                .thenReturn(Optional.of(existing));
        when(userRoleRepository.findByUserIdAndStatus(user.getId(), UserRoleStatus.ACTIVE))
                .thenReturn(List.of(userRole(user, RoleName.TUTOR)));
        when(userRoleRepository.hasRole(user.getId(), RoleName.TUTOR, UserRoleStatus.ACTIVE)).thenReturn(true);

        var response = service().refresh(oldRefreshToken, request);

        assertTrue(existing.isRevoked());
        assertEquals(RoleName.TUTOR, response.activeRole());
        assertFalse(response.refreshToken().contains("."));
        assertNotEquals(oldRefreshToken, response.refreshToken());
        verify(refreshTokenRepository).saveAndFlush(existing);
    }

    private User user(RoleName roleName) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(roleName.name().toLowerCase() + "@example.com");
        user.setName(roleName.name());
        return user;
    }

    private UserRole userRole(User user, RoleName roleName) {
        Role role = new Role();
        role.setName(roleName);
        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRole.setStatus(UserRoleStatus.ACTIVE);
        return userRole;
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes()));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
