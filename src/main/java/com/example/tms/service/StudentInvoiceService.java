package com.example.tms.service;

import com.example.tms.api.dto.invoice.InvoiceGenerationResultResponse;
import com.example.tms.api.dto.invoice.StudentInvoiceResponse;
import com.example.tms.api.dto.payment.PaymentQrResponse;
import com.example.tms.api.mapper.InvoiceMapper;
import com.example.tms.entity.CenterBankAccount;
import com.example.tms.entity.Invoice;
import com.example.tms.entity.Payment;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.InvoiceStatus;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.PaymentMethod;
import com.example.tms.entity.enums.PaymentStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.payment.VietQrGenerator;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.InvoiceRepository;
import com.example.tms.repository.PaymentRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.util.AdvisoryLockService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class StudentInvoiceService {
    private final SessionStudentTuitionRepository sessionStudentTuitionRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final NotificationOutboxService notificationOutboxService;
    private final RealtimeOutboxService realtimeOutboxService;
    private final VietQrGenerator vietQrGenerator;
    private final CenterBankAccountService centerBankAccountService;
    private final AdvisoryLockService advisoryLockService;
    private final int dueDays;
    private final String tuitionRefPrefix;

    public StudentInvoiceService(
            SessionStudentTuitionRepository sessionStudentTuitionRepository,
            InvoiceRepository invoiceRepository,
            PaymentRepository paymentRepository,
            UserRepository userRepository,
            NotificationOutboxService notificationOutboxService,
            RealtimeOutboxService realtimeOutboxService,
            VietQrGenerator vietQrGenerator,
            CenterBankAccountService centerBankAccountService,
            AdvisoryLockService advisoryLockService,
            @Value("${app.invoice.due-days:15}") int dueDays,
            @Value("${app.payments.tuition-ref-prefix:HP}") String tuitionRefPrefix
    ) {
        this.sessionStudentTuitionRepository = sessionStudentTuitionRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.notificationOutboxService = notificationOutboxService;
        this.realtimeOutboxService = realtimeOutboxService;
        this.vietQrGenerator = vietQrGenerator;
        this.centerBankAccountService = centerBankAccountService;
        this.advisoryLockService = advisoryLockService;
        this.dueDays = dueDays;
        this.tuitionRefPrefix = tuitionRefPrefix;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<StudentInvoiceResponse> listByMonth(User admin, YearMonth month) {
        return invoiceRepository.findByYearAndMonthOrderByCreatedAtDesc(month.getYear(), month.getMonthValue()).stream()
                .map(InvoiceMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('STUDENT')")
    public List<StudentInvoiceResponse> listForStudent(User student) {
        return invoiceRepository.findByStudentIdOrderByYearDescMonthDesc(student.getId()).stream()
                .map(InvoiceMapper::toResponse)
                .toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public InvoiceGenerationResultResponse generateForMonth(User admin, YearMonth month, boolean allowRecalculate) {
        return generateForMonthInternal(month, allowRecalculate);
    }

    @Transactional
    public InvoiceGenerationResultResponse generateForMonthInternal(YearMonth month, boolean allowRecalculate) {
        advisoryLockService.acquireTransactionLock("student-invoice:" + month);

        String payrollMonth = month.toString();
        List<SessionStudentTuition> rows = sessionStudentTuitionRepository.findByPayrollMonth(payrollMonth);
        Map<UUID, StudentAggregate> aggregates = new HashMap<>();
        for (SessionStudentTuition row : rows) {
            UUID studentId = row.getStudent().getId();
            StudentAggregate agg = aggregates.computeIfAbsent(studentId, id -> new StudentAggregate());
            agg.totalTuition += row.getTuitionAtLog();
            Session session = row.getSession();
            if (agg.countedSessions.add(session.getId())) {
                agg.totalHours = agg.totalHours.add(session.getDurationHours());
            }
        }

        int created = 0;
        int skipped = 0;
        List<StudentInvoiceResponse> results = new ArrayList<>();
        LocalDate dueDate = LocalDate.now().plusDays(dueDays);

        for (Map.Entry<UUID, StudentAggregate> entry : aggregates.entrySet()) {
            UUID studentId = entry.getKey();
            StudentAggregate agg = entry.getValue();
            if (agg.totalTuition <= 0) {
                skipped++;
                continue;
            }

            var existing = invoiceRepository.findByStudentIdAndYearAndMonth(
                    studentId,
                    month.getYear(),
                    month.getMonthValue()
            );
            if (existing.isPresent()) {
                InvoiceStatus status = existing.get().getStatus();
                // Never overwrite a settled invoice — recalculation must not reset a PAID/PARTIALLY_PAID
                // invoice back to UNPAID or change its amount. Only UNPAID invoices are recalculated.
                boolean settled = status == InvoiceStatus.PAID || status == InvoiceStatus.PARTIALLY_PAID;
                if (settled || !allowRecalculate) {
                    skipped++;
                    results.add(InvoiceMapper.toResponse(existing.get()));
                    continue;
                }
            }

            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> ApiException.notFound("STUDENT_NOT_FOUND", "Student not found"));
            Invoice invoice = existing.orElseGet(Invoice::new);
            invoice.setStudent(student);
            invoice.setYear(month.getYear());
            invoice.setMonth(month.getMonthValue());
            invoice.setTotalHours(agg.totalHours);
            invoice.setTotalAmount(agg.totalTuition);
            invoice.setStatus(InvoiceStatus.UNPAID);
            invoice.setDueDate(dueDate);
            if (invoice.getQrRef() == null) {
                invoice.setQrRef(newTuitionRef());
            }
            Invoice saved = invoiceRepository.save(invoice);
            created++;
            results.add(InvoiceMapper.toResponse(saved));
        }

        return new InvoiceGenerationResultResponse(month, created, skipped, results);
    }

    /** Student fetches a scannable VietQR to pay their own invoice into the center account. */
    @Transactional
    @PreAuthorize("hasRole('STUDENT')")
    public PaymentQrResponse getInvoiceQr(User student, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> ApiException.notFound("INVOICE_NOT_FOUND", "Invoice not found"));
        if (!invoice.getStudent().getId().equals(student.getId())) {
            throw ApiException.forbidden("INVOICE_FORBIDDEN", "This invoice does not belong to you");
        }
        if (invoice.getQrRef() == null) {
            invoice.setQrRef(newTuitionRef());
            invoiceRepository.save(invoice);
        }

        CenterBankAccount center = centerBankAccountService.getRequired();
        String payload = vietQrGenerator.build(
                center.getBankBin(), center.getAccountNumber(), invoice.getTotalAmount(), invoice.getQrRef());
        return new PaymentQrResponse(
                payload,
                invoice.getQrRef(),
                center.getBankName(),
                center.getAccountNumber(),
                center.getAccountHolderName(),
                invoice.getTotalAmount(),
                invoice.getQrRef()
        );
    }

    /** Admin confirms a tuition transfer was received (the always-free manual path). */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public StudentInvoiceResponse confirmPaidByAdmin(User admin, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> ApiException.notFound("INVOICE_NOT_FOUND", "Invoice not found"));
        return InvoiceMapper.toResponse(applyExternalPayment(
                invoice, "MANUAL:" + admin.getId() + ":" + invoice.getId(), invoice.getTotalAmount()));
    }

    /**
     * Single source of truth for marking an invoice paid — reused by the admin manual
     * confirm and (Phase 2) the webhook adapter via {@code PaymentConfirmationPort}.
     * Idempotent when the same external reference is replayed on an already-paid invoice.
     */
    @Transactional
    public Invoice applyExternalPayment(UUID invoiceId, String externalReference, long amountVnd) {
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> ApiException.notFound("INVOICE_NOT_FOUND", "Invoice not found"));
        return applyExternalPayment(invoice, externalReference, amountVnd);
    }

    private Invoice applyExternalPayment(Invoice invoice, String externalReference, long amountVnd) {
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            if (isIdempotentReplay(invoice, externalReference)) {
                return invoice;
            }
            throw ApiException.conflict("INVOICE_ALREADY_PAID", "This invoice is already paid");
        }
        if (amountVnd != invoice.getTotalAmount()) {
            throw ApiException.conflict("PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match the invoice total");
        }

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(amountVnd);
        payment.setMethod(PaymentMethod.QR);
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(LocalDateTime.now());
        payment.setReference(externalReference);
        invoice.getPayments().add(payment);
        invoice.setStatus(InvoiceStatus.PAID);
        Invoice saved = invoiceRepository.save(invoice);

        User student = invoice.getStudent();
        notificationOutboxService.enqueue(
                student,
                NotificationType.INVOICE_PAID,
                "Tuition payment received",
                "Your tuition for " + invoice.getYear() + "-" + String.format("%02d", invoice.getMonth())
                        + " has been marked paid.",
                "invoice:" + saved.getId()
        );
        ClientEvent event = ClientEvent.of(
                ClientEventType.PAYMENT_STATUS_CHANGED,
                "user:" + student.getId(),
                "invoice:" + saved.getId(),
                Map.of("invoiceId", String.valueOf(saved.getId()), "status", saved.getStatus().name(), "ref",
                        externalReference)
        );
        realtimeOutboxService.enqueue("user:" + student.getId(), "invoice:" + saved.getId(), event);
        return saved;
    }

    private boolean isIdempotentReplay(Invoice invoice, String externalReference) {
        Optional<Payment> existing = paymentRepository.findByReference(externalReference);
        return existing.isPresent() && existing.get().getInvoice().getId().equals(invoice.getId());
    }

    private String newTuitionRef() {
        String compact = Long.toUnsignedString(UUID.randomUUID().getMostSignificantBits(), 36).toUpperCase();
        return tuitionRefPrefix + compact.substring(0, Math.min(12, compact.length()));
    }

    private static final class StudentAggregate {
        private long totalTuition;
        private BigDecimal totalHours = BigDecimal.ZERO;
        private final Set<UUID> countedSessions = new HashSet<>();
    }
}
