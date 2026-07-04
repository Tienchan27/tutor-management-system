package com.example.tms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A Vietnamese bank as published by vietqr.io. Seeded via an admin sync action;
 * never fetched at QR-generation time. {@code bin} is the NAPAS acquirer BIN.
 */
@Getter
@Setter
@Entity
@Table(name = "bank_catalog")
public class BankCatalogEntry {

    @Id
    @Column(name = "bin", nullable = false, length = 6, updatable = false)
    private String bin;

    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @Column(name = "short_name", nullable = false, length = 120)
    private String shortName;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "transfer_supported", nullable = false)
    private boolean transferSupported;

    @Column(name = "lookup_supported", nullable = false)
    private boolean lookupSupported;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
