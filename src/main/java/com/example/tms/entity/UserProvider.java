package com.example.tms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(
    name = "user_providers",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "provider"}),
        @UniqueConstraint(columnNames = {"provider", "provider_id"})
    }
)
public class UserProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    @Column(name = "id", nullable = false, unique = true, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "provider_id", nullable = false)
    private String providerId;
}
