package com.example.tms.repository;

import com.example.tms.entity.CenterBankAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CenterBankAccountRepository extends JpaRepository<CenterBankAccount, UUID> {
    Optional<CenterBankAccount> findFirstByOrderByUpdatedAtDesc();
}
