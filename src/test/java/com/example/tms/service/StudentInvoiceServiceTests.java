package com.example.tms.service;

import com.example.tms.entity.Invoice;
import com.example.tms.entity.Payment;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.InvoiceStatus;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.payment.VietQrGenerator;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.InvoiceRepository;
import com.example.tms.repository.PaymentRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.util.AdvisoryLockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentInvoiceServiceTests {
    @Mock
    private SessionStudentTuitionRepository sessionStudentTuitionRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationOutboxService notificationOutboxService;
    @Mock
    private RealtimeOutboxService realtimeOutboxService;
    @Mock
    private VietQrGenerator vietQrGenerator;
    @Mock
    private CenterBankAccountService centerBankAccountService;
    @Mock
    private AdvisoryLockService advisoryLockService;

    private StudentInvoiceService studentInvoiceService;

    private User student;
    private Session session;

    @BeforeEach
    void setUp() {
        studentInvoiceService = new StudentInvoiceService(
                sessionStudentTuitionRepository,
                invoiceRepository,
                paymentRepository,
                userRepository,
                notificationOutboxService,
                realtimeOutboxService,
                vietQrGenerator,
                centerBankAccountService,
                advisoryLockService,
                15,
                "HP"
        );
        student = new User();
        student.setId(UUID.randomUUID());
        student.setName("Student A");
        student.setEmail("student@example.com");
        student.setStatus(UserStatus.ACTIVE);

        Subject subject = new Subject();
        subject.setName("Math");

        TutorClass tutorClass = new TutorClass();
        tutorClass.setSubject(subject);
        tutorClass.setPricePerHour(100_000L);

        session = new Session();
        session.setId(UUID.randomUUID());
        session.setPayrollMonth("2026-04");
        session.setDurationHours(new BigDecimal("2.00"));
        session.setTutorClass(tutorClass);
    }

    private SessionStudentTuition buildSst() {
        SessionStudentTuition sst = new SessionStudentTuition();
        sst.setStudent(student);
        sst.setSession(session);
        sst.setTuitionAtLog(200_000L);
        return sst;
    }

    @Test
    void generateForMonthInternal_acquiresAdvisoryLock() {
        doNothing().when(advisoryLockService).acquireTransactionLock("student-invoice:2026-04");
        when(sessionStudentTuitionRepository.findByPayrollMonth("2026-04")).thenReturn(List.of());

        studentInvoiceService.generateForMonthInternal(YearMonth.of(2026, 4), false);

        verify(advisoryLockService).acquireTransactionLock("student-invoice:2026-04");
    }

    @Test
    void generateForMonthInternal_createsInvoice() {
        doNothing().when(advisoryLockService).acquireTransactionLock(any());
        SessionStudentTuition sst = buildSst();
        when(sessionStudentTuitionRepository.findByPayrollMonth("2026-04")).thenReturn(List.of(sst));
        when(invoiceRepository.findByStudentIdAndYearAndMonth(student.getId(), 2026, 4)).thenReturn(Optional.empty());
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var result = studentInvoiceService.generateForMonthInternal(YearMonth.of(2026, 4), false);
        assertEquals(1, result.createdCount());
        assertEquals(0, result.skippedCount());
        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    void generateForMonthInternal_skipsWhenExists() {
        doNothing().when(advisoryLockService).acquireTransactionLock(any());
        SessionStudentTuition sst = buildSst();
        when(sessionStudentTuitionRepository.findByPayrollMonth("2026-04")).thenReturn(List.of(sst));
        Invoice existing = new Invoice();
        existing.setStudent(student);
        existing.setYear(2026);
        existing.setMonth(4);
        existing.setTotalAmount(200_000L);
        existing.setTotalHours(new BigDecimal("2"));
        existing.setStatus(InvoiceStatus.UNPAID);
        when(invoiceRepository.findByStudentIdAndYearAndMonth(student.getId(), 2026, 4)).thenReturn(Optional.of(existing));

        var result = studentInvoiceService.generateForMonthInternal(YearMonth.of(2026, 4), false);
        assertEquals(0, result.createdCount());
        assertEquals(1, result.skippedCount());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void applyExternalPayment_marksPaidAndRecordsPayment() {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setStudent(student);
        invoice.setYear(2026);
        invoice.setMonth(4);
        invoice.setTotalAmount(200_000L);
        invoice.setStatus(InvoiceStatus.UNPAID);
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        Invoice saved = studentInvoiceService.applyExternalPayment(invoice.getId(), "MANUAL:x", 200_000L);

        assertEquals(InvoiceStatus.PAID, saved.getStatus());
        assertEquals(1, saved.getPayments().size());
        assertEquals("MANUAL:x", saved.getPayments().iterator().next().getReference());
        verify(notificationOutboxService).enqueue(eq(student), eq(NotificationType.INVOICE_PAID), any(), any(), any());
    }

    @Test
    void applyExternalPayment_rejectsAmountMismatch() {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setStudent(student);
        invoice.setTotalAmount(200_000L);
        invoice.setStatus(InvoiceStatus.UNPAID);
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));

        assertThrows(ApiException.class,
                () -> studentInvoiceService.applyExternalPayment(invoice.getId(), "WEBHOOK:1", 100_000L));
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void applyExternalPayment_idempotentReplayWhenPaidWithSameReference() {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setStudent(student);
        invoice.setStatus(InvoiceStatus.PAID);
        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setReference("WEBHOOK:txn-1");
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByReference("WEBHOOK:txn-1")).thenReturn(Optional.of(payment));

        Invoice result = studentInvoiceService.applyExternalPayment(invoice.getId(), "WEBHOOK:txn-1", 200_000L);

        assertEquals(InvoiceStatus.PAID, result.getStatus());
        verify(invoiceRepository, never()).save(any());
        verify(notificationOutboxService, never()).enqueue(any(), any(), any(), any(), any());
    }

    @Test
    void applyExternalPayment_rejectsWhenPaidWithDifferentReference() {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setStudent(student);
        invoice.setStatus(InvoiceStatus.PAID);
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByReference("WEBHOOK:other")).thenReturn(Optional.empty());

        assertThrows(ApiException.class,
                () -> studentInvoiceService.applyExternalPayment(invoice.getId(), "WEBHOOK:other", 200_000L));
        verify(invoiceRepository, never()).save(any());
    }
}
