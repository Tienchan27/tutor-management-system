package com.example.tms.repository;

import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TutorBankAccountRepository extends JpaRepository<TutorBankAccount, UUID> {
    List<TutorBankAccount> findByUserIdOrderByIsPrimaryDescCreatedAtDesc(UUID userId);

    Optional<TutorBankAccount> findByUserAndIsPrimaryTrue(User user);

    Optional<TutorBankAccount> findByUserIdAndIsPrimaryTrue(UUID userId);

    List<TutorBankAccount> findByIsVerifiedFalseOrderByCreatedAtAsc();

    boolean existsByUserIdAndIsPrimaryTrue(UUID userId);

    long countByUserId(UUID userId);
}
