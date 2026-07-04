package com.example.tms.service;

import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.User;
import com.example.tms.exception.ApiException;
import com.example.tms.payment.VietQrGenerator;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorPayoutPaymentRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PayoutServiceQrTests {

    @Mock private SessionRepository sessionRepository;
    @Mock private TutorPayoutRepository tutorPayoutRepository;
    @Mock private TutorPayoutPaymentRepository payoutPaymentRepository;
    @Mock private UserRepository userRepository;
    @Mock private TutorBankAccountRepository tutorBankAccountRepository;
    @Mock private NotificationOutboxService notificationOutboxService;
    @Mock private RealtimeOutboxService realtimeOutboxService;

    private PayoutService service() {
        return new PayoutService(sessionRepository, tutorPayoutRepository, payoutPaymentRepository, userRepository,
                tutorBankAccountRepository, notificationOutboxService, realtimeOutboxService, new VietQrGenerator(),
                "LUONG");
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
        when(tutorPayoutRepository.findById(payoutId)).thenReturn(Optional.of(payout));

        TutorBankAccount account = new TutorBankAccount();
        account.setAccountNumber("113366668888"); // no bank_bin
        when(tutorBankAccountRepository.findByUserIdAndIsPrimaryTrue(tutor.getId())).thenReturn(Optional.of(account));

        assertThrows(ApiException.class, () -> service().generateQr(tutor, payoutId));
    }
}
