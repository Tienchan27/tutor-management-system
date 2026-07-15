package com.example.tms.payment;

import java.util.UUID;


public interface PaymentConfirmationPort {
    void confirmStudentPayment(UUID invoiceId, String externalReference, long amountVnd);
}
