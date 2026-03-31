package com.example.tms;

import com.example.tms.api.dto.dashboard.TutorClassOverviewResponse;
import com.example.tms.entity.Session;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTests {
    @Mock
    private TutorPayoutRepository tutorPayoutRepository;
    @Mock
    private TutorClassRepository tutorClassRepository;
    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private SessionStudentTuitionRepository sessionStudentTuitionRepository;

    @Mock
    private TutorBankAccountRepository tutorBankAccountRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(
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

    @Test
    void tutorClassOverviewReturnsClassMetrics() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());

        Subject subject = new Subject();
        subject.setName("Math");

        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(UUID.randomUUID());
        tutorClass.setTutor(tutor);
        tutorClass.setSubject(subject);
        tutorClass.setStatus(ClassStatus.ACTIVE);
        tutorClass.setPricePerHour(250000L);
        tutorClass.setDefaultSalaryRate(new BigDecimal("0.7500"));

        Session latest = new Session();
        latest.setDate(LocalDate.of(2026, 3, 20));

        when(tutorClassRepository.findByTutorId(tutor.getId())).thenReturn(List.of(tutorClass));
        when(sessionRepository.countByTutorClassId(tutorClass.getId())).thenReturn(5L);
        when(sessionRepository.findTopByTutorClassIdOrderByDateDesc(tutorClass.getId())).thenReturn(Optional.of(latest));

        List<TutorClassOverviewResponse> response = dashboardService.tutorClassOverview(tutor);

        assertEquals(1, response.size());
        assertEquals("Math", response.getFirst().subjectName());
        assertEquals("ACTIVE", response.getFirst().classStatus());
        assertEquals(5L, response.getFirst().sessionCount());
        assertEquals(LocalDate.of(2026, 3, 20), response.getFirst().latestSessionDate());
    }
}
