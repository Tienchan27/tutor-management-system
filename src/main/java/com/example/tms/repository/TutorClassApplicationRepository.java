package com.example.tms.repository;

import com.example.tms.entity.TutorClassApplication;
import com.example.tms.entity.enums.TutorClassApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface TutorClassApplicationRepository extends JpaRepository<TutorClassApplication, UUID> {
    Optional<TutorClassApplication> findByTutorClassIdAndTutorId(UUID classId, UUID tutorId);

    @Query("""
           select tca from TutorClassApplication tca
           join fetch tca.tutor t
           join fetch tca.tutorClass tc
           join fetch tc.subject s
           where tca.tutorClass.id = :classId
           order by tca.appliedAt asc
           """)
    List<TutorClassApplication> findByClassIdOrderByAppliedAtAsc(UUID classId);

    @Query("""
           select tca from TutorClassApplication tca
           join fetch tca.tutor t
           join fetch tca.tutorClass tc
           where tc.id in :classIds
           order by tca.appliedAt asc
           """)
    List<TutorClassApplication> findByClassIdsOrderByAppliedAtAsc(Collection<UUID> classIds);

    @Query("""
           select tca.tutorClass.id from TutorClassApplication tca
           where tca.tutor.id = :tutorId
             and tca.tutorClass.id in :classIds
             and tca.status = :status
           """)
    Set<UUID> findClassIdsByTutorIdAndStatus(UUID tutorId, Collection<UUID> classIds, TutorClassApplicationStatus status);

    @Query("""
           select tca from TutorClassApplication tca
           join fetch tca.tutorClass tc
           join fetch tc.subject s
           where tca.tutor.id = :tutorId and tca.status = :status
           order by tca.appliedAt desc
           """)
    List<TutorClassApplication> findByTutorIdAndStatus(UUID tutorId, TutorClassApplicationStatus status);

}
