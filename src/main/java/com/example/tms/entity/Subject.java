package com.example.tms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "subjects")
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    @Column(name = "id", nullable = false, unique = true, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "default_price_per_hour", nullable = false, precision = 10, scale = 2)
    private BigDecimal defaultPricePerHour;
}
