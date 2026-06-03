package com.example.tms.api;

import com.example.tms.api.dto.invoice.StudentClassResponse;
import com.example.tms.api.dto.invoice.StudentInvoiceResponse;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.StudentClassService;
import com.example.tms.service.StudentInvoiceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/student")
public class StudentPortalController {
    private final StudentClassService studentClassService;
    private final StudentInvoiceService studentInvoiceService;
    private final CurrentUserResolver currentUserResolver;

    public StudentPortalController(
            StudentClassService studentClassService,
            StudentInvoiceService studentInvoiceService,
            CurrentUserResolver currentUserResolver
    ) {
        this.studentClassService = studentClassService;
        this.studentInvoiceService = studentInvoiceService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/classes")
    public List<StudentClassResponse> classes() {
        return studentClassService.listActiveClasses(currentUserResolver.requireUser());
    }

    @GetMapping("/invoices")
    public List<StudentInvoiceResponse> invoices() {
        return studentInvoiceService.listForStudent(currentUserResolver.requireUser());
    }
}
