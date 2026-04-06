package com.example.tms;

import com.example.tms.api.dto.session.CreateSessionRequest;
import com.example.tms.api.dto.session.StudentTuitionRequest;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
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
import com.example.tms.service.NotificationOutboxService;
import com.example.tms.service.SessionService;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionServiceStudentTuitionLinesTests {

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private TutorClassRepository tutorClassRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private SessionStudentTuitionRepository sessionStudentTuitionRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private SessionFinancialEditAuditRepository auditRepository;

    @Mock
    private NotificationOutboxService notificationOutboxService;
    @Mock
    private RealtimeOutboxService realtimeOutboxService;

    @Test
    void createCreatesLineItemsAndKeepsTuitionSumConsistent() {
        // Arrange: tutor + class
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(UUID.randomUUID());
        tutorClass.setTutor(tutor);
        tutorClass.setSubject(new Subject());
        tutorClass.setPricePerHour(180000L);

        // Arrange: active enrollments (2 students)
        User s1 = new User();
        s1.setId(UUID.randomUUID());
        User s2 = new User();
        s2.setId(UUID.randomUUID());

        Enrollment e1 = new Enrollment();
        e1.setStudent(s1);
        e1.setStatus(EnrollmentStatus.ACTIVE);
        Enrollment e2 = new Enrollment();
        e2.setStudent(s2);
        e2.setStatus(EnrollmentStatus.ACTIVE);

        when(tutorClassRepository.findById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));
        when(enrollmentRepository.findByTutorClassIdAndStatus(tutorClass.getId(), EnrollmentStatus.ACTIVE))
                .thenReturn(List.of(e1, e2));

        // Saved session (needs ID for line items)
        Session saved = new Session();
        saved.setId(UUID.randomUUID());
        when(sessionRepository.save(any(Session.class))).thenReturn(saved);

        // sessionStudentTuitionRepository.saveAll return value ignored; return empty
        when(sessionStudentTuitionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        SessionService sessionService = new SessionService(
                sessionRepository,
                tutorClassRepository,
                enrollmentRepository,
                sessionStudentTuitionRepository,
                userRoleRepository,
                auditRepository,
                notificationOutboxService,
                realtimeOutboxService
        );

        // Provide per-student tuition
        long t1 = 100000L;
        long t2 = 200000L;
        CreateSessionRequest request = new CreateSessionRequest(
                tutorClass.getId(),
                LocalDate.now(),
                new BigDecimal("1.0"),
                List.of(
                        new StudentTuitionRequest(s1.getId(), t1),
                        new StudentTuitionRequest(s2.getId(), t2)
                ),
                new BigDecimal("0.75"),
                "2026-03",
                "note"
        );

        // Act
        Session result = sessionService.create(tutor, request);

        // Assert: session tuition sum equals sum of line items
        ArgumentCaptor<Session> sessionCaptor = ArgumentCaptor.forClass(Session.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        assertEquals(t1 + t2, sessionCaptor.getValue().getTuitionAtLog());

        ArgumentCaptor<Iterable<SessionStudentTuition>> linesCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(sessionStudentTuitionRepository).saveAll(linesCaptor.capture());

        long sumLines = 0L;
        int countLines = 0;
        for (SessionStudentTuition line : linesCaptor.getValue()) {
            sumLines += line.getTuitionAtLog();
            countLines++;
        }

        assertEquals(2, countLines);
        assertEquals(t1 + t2, sumLines);
        assertEquals(saved.getId(), result.getId());
    }
}

