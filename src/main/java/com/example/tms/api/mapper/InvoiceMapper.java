package com.example.tms.api.mapper;

import com.example.tms.api.dto.invoice.StudentClassResponse;
import com.example.tms.api.dto.invoice.StudentInvoiceResponse;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Invoice;

public final class InvoiceMapper {
    private InvoiceMapper() {
    }

    public static StudentInvoiceResponse toResponse(Invoice invoice) {
        return new StudentInvoiceResponse(
                invoice.getId(),
                invoice.getStudent().getId(),
                invoice.getStudent().getName(),
                invoice.getYear(),
                invoice.getMonth(),
                invoice.getTotalHours(),
                invoice.getTotalAmount(),
                invoice.getStatus(),
                invoice.getDueDate(),
                invoice.getCreatedAt()
        );
    }

    public static StudentClassResponse toClassResponse(Enrollment enrollment) {
        var tutorClass = enrollment.getTutorClass();
        String tutorName = tutorClass.getTutor() != null ? tutorClass.getTutor().getName() : "-";
        String className = tutorClass.getDisplayName();
        if (className == null || className.isBlank()) {
            className = tutorClass.getSubject().getName();
        }
        return new StudentClassResponse(
                tutorClass.getId(),
                className,
                tutorClass.getSubject().getName(),
                tutorName,
                tutorClass.getPricePerHour(),
                enrollment.getStatus()
        );
    }
}
