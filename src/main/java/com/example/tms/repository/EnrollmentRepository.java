package com.example.tms.repository;

import com.example.tms.entity.Enrollment;
import com.example.tms.entity.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    Optional<Enrollment> findByTutorClassIdAndStudentId(UUID classId, UUID studentId);
    Optional<Enrollment> findByTutorClassIdAndStudentIdAndStatus(UUID classId, UUID studentId, EnrollmentStatus status);
    @Query("""
           select e from Enrollment e
           join fetch e.student s
           where e.tutorClass.id = :classId and e.status = :status
           order by s.name asc
           """)
    List<Enrollment> findByTutorClassIdAndStatus(UUID classId, EnrollmentStatus status);

    @Query("""
           select e from Enrollment e
           join fetch e.student s
           join fetch e.tutorClass tc
           where tc.id in :classIds and e.status = :status
           order by s.name asc
           """)
    List<Enrollment> findByClassIdsAndStatus(Collection<UUID> classIds, EnrollmentStatus status);

    @Query("""
           select e from Enrollment e
           join fetch e.tutorClass c
           join fetch c.subject
           left join fetch c.tutor
           where e.student.id = :studentId and e.status = :status
           order by c.displayName asc
           """)
    List<Enrollment> findByStudentIdAndStatus(UUID studentId, EnrollmentStatus status);
}
