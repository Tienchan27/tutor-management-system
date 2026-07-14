package com.example.tms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Best-effort Redis blacklist for rotated refresh tokens.
 * Fail-open on Redis errors is intentional: DB {@code revoked} flags and single-use
 * rotation remain the authoritative controls. A Redis outage must not block refresh.
 */
@Service
public class RefreshTokenRedisService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenRedisService.class);

    private final RedisTemplate<String, String> redisTemplate;
    private final String keyPrefix;

    public RefreshTokenRedisService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.keyPrefix = "tms:";
    }

    private String blacklistKey(String tokenHash) {
        return keyPrefix + "rt:blacklist:" + tokenHash;
    }

    /** Stores a blacklist entry; swallows Redis failures (fail-open). */
    public void blacklist(String tokenHash, Duration ttl) {
        if (ttl.isNegative() || ttl.isZero()) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(blacklistKey(tokenHash), "1", ttl);
        } catch (Exception ex) {
            log.warn("REFRESH_BLACKLIST_STORE_FAILED: {}", ex.getMessage());
        }
    }

    /**
     * Returns whether the token hash is blacklisted.
     * On Redis errors returns {@code false} (fail-open) so refresh can still use DB checks.
     */
    public boolean isBlacklisted(String tokenHash) {
        try {
            String value = redisTemplate.opsForValue().get(blacklistKey(tokenHash));
            return value != null;
        } catch (Exception ex) {
            log.warn("REFRESH_BLACKLIST_CHECK_FAILED: {}", ex.getMessage());
            return false;
        }
    }
}
