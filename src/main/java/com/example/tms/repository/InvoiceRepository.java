package com.example.tms.repository;

import com.example.tms.entity.Invoice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") UUID id);

    Optional<Invoice> findByStudentIdAndYearAndMonth(UUID studentId, Integer year, Integer month);

    boolean existsByStudentIdAndYearAndMonth(UUID studentId, Integer year, Integer month);

    @EntityGraph(attributePaths = "student")
    List<Invoice> findByYearAndMonthOrderByCreatedAtDesc(Integer year, Integer month);

    @EntityGraph(attributePaths = "student")
    List<Invoice> findByStudentIdOrderByYearDescMonthDesc(UUID studentId);

    @Query("""
            select i.status, count(i)
            from Invoice i
            where i.year = :year and i.month = :month
            group by i.status
            """)
    List<Object[]> countGroupedByStatusForMonth(@Param("year") Integer year, @Param("month") Integer month);
}
