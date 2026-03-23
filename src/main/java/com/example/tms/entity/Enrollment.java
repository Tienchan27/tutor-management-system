package com.example.tms.entity;

import com.example.tms.entity.enums.EnrollmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(
    name = "enrollments",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"class_id", "student_id"})
    }
)
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @UuidGenerator
    @Column(name = "id", nullable = false, unique = true, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private TutorClass tutorClass;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;
}
