package com.example.tms.service;

import com.example.tms.entity.enums.OtpPurpose;
import com.example.tms.exception.ApiException;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class OtpService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int OTP_MAX_ATTEMPTS = 5;
    private static final int OTP_RESEND_COOLDOWN_SECONDS = 60;

    private final OtpRedisService otpRedisService;
    private final MailService mailService;

    public OtpService(OtpRedisService otpRedisService, MailService mailService) {
        this.otpRedisService = otpRedisService;
        this.mailService = mailService;
    }

    public void issueOtp(String normalizedEmail, OtpPurpose purpose, boolean strictCooldown) {
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

    public void verifyOtpOrThrow(String normalizedEmail, OtpPurpose purpose, String rawOtp) {
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

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(otp.getBytes()));
        } catch (Exception ex) {
            throw new ApiException("Failed to hash OTP");
        }
    }
}
