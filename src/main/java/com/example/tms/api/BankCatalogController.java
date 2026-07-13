package com.example.tms.api;

import com.example.tms.api.dto.bank.BankCatalogResponse;
import com.example.tms.service.BankCatalogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class BankCatalogController {
    private final BankCatalogService bankCatalogService;

    public BankCatalogController(BankCatalogService bankCatalogService) {
        this.bankCatalogService = bankCatalogService;
    }

    /** Bank list for pickers (any authenticated user). */
    @GetMapping("/bank-catalog")
    public List<BankCatalogResponse> list() {
        return bankCatalogService.list();
    }

    /**
     * Authenticated: populate the catalog once if empty (used by bank pickers / onboarding).
     * Returns {@code synced} count (0 when already populated).
     */
    @PostMapping("/bank-catalog/ensure")
    public Map<String, Integer> ensure() {
        return Map.of("synced", bankCatalogService.ensureSynced());
    }

    /** Admin-only: refresh the catalog from the provider (vietqr.io). */
    @PostMapping("/admin/bank-catalog/sync")
    public Map<String, Integer> sync() {
        return Map.of("synced", bankCatalogService.sync());
    }
}
