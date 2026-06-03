package com.example.tms.payment;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class NoOpPaymentConfirmationAdapter implements PaymentConfirmationPort {
    @Override
    public void confirmStudentPayment(UUID invoiceId, String externalReference, long amountVnd) {
        // Phase 1: no-op stub for future webhook integration.
    }
}
