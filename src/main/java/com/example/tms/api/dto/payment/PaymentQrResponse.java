package com.example.tms.api.dto.payment;

/**
 * Everything the frontend needs to render a scannable VietQR and show the human
 * details next to it. Shared by tuition (inbound) and payout (outbound).
 */
public record PaymentQrResponse(
        String qrPayload,
        String qrRef,
        String bankName,
        String accountNumber,
        String accountHolderName,
        Long amount,
        String description
) {
}
