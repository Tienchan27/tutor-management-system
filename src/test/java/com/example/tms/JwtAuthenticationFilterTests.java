package com.example.tms;

import com.example.tms.entity.User;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.security.JwtAuthenticationFilter;
import com.example.tms.security.JwtService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTests {

    private static final String JWT_SECRET =
            "tms-test-jwt-secret-key-minimum-256bits-please-change-1234567890abcd";

    @Mock private UserRoleRepository userRoleRepository;
    @Mock private UserRepository userRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void accessTokenGrantsOnlyActiveRoleAuthority() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtService().generateAccessToken(userId, "admin@example.com", RoleName.ADMIN.name());
        User user = activeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRoleRepository.hasRole(userId, RoleName.ADMIN, UserRoleStatus.ACTIVE)).thenReturn(true);

        filter().doFilter(requestWithBearer(token), new MockHttpServletResponse(), noopChain());

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertTrue(authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
        assertFalse(authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TUTOR")));
    }

    @Test
    void switchedTutorTokenGrantsTutorAuthority() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtService().generateAccessToken(userId, "tutor@example.com", RoleName.TUTOR.name());
        User user = activeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRoleRepository.hasRole(userId, RoleName.TUTOR, UserRoleStatus.ACTIVE)).thenReturn(true);

        filter().doFilter(requestWithBearer(token), new MockHttpServletResponse(), noopChain());

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertTrue(authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TUTOR")));
        assertFalse(authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void revokedActiveRoleDoesNotAuthenticateRequest() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = jwtService().generateAccessToken(userId, "tutor@example.com", RoleName.TUTOR.name());
        User user = activeUser(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRoleRepository.hasRole(userId, RoleName.TUTOR, UserRoleStatus.ACTIVE)).thenReturn(false);

        filter().doFilter(requestWithBearer(token), new MockHttpServletResponse(), noopChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private JwtAuthenticationFilter filter() {
        return new JwtAuthenticationFilter(jwtService(), userRoleRepository, userRepository);
    }

    private JwtService jwtService() {
        return new JwtService(JWT_SECRET);
    }

    private User activeUser(UUID userId) {
        User user = new User();
        user.setId(userId);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private MockHttpServletRequest requestWithBearer(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    private FilterChain noopChain() {
        return (request, response) -> {
        };
    }
}
