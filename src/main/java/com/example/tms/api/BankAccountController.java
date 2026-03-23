package com.example.tms.api;

import com.example.tms.api.dto.bank.BankAccountResponse;
import com.example.tms.api.dto.bank.CreateBankAccountRequest;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.BankAccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/bank-accounts")
public class BankAccountController {
    private final BankAccountService bankAccountService;
    private final CurrentUserResolver currentUserResolver;

    public BankAccountController(BankAccountService bankAccountService, CurrentUserResolver currentUserResolver) {
        this.bankAccountService = bankAccountService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public BankAccountResponse createBankAccount(@Valid @RequestBody CreateBankAccountRequest request) {
        return bankAccountService.createBankAccount(currentUserResolver.requireUserId(), request);
    }

    @GetMapping("/me")
    public List<BankAccountResponse> listMyBankAccounts() {
        return bankAccountService.listMyBankAccounts(currentUserResolver.requireUserId());
    }

    @PatchMapping("/{id}/set-primary")
    public BankAccountResponse setPrimaryAccount(@PathVariable UUID id) {
        return bankAccountService.setPrimaryAccount(currentUserResolver.requireUserId(), id);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteBankAccount(@PathVariable UUID id) {
        bankAccountService.deleteBankAccount(currentUserResolver.requireUserId(), id);
        return Map.of("message", "Bank account deleted successfully");
    }
}
