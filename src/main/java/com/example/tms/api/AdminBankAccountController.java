package com.example.tms.api;

import com.example.tms.api.dto.bank.BankAccountResponse;
import com.example.tms.api.dto.bank.VerifyBankAccountRequest;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.BankAccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/bank-accounts")
public class AdminBankAccountController {
    private final BankAccountService bankAccountService;
    private final CurrentUserResolver currentUserResolver;

    public AdminBankAccountController(BankAccountService bankAccountService, CurrentUserResolver currentUserResolver) {
        this.bankAccountService = bankAccountService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/{id}/verify")
    public BankAccountResponse verifyBankAccount(
            @PathVariable UUID id,
            @Valid @RequestBody VerifyBankAccountRequest request
    ) {
        return bankAccountService.verifyBankAccount(currentUserResolver.requireUserId(), id, request);
    }

    @GetMapping("/pending")
    public List<BankAccountResponse> listPendingVerifications() {
        return bankAccountService.listPendingVerifications();
    }
}
