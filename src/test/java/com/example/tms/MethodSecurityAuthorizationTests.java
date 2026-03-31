package com.example.tms;

import com.example.tms.api.dto.session.CreateSessionRequest;
import com.example.tms.api.dto.session.StudentTuitionRequest;
import com.example.tms.entity.Session;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SessionFinancialEditAuditRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.service.NotificationService;
import com.example.tms.service.SessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(MethodSecurityAuthorizationTests.TestConfig.class)
class MethodSecurityAuthorizationTests {

    @Configuration
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        SessionRepository sessionRepository() {
            return mock(SessionRepository.class);
        }

        @Bean
        TutorClassRepository tutorClassRepository() {
            return mock(TutorClassRepository.class);
        }

        @Bean
        EnrollmentRepository enrollmentRepository() {
            return mock(EnrollmentRepository.class);
        }

        @Bean
        UserRoleRepository userRoleRepository() {
            return mock(UserRoleRepository.class);
        }

        @Bean
        SessionFinancialEditAuditRepository auditRepository() {
            return mock(SessionFinancialEditAuditRepository.class);
        }

        @Bean
        NotificationService notificationService() {
            return mock(NotificationService.class);
        }

        @Bean
        SessionStudentTuitionRepository sessionStudentTuitionRepository() {
            return mock(SessionStudentTuitionRepository.class);
        }

        @Bean
        SessionService sessionService(
                SessionRepository sessionRepository,
                TutorClassRepository tutorClassRepository,
                EnrollmentRepository enrollmentRepository,
                SessionStudentTuitionRepository sessionStudentTuitionRepository,
                UserRoleRepository userRoleRepository,
                SessionFinancialEditAuditRepository auditRepository,
                NotificationService notificationService
        ) {
            return new SessionService(
                    sessionRepository,
                    tutorClassRepository,
                    enrollmentRepository,
                    sessionStudentTuitionRepository,
                    userRoleRepository,
                    auditRepository,
                    notificationService
            );
        }
    }

    @Autowired
    private SessionService sessionService;

    @Autowired
    private TutorClassRepository tutorClassRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    private User tutor;
    private User student;
    private TutorClass tutorClass;
    private CreateSessionRequest request;

    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setId(UUID.randomUUID());
        tutor.setEmail("tutor@example.com");

        student = new User();
        student.setId(UUID.randomUUID());
        student.setEmail("student@example.com");

        Subject subject = new Subject();
        subject.setName("Math");

        tutorClass = new TutorClass();
        tutorClass.setId(UUID.randomUUID());
        tutorClass.setTutor(tutor);
        tutorClass.setSubject(subject);
        tutorClass.setPricePerHour(180000L);
        tutorClass.setDefaultSalaryRate(new BigDecimal("0.7500"));

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setStatus(EnrollmentStatus.ACTIVE);

        request = new CreateSessionRequest(
                tutorClass.getId(),
                LocalDate.now(),
                new BigDecimal("1.5"),
                List.of(new StudentTuitionRequest(student.getId(), 180000L)),
                new BigDecimal("0.75"),
                "2026-03",
                "note"
        );

        Session saved = new Session();
        saved.setId(UUID.randomUUID());
        when(tutorClassRepository.findById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));
        when(sessionRepository.save(any(Session.class))).thenReturn(saved);
        when(enrollmentRepository.findByTutorClassIdAndStatus(tutorClass.getId(), EnrollmentStatus.ACTIVE)).thenReturn(List.of(enrollment));
    }

    @Test
    void createSessionWithoutAuthenticationThrows() {
        assertThrows(AuthenticationCredentialsNotFoundException.class, () -> sessionService.create(tutor, request));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createSessionWithWrongRoleThrowsAccessDenied() {
        assertThrows(AccessDeniedException.class, () -> sessionService.create(tutor, request));
    }

    @Test
    @WithMockUser(roles = "TUTOR")
    void createSessionWithTutorRolePassesAuthorization() {
        sessionService.create(tutor, request);
    }
}
