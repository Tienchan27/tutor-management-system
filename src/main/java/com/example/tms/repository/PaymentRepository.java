package com.example.tms.repository;

import com.example.tms.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    boolean existsByReference(String reference);

    Optional<Payment> findByReference(String reference);
}
