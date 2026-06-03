package com.example.tms.service;

import com.example.tms.api.dto.invoice.InvoiceGenerationResultResponse;
import com.example.tms.api.dto.invoice.StudentInvoiceResponse;
import com.example.tms.api.mapper.InvoiceMapper;
import com.example.tms.entity.Invoice;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.InvoiceStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.InvoiceRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class StudentInvoiceService {
    private final SessionStudentTuitionRepository sessionStudentTuitionRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final int dueDays;

    public StudentInvoiceService(
            SessionStudentTuitionRepository sessionStudentTuitionRepository,
            InvoiceRepository invoiceRepository,
            UserRepository userRepository,
            @Value("${app.invoice.due-days:15}") int dueDays
    ) {
        this.sessionStudentTuitionRepository = sessionStudentTuitionRepository;
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.dueDays = dueDays;
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
            if (existing.isPresent() && !allowRecalculate) {
                skipped++;
                results.add(InvoiceMapper.toResponse(existing.get()));
                continue;
            }

            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new ApiException("Student not found"));
            Invoice invoice = existing.orElseGet(Invoice::new);
            invoice.setStudent(student);
            invoice.setYear(month.getYear());
            invoice.setMonth(month.getMonthValue());
            invoice.setTotalHours(agg.totalHours);
            invoice.setTotalAmount(agg.totalTuition);
            invoice.setStatus(InvoiceStatus.UNPAID);
            invoice.setDueDate(dueDate);
            Invoice saved = invoiceRepository.save(invoice);
            created++;
            results.add(InvoiceMapper.toResponse(saved));
        }

        return new InvoiceGenerationResultResponse(month, created, skipped, results);
    }

    private static final class StudentAggregate {
        private long totalTuition;
        private BigDecimal totalHours = BigDecimal.ZERO;
        private final Set<UUID> countedSessions = new HashSet<>();
    }
}
