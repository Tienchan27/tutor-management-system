package com.example.tms;

import com.example.tms.api.dto.auth.LoginRequest;
import com.example.tms.api.dto.auth.RegisterRequest;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.UserRepository;
import com.example.tms.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class AuthServiceTests {
    @Autowired
    private AuthService authService;
    @Autowired
    private UserRepository userRepository;

    @Test
    void registerCreatesPendingUser() {
        authService.register(new RegisterRequest("Student One", "student1@example.com", "password123"));
        User user = userRepository.findByEmail("student1@example.com").orElseThrow();
        assertEquals(UserStatus.PENDING_VERIFICATION, user.getStatus());
        assertTrue(user.getPassword() != null && !user.getPassword().isBlank());
    }

    @Test
    void forgotPassword_unknownEmail_doesNotThrow() {
        authService.forgotPassword("nobody-at-all-xyz@example.com");
    }

    @Test
    void forgotPassword_allowsUserWithoutPassword() {
        User user = new User();
        user.setName("OAuth Only");
        user.setEmail("oauth-only@example.com");
        user.setPassword(null);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        authService.forgotPassword("oauth-only@example.com");
    }

    @Test
    void resetPassword_invalidOtp_throws() {
        authService.register(new RegisterRequest("R Two", "student2@example.com", "password123"));
        assertThrows(ApiException.class, () -> authService.resetPassword("student2@example.com", "000000", "newpass12345"));
    }

    @Test
    void login_invalidEmail_throwsWithCode() {
        ApiException ex = assertThrows(
                ApiException.class,
                () -> authService.login(new LoginRequest("unknown-at-all@example.com", "password123"), new MockHttpServletRequest())
        );
        assertEquals("INVALID_EMAIL", ex.getErrorCode());
    }

    @Test
    void login_wrongPassword_throwsWithCode() {
        authService.register(new RegisterRequest("Student One", "student-wrongpass@example.com", "password123"));

        ApiException ex = assertThrows(
                ApiException.class,
                () -> authService.login(new LoginRequest("student-wrongpass@example.com", "wrongPassword123"), new MockHttpServletRequest())
        );
        assertEquals("INVALID_PASSWORD", ex.getErrorCode());
    }

    @Test
    void login_pendingVerification_throwsWithCode() {
        authService.register(new RegisterRequest("Student One", "student-pending@example.com", "password123"));

        ApiException ex = assertThrows(
                ApiException.class,
                () -> authService.login(new LoginRequest("student-pending@example.com", "password123"), new MockHttpServletRequest())
        );
        assertEquals("PENDING_VERIFICATION", ex.getErrorCode());
    }
}
