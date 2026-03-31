package com.example.tms;

import com.example.tms.api.dto.dashboard.TutorClassRosterResponse;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.service.DashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(TutorRosterAuthorizationTests.TestConfig.class)
class TutorRosterAuthorizationTests {

    @Configuration
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        TutorPayoutRepository tutorPayoutRepository() {
            return mock(TutorPayoutRepository.class);
        }

        @Bean
        TutorClassRepository tutorClassRepository() {
            return mock(TutorClassRepository.class);
        }

        @Bean
        TutorBankAccountRepository tutorBankAccountRepository() {
            return mock(TutorBankAccountRepository.class);
        }

        @Bean
        SessionRepository sessionRepository() {
            return mock(SessionRepository.class);
        }

        @Bean
        EnrollmentRepository enrollmentRepository() {
            return mock(EnrollmentRepository.class);
        }

        @Bean
        SessionStudentTuitionRepository sessionStudentTuitionRepository() {
            return mock(SessionStudentTuitionRepository.class);
        }

        @Bean
        UserRepository userRepository() {
            return mock(UserRepository.class);
        }

        @Bean
        UserRoleRepository userRoleRepository() {
            return mock(UserRoleRepository.class);
        }

        @Bean
        DashboardService dashboardService(
                TutorPayoutRepository tutorPayoutRepository,
                TutorClassRepository tutorClassRepository,
                TutorBankAccountRepository tutorBankAccountRepository,
                SessionRepository sessionRepository,
                EnrollmentRepository enrollmentRepository,
                SessionStudentTuitionRepository sessionStudentTuitionRepository,
                UserRepository userRepository,
                UserRoleRepository userRoleRepository
        ) {
            return new DashboardService(
                    tutorPayoutRepository,
                    tutorClassRepository,
                    tutorBankAccountRepository,
                    sessionRepository,
                    enrollmentRepository,
                    sessionStudentTuitionRepository,
                    userRepository,
                    userRoleRepository
            );
        }
    }

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private TutorClassRepository tutorClassRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionStudentTuitionRepository sessionStudentTuitionRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void rosterDeniedWithoutTutorRole() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        UUID classId = UUID.randomUUID();

        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(classId);
        tutorClass.setTutor(tutor);
        when(tutorClassRepository.findById(classId)).thenReturn(Optional.of(tutorClass));

        // PreAuthorize should block before any repository logic is required.
        org.junit.jupiter.api.Assertions.assertThrows(
                AccessDeniedException.class,
                () -> dashboardService.tutorClassRoster(tutor, classId)
        );
    }

    @Test
    @WithMockUser(roles = "TUTOR")
    void rosterReturnsLatestTuitionPerStudent() {
        UUID classId = UUID.randomUUID();
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        tutor.setEmail("tutor@example.com");

        User student1 = new User();
        student1.setId(UUID.randomUUID());
        student1.setName("Student A");

        User student2 = new User();
        student2.setId(UUID.randomUUID());
        student2.setName("Student B");

        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(classId);
        tutorClass.setTutor(tutor);

        when(tutorClassRepository.findById(classId)).thenReturn(Optional.of(tutorClass));

        Enrollment e1 = new Enrollment();
        e1.setStudent(student1);
        e1.setStatus(EnrollmentStatus.ACTIVE);
        Enrollment e2 = new Enrollment();
        e2.setStudent(student2);
        e2.setStatus(EnrollmentStatus.ACTIVE);

        when(enrollmentRepository.findByTutorClassIdAndStatus(classId, EnrollmentStatus.ACTIVE))
                .thenReturn(List.of(e1, e2));

        Session latest = new Session();
        latest.setId(UUID.randomUUID());
        when(sessionRepository.findTopByTutorClassIdOrderByDateDesc(classId)).thenReturn(Optional.of(latest));

        SessionStudentTuition line1 = new SessionStudentTuition();
        line1.setStudent(student1);
        line1.setTuitionAtLog(111000L);
        SessionStudentTuition line2 = new SessionStudentTuition();
        line2.setStudent(student2);
        line2.setTuitionAtLog(222000L);

        when(sessionStudentTuitionRepository.findBySessionIdWithStudent(latest.getId()))
                .thenReturn(List.of(line1, line2));

        TutorClassRosterResponse roster = dashboardService.tutorClassRoster(tutor, classId);
        assertNotNull(roster);
        assertEquals(2, roster.students().size());
        assertEquals(111000L, roster.students().get(0).tuitionAtLog());
        assertEquals(222000L, roster.students().get(1).tuitionAtLog());
    }
}

