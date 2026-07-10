package com.example.tms.service;

import com.example.tms.api.dto.payout.TutorPayoutPaymentResponse;
import com.example.tms.api.dto.payout.TutorPayoutResponse;
import com.example.tms.api.mapper.PayoutMapper;
import com.example.tms.entity.Session;
import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.TutorPayoutPayment;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.entity.enums.PaymentStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.payment.VietQrGenerator;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorPayoutPaymentRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.util.AdvisoryLockService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PayoutService {
    private static final BigDecimal GLOBAL_DEFAULT_RATE = new BigDecimal("0.7500");

    private final SessionRepository sessionRepository;
    private final TutorPayoutRepository tutorPayoutRepository;
    private final TutorPayoutPaymentRepository payoutPaymentRepository;
    private final UserRepository userRepository;
    private final TutorBankAccountRepository tutorBankAccountRepository;
    private final NotificationOutboxService notificationOutboxService;
    private final RealtimeOutboxService realtimeOutboxService;
    private final VietQrGenerator vietQrGenerator;
    private final AdvisoryLockService advisoryLockService;
    private final String payoutRefPrefix;

    public PayoutService(
            SessionRepository sessionRepository,
            TutorPayoutRepository tutorPayoutRepository,
            TutorPayoutPaymentRepository payoutPaymentRepository,
            UserRepository userRepository,
            TutorBankAccountRepository tutorBankAccountRepository,
            NotificationOutboxService notificationOutboxService,
            RealtimeOutboxService realtimeOutboxService,
            VietQrGenerator vietQrGenerator,
            AdvisoryLockService advisoryLockService,
            @Value("${app.payments.payout-ref-prefix:LUONG}") String payoutRefPrefix
    ) {
        this.sessionRepository = sessionRepository;
        this.tutorPayoutRepository = tutorPayoutRepository;
        this.payoutPaymentRepository = payoutPaymentRepository;
        this.userRepository = userRepository;
        this.tutorBankAccountRepository = tutorBankAccountRepository;
        this.notificationOutboxService = notificationOutboxService;
        this.realtimeOutboxService = realtimeOutboxService;
        this.vietQrGenerator = vietQrGenerator;
        this.advisoryLockService = advisoryLockService;
        this.payoutRefPrefix = payoutRefPrefix;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<TutorPayoutResponse> listByMonth(User admin, YearMonth month) {
        return tutorPayoutRepository.findByYearAndMonth(month.getYear(), month.getMonthValue()).stream()
                .map(PayoutMapper::toResponse)
                .toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public List<TutorPayoutResponse> generateMonthlyPayouts(User admin, YearMonth month) {
        return generateMonthlyPayoutsInternal(month).stream()
                .map(PayoutMapper::toResponse)
                .toList();
    }

    @Transactional
    List<TutorPayout> generateMonthlyPayoutsInternal(YearMonth month) {
        advisoryLockService.acquireTransactionLock("tutor-payout:" + month);

        String payrollMonth = month.toString();
        List<Session> sessions = sessionRepository.findByPayrollMonth(payrollMonth);
        Map<UUID, List<Session>> byTutor = sessions.stream()
                .collect(Collectors.groupingBy(s -> s.getTutorClass().getTutor().getId()));

        List<TutorPayout> generated = new ArrayList<>();
        for (Map.Entry<UUID, List<Session>> entry : byTutor.entrySet()) {
            UUID tutorId = entry.getKey();
            List<Session> tutorSessions = entry.getValue();
            User tutor = userRepository.findById(tutorId)
                    .orElseThrow(() -> ApiException.notFound("TUTOR_NOT_FOUND", "Tutor not found"));
            TutorPayout payout = tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutorId, month.getYear(), month.getMonthValue())
                    .orElseGet(() -> {
                        TutorPayout newPayout = new TutorPayout();
                        newPayout.setTutor(tutor);
                        newPayout.setYear(month.getYear());
                        newPayout.setMonth(month.getMonthValue());
                        return newPayout;
                    });
            // Preserve manual overrides (status LOCKED) and keep idempotency.
            if (payout.getStatus() == PayoutStatus.PAID || payout.getStatus() == PayoutStatus.LOCKED) {
                continue;
            }

            long gross = 0L;
            BigDecimal net = BigDecimal.ZERO;
            for (Session session : tutorSessions) {
                BigDecimal rate = resolveRate(session);
                long tuition = session.getTuitionAtLog();
                gross += tuition;
                net = net.add(BigDecimal.valueOf(tuition).multiply(rate));
            }
            payout.setGrossRevenue(gross);
            payout.setNetSalary(net.setScale(0, RoundingMode.HALF_UP).longValueExact());
            payout.setStatus(PayoutStatus.LOCKED);
            TutorPayout savedPayout = tutorPayoutRepository.save(payout);
            generated.add(savedPayout);

            notificationOutboxService.enqueue(
                    tutor,
                    NotificationType.PAYOUT_GENERATED,
                    "Monthly payout generated",
                    "Payout for " + payrollMonth + " generated with net salary " + payout.getNetSalary(),
                    "payout:" + savedPayout.getId()
            );

            ClientEvent event = ClientEvent.of(
                    ClientEventType.PAYOUT_UPDATED,
                    "user:" + tutor.getId(),
                    "payout:" + savedPayout.getId(),
                    Map.of("payoutId", String.valueOf(savedPayout.getId()), "status", savedPayout.getStatus().name())
            );
            realtimeOutboxService.enqueue("user:" + tutor.getId(), "payout:" + savedPayout.getId(), event);
        }
        return generated;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TutorPayoutResponse overrideNetSalary(User admin, UUID payoutId, Long netSalary) {
        TutorPayout payout = tutorPayoutRepository.findById(payoutId)
                .orElseThrow(() -> ApiException.notFound("PAYOUT_NOT_FOUND", "Payout not found"));

        if (payout.getStatus() != PayoutStatus.LOCKED) {
            throw ApiException.conflict("PAYOUT_NOT_LOCKED", "Payout net salary can only be overridden while LOCKED");
        }

        payout.setNetSalary(netSalary);
        TutorPayout saved = tutorPayoutRepository.save(payout);

        notificationOutboxService.enqueue(
                payout.getTutor(),
                NotificationType.PAYOUT_UPDATED,
                "Payout net salary updated",
                "Admin updated net salary for payout " + payout.getId() + ".",
                "payout:" + payout.getId()
        );

        ClientEvent event = ClientEvent.of(
                ClientEventType.PAYOUT_UPDATED,
                "user:" + payout.getTutor().getId(),
                "payout:" + payout.getId(),
                Map.of("payoutId", String.valueOf(payout.getId()), "status", saved.getStatus().name())
        );
        realtimeOutboxService.enqueue("user:" + payout.getTutor().getId(), "payout:" + payout.getId(), event);

        return PayoutMapper.toResponse(saved);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TutorPayoutPaymentResponse generateQr(User admin, UUID payoutId) {
        TutorPayout payout = tutorPayoutRepository.findById(payoutId)
                .orElseThrow(() -> ApiException.notFound("PAYOUT_NOT_FOUND", "Payout not found"));

        TutorBankAccount account = tutorBankAccountRepository.findByUserIdAndIsPrimaryTrue(payout.getTutor().getId())
                .orElseThrow(() -> ApiException.conflict("TUTOR_BANK_ACCOUNT_MISSING",
                        "Tutor has no primary bank account"));
        if (account.getBankBin() == null || account.getBankBin().isBlank()) {
            throw ApiException.conflict("TUTOR_BANK_MISSING_BIN",
                    "Tutor's bank account has no bank (BIN); ask the tutor to update it before generating a QR");
        }

        String qrRef = payoutRefPrefix + shortId(payout.getId());
        String payload = vietQrGenerator.build(
                account.getBankBin(), account.getAccountNumber(), payout.getNetSalary(), qrRef);

        TutorPayoutPayment payment = new TutorPayoutPayment();
        payment.setTutorPayout(payout);
        payment.setQrRef(qrRef);
        payment.setQrPayload(payload);
        payment.setStatus(PaymentStatus.PENDING);
        return PayoutMapper.toPaymentResponse(payoutPaymentRepository.save(payment));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TutorPayoutResponse confirmPaid(User admin, UUID payoutId) {
        TutorPayout payout = tutorPayoutRepository.findById(payoutId)
                .orElseThrow(() -> ApiException.notFound("PAYOUT_NOT_FOUND", "Payout not found"));
        if (payout.getStatus() != PayoutStatus.LOCKED) {
            throw ApiException.conflict("PAYOUT_NOT_LOCKED", "Payout can only be marked paid while LOCKED");
        }
        payout.setStatus(PayoutStatus.PAID);
        payout.setPaidAt(LocalDateTime.now());
        payout.setPaidBy(admin);
        TutorPayout saved = tutorPayoutRepository.save(payout);

        payoutPaymentRepository.findTopByTutorPayoutIdOrderByCreatedAtDesc(payoutId).ifPresent(pp -> {
            pp.setStatus(PaymentStatus.SUCCESS);
            pp.setPaidAt(LocalDateTime.now());
            payoutPaymentRepository.save(pp);
        });

        notificationOutboxService.enqueue(
                payout.getTutor(),
                NotificationType.PAYOUT_PAID,
                "Payout marked as paid",
                "Payout " + payout.getId() + " has been marked paid.",
                "payout:" + payout.getId()
        );

        ClientEvent event = ClientEvent.of(
                ClientEventType.PAYOUT_UPDATED,
                "user:" + payout.getTutor().getId(),
                "payout:" + payout.getId(),
                Map.of("payoutId", String.valueOf(payout.getId()), "status", saved.getStatus().name())
        );
        realtimeOutboxService.enqueue("user:" + payout.getTutor().getId(), "payout:" + payout.getId(), event);
        return PayoutMapper.toResponse(saved);
    }

    private String shortId(UUID id) {
        String compact = Long.toUnsignedString(id.getMostSignificantBits(), 36).toUpperCase();
        return compact.substring(0, Math.min(12, compact.length()));
    }

    private BigDecimal resolveRate(Session session) {
        if (session.getSalaryRateAtLog() != null) {
            return session.getSalaryRateAtLog();
        }
        if (session.getTutorClass().getDefaultSalaryRate() != null) {
            return session.getTutorClass().getDefaultSalaryRate();
        }
        if (session.getTutorClass().getTutor().getDefaultSalaryRate() != null) {
            return session.getTutorClass().getTutor().getDefaultSalaryRate();
        }
        return GLOBAL_DEFAULT_RATE;
    }
}
