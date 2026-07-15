package com.example.tms.payment;

import com.example.tms.service.StudentInvoiceService;
import org.springframework.stereotype.Component;

import java.util.UUID;


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
