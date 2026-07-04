package com.example.tms.api;

import com.example.tms.api.dto.invoice.CloseStudentInvoicesRequest;
import com.example.tms.api.dto.invoice.InvoiceGenerationResultResponse;
import com.example.tms.api.dto.invoice.StudentInvoiceResponse;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.StudentInvoiceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/invoices")
public class AdminInvoiceController {
    private final StudentInvoiceService studentInvoiceService;
    private final CurrentUserResolver currentUserResolver;

    public AdminInvoiceController(StudentInvoiceService studentInvoiceService, CurrentUserResolver currentUserResolver) {
        this.studentInvoiceService = studentInvoiceService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping
    public List<StudentInvoiceResponse> list(@RequestParam String month) {
        return studentInvoiceService.listByMonth(currentUserResolver.requireUser(), YearMonth.parse(month));
    }

    @PostMapping("/close-month")
    public InvoiceGenerationResultResponse closeMonth(
            @RequestParam String month,
            @RequestBody(required = false) CloseStudentInvoicesRequest request
    ) {
        boolean recalculate = request != null && Boolean.TRUE.equals(request.recalculate());
        return studentInvoiceService.generateForMonth(
                currentUserResolver.requireUser(),
                YearMonth.parse(month),
                recalculate
        );
    }

    @PostMapping("/{invoiceId}/confirm-paid")
    public StudentInvoiceResponse confirmPaid(@PathVariable UUID invoiceId) {
        return studentInvoiceService.confirmPaidByAdmin(currentUserResolver.requireUser(), invoiceId);
    }
}
