package com.example.tms.repository;

import com.example.tms.entity.RefreshToken;
import com.example.tms.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHashAndRevokedFalse(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT rt FROM RefreshToken rt WHERE rt.tokenHash = :tokenHash AND rt.revoked = false")
    Optional<RefreshToken> findByTokenHashAndRevokedFalseForUpdate(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :revokedAt WHERE rt.user = :user AND rt.revoked = false")
    void revokeAllByUser(User user, LocalDateTime revokedAt);

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now OR (rt.revoked = true AND rt.revokedAt < :cleanupDate)")
    void deleteExpiredAndOldRevoked(LocalDateTime now, LocalDateTime cleanupDate);
}
