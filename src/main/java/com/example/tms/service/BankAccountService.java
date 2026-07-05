package com.example.tms.service;

import com.example.tms.api.dto.bank.BankAccountResponse;
import com.example.tms.api.dto.bank.CreateBankAccountRequest;
import com.example.tms.api.dto.bank.UpdateBankAccountRequest;
import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.User;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BankAccountService {
    private final TutorBankAccountRepository bankAccountRepository;
    private final UserRepository userRepository;

    public BankAccountService(TutorBankAccountRepository bankAccountRepository, UserRepository userRepository) {
        this.bankAccountRepository = bankAccountRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public BankAccountResponse createBankAccount(UUID userId, CreateBankAccountRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found"));

        // Check if user already has a primary account
        boolean hasPrimary = bankAccountRepository.existsByUserIdAndIsPrimaryTrue(userId);

        TutorBankAccount account = new TutorBankAccount();
        account.setUser(user);
        account.setBankName(request.bankName());
        account.setAccountNumber(request.accountNumber());
        account.setAccountHolderName(request.accountHolderName());
        account.setBankBin(request.bankBin());
        account.setBankCode(request.bankCode());
        account.setPrimary(!hasPrimary); // First account is primary, others are not
        account.setVerified(true);
        account.setVerifiedAt(LocalDateTime.now());

        account = bankAccountRepository.save(account);
        return mapToResponse(account);
    }

    public List<BankAccountResponse> listMyBankAccounts(UUID userId) {
        List<TutorBankAccount> accounts = bankAccountRepository
                .findByUserIdOrderByIsPrimaryDescCreatedAtDesc(userId);
        return accounts.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public BankAccountResponse setPrimaryAccount(UUID userId, UUID accountId) {
        TutorBankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> ApiException.notFound("BANK_ACCOUNT_NOT_FOUND", "Bank account not found"));

        if (!account.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("FORBIDDEN", "Not authorized to modify this account");
        }

        if (account.isPrimary()) {
            throw ApiException.conflict("ALREADY_PRIMARY", "This account is already primary");
        }

        // Unset current primary account
        bankAccountRepository.findByUserIdAndIsPrimaryTrue(userId)
                .ifPresent(currentPrimary -> {
                    currentPrimary.setPrimary(false);
                    bankAccountRepository.save(currentPrimary);
                });

        // Set new primary
        account.setPrimary(true);
        account = bankAccountRepository.save(account);

        return mapToResponse(account);
    }

    @Transactional
    public BankAccountResponse updateBankAccount(UUID userId, UUID accountId, UpdateBankAccountRequest request) {
        TutorBankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> ApiException.notFound("BANK_ACCOUNT_NOT_FOUND", "Bank account not found"));

        if (!account.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("FORBIDDEN", "Not authorized to modify this account");
        }

        // Account number / primary / verified are preserved; this only attaches the correct bank + BIN.
        account.setBankBin(request.bankBin());
        account.setBankCode(request.bankCode());
        account.setBankName(request.bankName());
        account.setAccountHolderName(request.accountHolderName());
        return mapToResponse(bankAccountRepository.save(account));
    }

    @Transactional
    public void deleteBankAccount(UUID userId, UUID accountId) {
        TutorBankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> ApiException.notFound("BANK_ACCOUNT_NOT_FOUND", "Bank account not found"));

        if (!account.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("FORBIDDEN", "Not authorized to delete this account");
        }

        if (account.isPrimary()) {
            long totalAccounts = bankAccountRepository.countByUserId(userId);
            if (totalAccounts == 1) {
                throw ApiException.conflict("LAST_BANK_ACCOUNT", "Cannot delete the only bank account. Add another account first.");
            }
        }

        bankAccountRepository.delete(account);
    }

    // === ADMIN METHODS ===

    private BankAccountResponse mapToResponse(TutorBankAccount account) {
        return new BankAccountResponse(
                account.getId(),
                account.getBankName(),
                account.getBankBin(),
                account.getMaskedAccountNumber(),
                account.getAccountHolderName(),
                account.isPrimary(),
                account.isVerified(),
                account.getVerifiedAt(),
                account.getCreatedAt()
        );
    }
}
