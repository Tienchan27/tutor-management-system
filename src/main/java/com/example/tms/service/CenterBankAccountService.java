package com.example.tms.service;

import com.example.tms.api.dto.bank.CenterBankAccountResponse;
import com.example.tms.api.dto.bank.UpdateCenterBankAccountRequest;
import com.example.tms.entity.BankCatalogEntry;
import com.example.tms.entity.CenterBankAccount;
import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.User;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.CenterBankAccountRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CenterBankAccountService {
    private final CenterBankAccountRepository repository;
    private final BankCatalogService bankCatalogService;
    private final TutorBankAccountRepository tutorBankAccountRepository;

    public CenterBankAccountService(
            CenterBankAccountRepository repository,
            BankCatalogService bankCatalogService,
            TutorBankAccountRepository tutorBankAccountRepository
    ) {
        this.repository = repository;
        this.bankCatalogService = bankCatalogService;
        this.tutorBankAccountRepository = tutorBankAccountRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public CenterBankAccountResponse get() {
        return repository.findFirstByOrderByUpdatedAtDesc()
                .map(this::toResponse)
                .orElse(null);
    }

    /**
     * Suggestion only — does not write {@code center_bank_account}.
     * Returns null when the admin has no primary bank with a transferable BIN.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public CenterBankAccountResponse prefillFromPrimary(User admin) {
        TutorBankAccount primary = tutorBankAccountRepository.findByUserIdAndIsPrimaryTrue(admin.getId())
                .orElse(null);
        if (primary == null || primary.getBankBin() == null || primary.getBankBin().isBlank()) {
            return null;
        }
        BankCatalogEntry bank = bankCatalogService.requireTransferable(primary.getBankBin());
        return new CenterBankAccountResponse(
                bank.getBin(),
                bank.getCode(),
                bank.getShortName(),
                primary.getAccountNumber(),
                primary.getAccountHolderName(),
                null
        );
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CenterBankAccountResponse update(User admin, UpdateCenterBankAccountRequest request) {
        BankCatalogEntry bank = bankCatalogService.requireTransferable(request.bankBin());

        CenterBankAccount account = repository.findFirstByOrderByUpdatedAtDesc()
                .orElseGet(CenterBankAccount::new);
        account.setBankBin(bank.getBin());
        account.setBankCode(bank.getCode());
        account.setBankName(bank.getShortName());
        account.setAccountNumber(request.accountNumber().trim());
        account.setAccountHolderName(request.accountHolderName().trim());
        account.setUpdatedBy(admin);
        return toResponse(repository.save(account));
    }

    /** Used when generating a tuition QR; fails clearly if the center account is not configured. */
    @Transactional(readOnly = true)
    public CenterBankAccount getRequired() {
        return repository.findFirstByOrderByUpdatedAtDesc()
                .orElseThrow(() -> ApiException.conflict("CENTER_ACCOUNT_NOT_SET",
                        "The center receiving account has not been configured"));
    }

    private CenterBankAccountResponse toResponse(CenterBankAccount account) {
        return new CenterBankAccountResponse(
                account.getBankBin(),
                account.getBankCode(),
                account.getBankName(),
                account.getAccountNumber(),
                account.getAccountHolderName(),
                account.getUpdatedAt()
        );
    }
}
