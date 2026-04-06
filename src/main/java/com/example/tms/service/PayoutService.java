package com.example.tms.service;

import com.example.tms.entity.Session;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.TutorPayoutPayment;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.entity.enums.PaymentStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.TutorPayoutPaymentRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
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
    private final NotificationOutboxService notificationOutboxService;
    private final RealtimeOutboxService realtimeOutboxService;

    public PayoutService(
            SessionRepository sessionRepository,
            TutorPayoutRepository tutorPayoutRepository,
            TutorPayoutPaymentRepository payoutPaymentRepository,
            UserRepository userRepository,
            NotificationOutboxService notificationOutboxService,
            RealtimeOutboxService realtimeOutboxService
    ) {
        this.sessionRepository = sessionRepository;
        this.tutorPayoutRepository = tutorPayoutRepository;
        this.payoutPaymentRepository = payoutPaymentRepository;
        this.userRepository = userRepository;
        this.notificationOutboxService = notificationOutboxService;
        this.realtimeOutboxService = realtimeOutboxService;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public List<TutorPayout> generateMonthlyPayouts(User admin, YearMonth month) {
        return generateMonthlyPayoutsInternal(month);
    }

    @Transactional
    List<TutorPayout> generateMonthlyPayoutsInternal(YearMonth month) {
        String payrollMonth = month.toString();
        List<Session> sessions = sessionRepository.findByPayrollMonth(payrollMonth);
        Map<UUID, List<Session>> byTutor = sessions.stream()
                .collect(Collectors.groupingBy(s -> s.getTutorClass().getTutor().getId()));

        List<TutorPayout> generated = new ArrayList<>();
        for (Map.Entry<UUID, List<Session>> entry : byTutor.entrySet()) {
            UUID tutorId = entry.getKey();
            List<Session> tutorSessions = entry.getValue();
            User tutor = userRepository.findById(tutorId)
                    .orElseThrow(() -> new ApiException("Tutor not found"));
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
    public TutorPayout overrideNetSalary(User admin, UUID payoutId, Long netSalary) {
        TutorPayout payout = tutorPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new ApiException("Payout not found"));

        if (payout.getStatus() != PayoutStatus.LOCKED) {
            throw new ApiException("Payout net salary can only be overridden while LOCKED");
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

        return saved;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TutorPayoutPayment generateQr(User admin, UUID payoutId) {
        TutorPayout payout = tutorPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new ApiException("Payout not found"));
        String qrRef = "PAYOUT-" + payout.getYear() + "-" + String.format("%02d", payout.getMonth()) + "-" + payout.getId();
        String payload = "BANK_TRANSFER|REF=" + qrRef + "|AMOUNT=" + payout.getNetSalary();

        TutorPayoutPayment payment = new TutorPayoutPayment();
        payment.setTutorPayout(payout);
        payment.setQrRef(qrRef);
        payment.setQrPayload(payload);
        payment.setStatus(PaymentStatus.PENDING);
        return payoutPaymentRepository.save(payment);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TutorPayout confirmPaid(User admin, UUID payoutId) {
        TutorPayout payout = tutorPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new ApiException("Payout not found"));
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
        return saved;
    }

    public List<TutorPayout> findByMonth(YearMonth month) {
        return tutorPayoutRepository.findByYearAndMonth(month.getYear(), month.getMonthValue());
    }

    public List<TutorPayout> findByTutor(UUID tutorId) {
        return tutorPayoutRepository.findByTutorIdOrderByYearDescMonthDesc(tutorId);
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
