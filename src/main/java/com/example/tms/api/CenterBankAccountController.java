package com.example.tms.api;

import com.example.tms.api.dto.bank.CenterBankAccountResponse;
import com.example.tms.api.dto.bank.UpdateCenterBankAccountRequest;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.CenterBankAccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/center-account")
public class CenterBankAccountController {
    private final CenterBankAccountService centerBankAccountService;
    private final CurrentUserResolver currentUserResolver;

    public CenterBankAccountController(
            CenterBankAccountService centerBankAccountService,
            CurrentUserResolver currentUserResolver
    ) {
        this.centerBankAccountService = centerBankAccountService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping
    public CenterBankAccountResponse get() {
        return centerBankAccountService.get();
    }

    /** Prefill suggestion only — does not persist the center account. */
    @GetMapping("/prefill-from-primary")
    public CenterBankAccountResponse prefillFromPrimary() {
        return centerBankAccountService.prefillFromPrimary(currentUserResolver.requireUser());
    }

    @PutMapping
    public CenterBankAccountResponse update(@Valid @RequestBody UpdateCenterBankAccountRequest request) {
        return centerBankAccountService.update(currentUserResolver.requireUser(), request);
    }
}
