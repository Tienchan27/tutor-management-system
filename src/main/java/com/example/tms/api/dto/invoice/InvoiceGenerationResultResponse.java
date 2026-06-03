package com.example.tms.api.dto.invoice;

import java.time.YearMonth;
import java.util.List;

public record InvoiceGenerationResultResponse(
        YearMonth month,
        int createdCount,
        int skippedCount,
        List<StudentInvoiceResponse> invoices
) {
}
