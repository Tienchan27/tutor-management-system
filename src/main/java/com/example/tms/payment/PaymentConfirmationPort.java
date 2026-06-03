package com.example.tms.payment;

import java.util.UUID;

/**
 * Future hook for bank webhook / payment confirmation (Phase 2+).
 */
public interface PaymentConfirmationPort {
    void confirmStudentPayment(UUID invoiceId, String externalReference, long amountVnd);
}
