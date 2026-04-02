package com.example.tms.repository;

import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.enums.PayoutStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TutorPayoutRepository extends JpaRepository<TutorPayout, UUID> {
    Optional<TutorPayout> findByTutorIdAndYearAndMonth(UUID tutorId, Integer year, Integer month);

    @EntityGraph(attributePaths = "tutor")
    List<TutorPayout> findByYearAndMonthAndTutor_IdIn(Integer year, Integer month, Collection<UUID> tutorIds);
    List<TutorPayout> findByYearAndMonth(Integer year, Integer month);
    List<TutorPayout> findByTutorIdOrderByYearDescMonthDesc(UUID tutorId);
    List<TutorPayout> findByYearAndMonthAndStatus(Integer year, Integer month, PayoutStatus status);
}
