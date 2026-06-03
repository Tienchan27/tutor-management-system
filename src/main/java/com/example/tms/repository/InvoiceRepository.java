package com.example.tms.repository;

import com.example.tms.entity.Invoice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    Optional<Invoice> findByStudentIdAndYearAndMonth(UUID studentId, Integer year, Integer month);

    boolean existsByStudentIdAndYearAndMonth(UUID studentId, Integer year, Integer month);

    @EntityGraph(attributePaths = "student")
    List<Invoice> findByYearAndMonthOrderByCreatedAtDesc(Integer year, Integer month);

    @EntityGraph(attributePaths = "student")
    List<Invoice> findByStudentIdOrderByYearDescMonthDesc(UUID studentId);
}
