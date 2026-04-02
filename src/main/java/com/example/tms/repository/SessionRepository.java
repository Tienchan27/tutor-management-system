package com.example.tms.repository;

import com.example.tms.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionRepository extends JpaRepository<Session, UUID> {
    List<Session> findByPayrollMonth(String payrollMonth);
    List<Session> findByTutorClassTutorIdAndPayrollMonth(UUID tutorId, String payrollMonth);
    Slice<Session> findByTutorClassTutorIdAndPayrollMonth(UUID tutorId, String payrollMonth, Pageable pageable);
    long countByTutorClassId(UUID tutorClassId);
    Optional<Session> findTopByTutorClassIdOrderByDateDesc(UUID tutorClassId);

    @Query("""
            select s.tutorClass.tutor.id, count(distinct s.tutorClass.id)
            from Session s
            where s.payrollMonth = :payrollMonth
            and s.tutorClass.tutor.id in :tutorIds
            group by s.tutorClass.tutor.id
            """)
    List<Object[]> countDistinctClassesByTutorForPayrollMonth(
            @Param("payrollMonth") String payrollMonth,
            @Param("tutorIds") Collection<UUID> tutorIds
    );
}
