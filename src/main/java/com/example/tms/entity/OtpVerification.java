package com.example.tms.entity;

import com.example.tms.entity.enums.OtpPurpose;
import com.example.tms.entity.enums.OtpStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "otp_verifications")
public class OtpVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    @Column(name = "id", nullable = false, unique = true, updatable = false)
    private UUID id;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private OtpPurpose purpose;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OtpStatus status = OtpStatus.ACTIVE;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
