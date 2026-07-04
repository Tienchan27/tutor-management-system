package com.example.tms.api.dto.bank;

public record BankCatalogResponse(
        String bin,
        String code,
        String shortName,
        String name,
        String logoUrl,
        boolean transferSupported
) {
}
