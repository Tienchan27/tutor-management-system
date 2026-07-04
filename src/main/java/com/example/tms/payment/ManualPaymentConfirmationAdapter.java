package com.example.tms.payment;

import com.example.tms.service.StudentInvoiceService;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * The default {@link PaymentConfirmationPort} implementation. Marking an invoice
 * paid always flows through {@link StudentInvoiceService#applyExternalPayment} so
 * the manual admin confirm and a future bank webhook (Phase 2) share one code path.
 */
@Component
public class ManualPaymentConfirmationAdapter implements PaymentConfirmationPort {
    private final StudentInvoiceService studentInvoiceService;

    public ManualPaymentConfirmationAdapter(StudentInvoiceService studentInvoiceService) {
        this.studentInvoiceService = studentInvoiceService;
    }

    @Override
    public void confirmStudentPayment(UUID invoiceId, String externalReference, long amountVnd) {
        studentInvoiceService.applyExternalPayment(invoiceId, externalReference, amountVnd);
    }
}
