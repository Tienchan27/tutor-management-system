package com.example.tms.api.mapper;

import com.example.tms.api.dto.payout.TutorPayoutPaymentResponse;
import com.example.tms.api.dto.payout.TutorPayoutResponse;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.TutorPayoutPayment;

public final class PayoutMapper {

    private PayoutMapper() {
    }

    public static TutorPayoutResponse toResponse(TutorPayout payout) {
        return new TutorPayoutResponse(
                payout.getId(),
                UserRefMapper.toResponse(payout.getTutor()),
                payout.getYear(),
                payout.getMonth(),
                payout.getGrossRevenue(),
                payout.getNetSalary(),
                payout.getStatus().name(),
                payout.getPaidAt(),
                UserRefMapper.toResponse(payout.getPaidBy()),
                payout.getCreatedAt(),
                payout.getUpdatedAt()
        );
    }

    public static TutorPayoutPaymentResponse toPaymentResponse(TutorPayoutPayment payment) {
        return new TutorPayoutPaymentResponse(
                payment.getId(),
                toResponse(payment.getTutorPayout()),
                payment.getQrRef(),
                payment.getQrPayload(),
                payment.getStatus().name(),
                payment.getPaidAt(),
                payment.getCreatedAt()
        );
    }
}
