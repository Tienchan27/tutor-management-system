package com.example.tms.service;

import com.example.tms.api.dto.bank.BankCatalogResponse;
import com.example.tms.entity.BankCatalogEntry;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.BankCatalogRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BankCatalogService {
    private final BankCatalogRepository repository;
    private final RestClient vietQrRestClient;

    public BankCatalogService(BankCatalogRepository repository, RestClient vietQrRestClient) {
        this.repository = repository;
        this.vietQrRestClient = vietQrRestClient;
    }

    @Cacheable("bankCatalog")
    @Transactional(readOnly = true)
    public List<BankCatalogResponse> list() {
        return repository.findAllByOrderByShortNameAsc().stream()
                .map(e -> new BankCatalogResponse(e.getBin(), e.getCode(), e.getShortName(), e.getName(),
                        e.getLogoUrl(), e.isTransferSupported()))
                .toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "bankCatalog", allEntries = true)
    public int sync() {
        VietQrBanksResponse response;
        try {
            response = vietQrRestClient.get().uri("/v2/banks").retrieve().body(VietQrBanksResponse.class);
        } catch (RestClientException ex) {
            throw ApiException.conflict("BANK_SYNC_FAILED", "Could not reach the bank provider");
        }
        if (response == null || response.data() == null || response.data().isEmpty()) {
            throw ApiException.conflict("BANK_SYNC_EMPTY", "Bank provider returned no data");
        }

        LocalDateTime now = LocalDateTime.now();
        int count = 0;
        for (VietQrBank bank : response.data()) {
            if (bank.bin() == null || bank.bin().isBlank()) {
                continue;
            }
            BankCatalogEntry entry = repository.findById(bank.bin()).orElseGet(BankCatalogEntry::new);
            entry.setBin(bank.bin());
            entry.setCode(bank.code());
            entry.setShortName(bank.shortName() != null ? bank.shortName() : bank.name());
            entry.setName(bank.name());
            entry.setLogoUrl(bank.logo());
            entry.setTransferSupported(isOne(bank.transferSupported()));
            entry.setLookupSupported(isOne(bank.lookupSupported()));
            entry.setUpdatedAt(now);
            repository.save(entry);
            count++;
        }
        return count;
    }

    /** Load a catalog entry that can actually receive transfers (else generating a QR is pointless). */
    @Transactional(readOnly = true)
    public BankCatalogEntry requireTransferable(String bin) {
        BankCatalogEntry entry = repository.findById(bin)
                .orElseThrow(() -> ApiException.notFound("BANK_NOT_FOUND", "Bank is not in the catalog"));
        if (!entry.isTransferSupported()) {
            throw ApiException.conflict("BANK_NOT_TRANSFERABLE", "This bank does not support incoming transfers");
        }
        return entry;
    }

    private static boolean isOne(Integer value) {
        return value != null && value == 1;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VietQrBanksResponse(List<VietQrBank> data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VietQrBank(
            String bin,
            String code,
            String shortName,
            String name,
            String logo,
            Integer transferSupported,
            Integer lookupSupported
    ) {
    }
}
