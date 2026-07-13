package com.example.tms.service;

import com.example.tms.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
public class OtpRedisService {

    private static final Logger log = LoggerFactory.getLogger(OtpRedisService.class);

    private final RedisTemplate<String, String> redisTemplate;
    private final String keyPrefix;

    public OtpRedisService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.keyPrefix = "tms:";
    }

    private String codeKey(String email, String purpose) {
        return keyPrefix + "otp:code:" + email.toLowerCase() + ":" + purpose;
    }

    private String attemptsKey(String email, String purpose) {
        return keyPrefix + "otp:attempts:" + email.toLowerCase() + ":" + purpose;
    }

    private String sendKey(String email, String purpose) {
        return keyPrefix + "otp:send:" + email.toLowerCase() + ":" + purpose;
    }

    public void storeOtp(String email, String purpose, String otpHash, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(codeKey(email, purpose), otpHash, ttl);
        } catch (Exception ex) {
            log.warn("Failed to store OTP in Redis for email {} and purpose {}: {}", email, purpose, ex.getMessage());
            throw authDependencyUnavailable();
        }
    }

    public Optional<String> getOtpHash(String email, String purpose) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().get(codeKey(email, purpose)));
        } catch (Exception ex) {
            log.warn("Failed to read OTP from Redis for email {} and purpose {}: {}", email, purpose, ex.getMessage());
            throw authDependencyUnavailable();
        }
    }

    public long incrementAttempts(String email, String purpose, Duration ttl) {
        try {
            String key = attemptsKey(email, purpose);
            Long value = redisTemplate.opsForValue().increment(key);
            if (value == null) {
                throw authDependencyUnavailable();
            }
            if (value == 1L) {
                redisTemplate.expire(key, ttl);
            }
            return value;
        } catch (Exception ex) {
            log.warn("Failed to increment OTP attempts in Redis for email {} and purpose {}: {}", email, purpose, ex.getMessage());
            throw authDependencyUnavailable();
        }
    }

    public long incrementSendCount(String email, String purpose, Duration ttl) {
        try {
            String key = sendKey(email, purpose);
            Long value = redisTemplate.opsForValue().increment(key);
            if (value == null) {
                throw authDependencyUnavailable();
            }
            if (value == 1L) {
                redisTemplate.expire(key, ttl);
            }
            return value;
        } catch (Exception ex) {
            log.warn("Failed to increment OTP send count in Redis for email {} and purpose {}: {}", email, purpose, ex.getMessage());
            throw authDependencyUnavailable();
        }
    }

    public void clearOtp(String email, String purpose) {
        try {
            redisTemplate.delete(codeKey(email, purpose));
            redisTemplate.delete(attemptsKey(email, purpose));
        } catch (Exception ex) {
            log.warn("Failed to clear OTP keys in Redis for email {} and purpose {}: {}", email, purpose, ex.getMessage());
            throw authDependencyUnavailable();
        }
    }

    public Optional<Long> getSendCount(String email, String purpose) {
        try {
            String key = sendKey(email, purpose);
            String value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(value));
        } catch (Exception ex) {
            log.warn("Failed to read OTP send count from Redis for email {} and purpose {}: {}", email, purpose, ex.getMessage());
            throw authDependencyUnavailable();
        }
    }

    private ApiException authDependencyUnavailable() {
        return new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "AUTH_DEPENDENCY_UNAVAILABLE",
                "Authentication service is temporarily unavailable. Please try again later."
        );
    }
}

