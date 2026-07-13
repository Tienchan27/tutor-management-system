package com.example.tms;

import com.example.tms.entity.enums.OtpPurpose;
import com.example.tms.exception.ApiException;
import com.example.tms.service.MailService;
import com.example.tms.service.OtpRedisService;
import com.example.tms.service.OtpService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OtpServiceTests {

    @Mock private OtpRedisService otpRedisService;
    @Mock private MailService mailService;

    private OtpService service() {
        return new OtpService(otpRedisService, mailService);
    }

    @Test
    void issueOtp_redisStoreFailureDoesNotSendEmail() {
        when(otpRedisService.incrementSendCount(eq("student@example.com"), eq("REGISTER"), any()))
                .thenReturn(1L);
        doThrow(authDependencyUnavailable()).when(otpRedisService)
                .storeOtp(eq("student@example.com"), eq("REGISTER"), any(), any());

        ApiException ex = assertThrows(ApiException.class,
                () -> service().issueOtp("student@example.com", OtpPurpose.REGISTER, true));

        assertEquals("AUTH_DEPENDENCY_UNAVAILABLE", ex.getErrorCode());
        verify(mailService, never()).sendOtpEmail(any(), any());
    }

    @Test
    void verifyOtp_readFailurePropagatesDependencyError() {
        when(otpRedisService.getOtpHash("student@example.com", "REGISTER"))
                .thenThrow(authDependencyUnavailable());

        ApiException ex = assertThrows(ApiException.class,
                () -> service().verifyOtpOrThrow("student@example.com", OtpPurpose.REGISTER, "123456"));

        assertEquals("AUTH_DEPENDENCY_UNAVAILABLE", ex.getErrorCode());
    }

    @Test
    void verifyOtp_attemptIncrementFailurePropagatesDependencyError() {
        when(otpRedisService.getOtpHash("student@example.com", "REGISTER"))
                .thenReturn(Optional.of(hash("123456")));
        when(otpRedisService.incrementAttempts(eq("student@example.com"), eq("REGISTER"), any()))
                .thenThrow(authDependencyUnavailable());

        ApiException ex = assertThrows(ApiException.class,
                () -> service().verifyOtpOrThrow("student@example.com", OtpPurpose.REGISTER, "123456"));

        assertEquals("AUTH_DEPENDENCY_UNAVAILABLE", ex.getErrorCode());
    }

    private ApiException authDependencyUnavailable() {
        return new ApiException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "AUTH_DEPENDENCY_UNAVAILABLE",
                "Authentication service is temporarily unavailable. Please try again later."
        );
    }

    private String hash(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(otp.getBytes()));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
