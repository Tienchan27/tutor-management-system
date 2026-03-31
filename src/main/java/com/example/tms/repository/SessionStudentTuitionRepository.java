package com.example.tms.repository;

import com.example.tms.entity.SessionStudentTuition;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SessionStudentTuitionRepository extends JpaRepository<SessionStudentTuition, UUID> {
    List<SessionStudentTuition> findBySessionId(UUID sessionId);

    @Query("""
           select sst
           from SessionStudentTuition sst
           join fetch sst.student
           where sst.session.id = :sessionId
           """)
    List<SessionStudentTuition> findBySessionIdWithStudent(UUID sessionId);
}

