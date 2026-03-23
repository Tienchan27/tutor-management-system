package com.example.tms.service;

import com.example.tms.repository.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class RefreshTokenCleanupScheduler {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleanupScheduler.class);
    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenCleanupScheduler(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Scheduled(cron = "0 30 2 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void cleanupExpiredAndRevokedTokens() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cleanupDate = now.minusDays(30);
        refreshTokenRepository.deleteExpiredAndOldRevoked(now, cleanupDate);
        log.info("Refresh token cleanup completed");
    }
}
