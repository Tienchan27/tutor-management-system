package com.example.tms.service;

import com.example.tms.entity.Session;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.TutorPayoutPayment;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.entity.enums.PaymentStatus;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.TutorPayoutPaymentRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.security.RoleGuard;
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
    private final RoleGuard roleGuard;
    private final NotificationService notificationService;

    public PayoutService(
            SessionRepository sessionRepository,
            TutorPayoutRepository tutorPayoutRepository,
            TutorPayoutPaymentRepository payoutPaymentRepository,
            UserRepository userRepository,
            RoleGuard roleGuard,
            NotificationService notificationService
    ) {
        this.sessionRepository = sessionRepository;
        this.tutorPayoutRepository = tutorPayoutRepository;
        this.payoutPaymentRepository = payoutPaymentRepository;
        this.userRepository = userRepository;
        this.roleGuard = roleGuard;
        this.notificationService = notificationService;
    }

    @Transactional
    public List<TutorPayout> generateMonthlyPayouts(User admin, YearMonth month) {
        roleGuard.requireRole(admin, RoleName.ADMIN);
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
            if (payout.getStatus() == PayoutStatus.PAID) {
                continue;
            }

            BigDecimal gross = BigDecimal.ZERO;
            BigDecimal net = BigDecimal.ZERO;
            for (Session session : tutorSessions) {
                BigDecimal tuition = session.getTuitionAtLog();
                BigDecimal rate = resolveRate(session);
                gross = gross.add(tuition);
                net = net.add(tuition.multiply(rate));
            }
            payout.setGrossRevenue(gross.setScale(2, RoundingMode.HALF_UP));
            payout.setNetSalary(net.setScale(2, RoundingMode.HALF_UP));
            payout.setStatus(PayoutStatus.LOCKED);
            generated.add(tutorPayoutRepository.save(payout));

            notificationService.notifyUser(
                    tutor,
                    NotificationType.PAYOUT_GENERATED,
                    "Monthly payout generated",
                    "Payout for " + payrollMonth + " generated with net salary " + payout.getNetSalary()
            );
        }
        return generated;
    }

    @Transactional
    public TutorPayoutPayment generateQr(User admin, UUID payoutId) {
        roleGuard.requireRole(admin, RoleName.ADMIN);
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
    public TutorPayout confirmPaid(User admin, UUID payoutId) {
        roleGuard.requireRole(admin, RoleName.ADMIN);
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

        notificationService.notifyUser(
                payout.getTutor(),
                NotificationType.PAYOUT_PAID,
                "Payout marked as paid",
                "Payout " + payout.getId() + " has been marked paid."
        );
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
