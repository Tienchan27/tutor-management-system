package com.example.tms.api.dto.invoice;

import com.example.tms.entity.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record StudentInvoiceResponse(
        UUID id,
        UUID studentId,
        String studentName,
        Integer year,
        Integer month,
        BigDecimal totalHours,
        Long totalAmount,
        InvoiceStatus status,
        LocalDate dueDate,
        LocalDateTime createdAt
) {
}
