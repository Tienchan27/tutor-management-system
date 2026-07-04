package com.example.tms;

import com.example.tms.api.dto.invoice.InvoiceGenerationResultResponse;
import com.example.tms.entity.Invoice;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.InvoiceStatus;
import com.example.tms.payment.VietQrGenerator;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.InvoiceRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.service.CenterBankAccountService;
import com.example.tms.service.NotificationOutboxService;
import com.example.tms.service.StudentInvoiceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceRecalculationTests {

    @Mock private SessionStudentTuitionRepository sessionStudentTuitionRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationOutboxService notificationOutboxService;
    @Mock private RealtimeOutboxService realtimeOutboxService;
    @Mock private VietQrGenerator vietQrGenerator;
    @Mock private CenterBankAccountService centerBankAccountService;

    private StudentInvoiceService service() {
        return new StudentInvoiceService(sessionStudentTuitionRepository, invoiceRepository, userRepository,
                notificationOutboxService, realtimeOutboxService, vietQrGenerator, centerBankAccountService, 15, "HP");
    }

    private User student() {
        User s = new User();
        s.setId(UUID.randomUUID());
        s.setName("Student A");
        return s;
    }

    private SessionStudentTuition tuitionRow(User student, long amount) {
        Session session = new Session();
        session.setId(UUID.randomUUID());
        session.setDurationHours(new BigDecimal("2"));
        SessionStudentTuition row = new SessionStudentTuition();
        row.setStudent(student);
        row.setSession(session);
        row.setTuitionAtLog(amount);
        return row;
    }

    private Invoice existingInvoice(User student, InvoiceStatus status, long amount) {
        Invoice invoice = new Invoice();
        invoice.setStudent(student);
        invoice.setYear(2026);
        invoice.setMonth(6);
        invoice.setTotalHours(new BigDecimal("2"));
        invoice.setTotalAmount(amount);
        invoice.setStatus(status);
        invoice.setDueDate(LocalDate.of(2026, 6, 30));
        return invoice;
    }

    @Test
    void recalculationLeavesAPaidInvoiceUntouched() {
        User student = student();
        when(sessionStudentTuitionRepository.findByPayrollMonth("2026-06"))
                .thenReturn(List.of(tuitionRow(student, 500000L)));
        when(invoiceRepository.findByStudentIdAndYearAndMonth(student.getId(), 2026, 6))
                .thenReturn(Optional.of(existingInvoice(student, InvoiceStatus.PAID, 300000L)));

        InvoiceGenerationResultResponse result =
                service().generateForMonthInternal(YearMonth.of(2026, 6), true);

        assertEquals(0, result.createdCount());
        assertEquals(1, result.skippedCount());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void recalculationUpdatesAnUnpaidInvoice() {
        User student = student();
        when(sessionStudentTuitionRepository.findByPayrollMonth("2026-06"))
                .thenReturn(List.of(tuitionRow(student, 500000L)));
        when(invoiceRepository.findByStudentIdAndYearAndMonth(student.getId(), 2026, 6))
                .thenReturn(Optional.of(existingInvoice(student, InvoiceStatus.UNPAID, 300000L)));
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

        InvoiceGenerationResultResponse result =
                service().generateForMonthInternal(YearMonth.of(2026, 6), true);

        assertEquals(1, result.createdCount());
        verify(invoiceRepository, times(1)).save(any(Invoice.class));
    }
}
