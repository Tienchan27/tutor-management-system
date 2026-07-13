package com.example.tms.service;

import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.TutorPayoutPayment;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.entity.enums.PaymentStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.payment.VietQrGenerator;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorPayoutPaymentRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.util.AdvisoryLockService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PayoutServiceQrTests {

    @Mock private SessionRepository sessionRepository;
    @Mock private TutorPayoutRepository tutorPayoutRepository;
    @Mock private TutorPayoutPaymentRepository payoutPaymentRepository;
    @Mock private UserRepository userRepository;
    @Mock private TutorBankAccountRepository tutorBankAccountRepository;
    @Mock private NotificationOutboxService notificationOutboxService;
    @Mock private RealtimeOutboxService realtimeOutboxService;
    @Mock private AdvisoryLockService advisoryLockService;

    private PayoutService service() {
        return new PayoutService(sessionRepository, tutorPayoutRepository, payoutPaymentRepository, userRepository,
                tutorBankAccountRepository, notificationOutboxService, realtimeOutboxService, new VietQrGenerator(),
                advisoryLockService, "LUONG");
    }

    @Test
    void generateQr_failsWhenPrimaryAccountHasNoBin() {
        UUID payoutId = UUID.randomUUID();
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        TutorPayout payout = new TutorPayout();
        payout.setTutor(tutor);
        payout.setYear(2026);
        payout.setMonth(4);
        payout.setNetSalary(1_000_000L);
        payout.setStatus(PayoutStatus.LOCKED);
        when(tutorPayoutRepository.findById(payoutId)).thenReturn(Optional.of(payout));
        when(payoutPaymentRepository.findTopByTutorPayoutIdAndStatusOrderByCreatedAtDesc(payoutId, PaymentStatus.PENDING))
                .thenReturn(Optional.empty());

        TutorBankAccount account = new TutorBankAccount();
        account.setAccountNumber("113366668888"); // no bank_bin
        when(tutorBankAccountRepository.findByUserIdAndIsPrimaryTrue(tutor.getId())).thenReturn(Optional.of(account));

        assertThrows(ApiException.class, () -> service().generateQr(tutor, payoutId));
    }

    @Test
    void generateQr_rejectsWhenPayoutIsNotLocked() {
        UUID payoutId = UUID.randomUUID();
        TutorPayout payout = new TutorPayout();
        payout.setStatus(PayoutStatus.OPEN);
        when(tutorPayoutRepository.findById(payoutId)).thenReturn(Optional.of(payout));

        ApiException ex = assertThrows(ApiException.class, () -> service().generateQr(new User(), payoutId));

        assertEquals("PAYOUT_NOT_LOCKED", ex.getErrorCode());
    }

    @Test
    void generateQr_returnsExistingPendingQr() {
        UUID payoutId = UUID.randomUUID();
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        TutorPayout payout = new TutorPayout();
        payout.setId(payoutId);
        payout.setTutor(tutor);
        payout.setYear(2026);
        payout.setMonth(4);
        payout.setNetSalary(1_000_000L);
        payout.setStatus(PayoutStatus.LOCKED);
        when(tutorPayoutRepository.findById(payoutId)).thenReturn(Optional.of(payout));

        TutorPayoutPayment existing = new TutorPayoutPayment();
        existing.setId(UUID.randomUUID());
        existing.setTutorPayout(payout);
        existing.setQrRef("LUONG123");
        existing.setQrPayload("qr-payload");
        existing.setStatus(PaymentStatus.PENDING);
        when(payoutPaymentRepository.findTopByTutorPayoutIdAndStatusOrderByCreatedAtDesc(payoutId, PaymentStatus.PENDING))
                .thenReturn(Optional.of(existing));

        var response = service().generateQr(new User(), payoutId);

        assertEquals(existing.getId(), response.id());
        assertEquals("LUONG123", response.qrRef());
    }

    @Test
    void overrideNetSalary_rejectsWhenPendingQrExists() {
        UUID payoutId = UUID.randomUUID();
        TutorPayout payout = new TutorPayout();
        payout.setId(payoutId);
        payout.setStatus(PayoutStatus.LOCKED);
        when(tutorPayoutRepository.findById(payoutId)).thenReturn(Optional.of(payout));
        when(payoutPaymentRepository.existsByTutorPayoutIdAndStatus(payoutId, PaymentStatus.PENDING))
                .thenReturn(true);

        ApiException ex = assertThrows(ApiException.class,
                () -> service().overrideNetSalary(new User(), payoutId, 900_000L));

        assertEquals("PAYOUT_QR_ALREADY_GENERATED", ex.getErrorCode());
    }

    @Test
    void confirmPaid_rejectsWhenNotLocked() {
        UUID payoutId = UUID.randomUUID();
        User admin = new User();
        admin.setId(UUID.randomUUID());
        TutorPayout payout = new TutorPayout();
        payout.setId(payoutId);
        payout.setStatus(PayoutStatus.OPEN);
        when(tutorPayoutRepository.findById(payoutId)).thenReturn(Optional.of(payout));

        assertThrows(ApiException.class, () -> service().confirmPaid(admin, payoutId));
    }

    @Test
    void confirmPaid_marksPendingQrAsSuccessWhenPresent() {
        UUID payoutId = UUID.randomUUID();
        User admin = new User();
        admin.setId(UUID.randomUUID());
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        TutorPayout payout = new TutorPayout();
        payout.setId(payoutId);
        payout.setTutor(tutor);
        payout.setYear(2026);
        payout.setMonth(4);
        payout.setNetSalary(1_000_000L);
        payout.setStatus(PayoutStatus.LOCKED);
        when(tutorPayoutRepository.findById(payoutId)).thenReturn(Optional.of(payout));
        when(tutorPayoutRepository.save(any(TutorPayout.class))).thenAnswer(inv -> inv.getArgument(0));

        TutorPayoutPayment pending = new TutorPayoutPayment();
        pending.setId(UUID.randomUUID());
        pending.setTutorPayout(payout);
        pending.setQrRef("LUONG123");
        pending.setQrPayload("qr-payload");
        pending.setStatus(PaymentStatus.PENDING);
        when(payoutPaymentRepository.findTopByTutorPayoutIdAndStatusOrderByCreatedAtDesc(payoutId, PaymentStatus.PENDING))
                .thenReturn(Optional.of(pending));

        service().confirmPaid(admin, payoutId);

        assertEquals(PaymentStatus.SUCCESS, pending.getStatus());
        verify(payoutPaymentRepository).save(pending);
    }
}
