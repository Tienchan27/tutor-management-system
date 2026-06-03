package com.example.tms.service;

import com.example.tms.entity.Invoice;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.InvoiceStatus;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.repository.InvoiceRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.UserRepository;
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
import static org.mockito.ArgumentMatchers.any;
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
    private UserRepository userRepository;

    private StudentInvoiceService studentInvoiceService;

    private User student;
    private Session session;

    @BeforeEach
    void setUp() {
        studentInvoiceService = new StudentInvoiceService(
                sessionStudentTuitionRepository,
                invoiceRepository,
                userRepository,
                15
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
    void generateForMonthInternal_createsInvoice() {
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
}
