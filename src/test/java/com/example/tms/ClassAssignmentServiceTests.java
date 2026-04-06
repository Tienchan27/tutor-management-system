package com.example.tms;

import com.example.tms.api.dto.classes.PublishClassRequest;
import com.example.tms.api.dto.classes.PublishClassStudentRequest;
import com.example.tms.api.dto.classes.PublishedClassResponse;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.TutorClassApplication;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.TutorClassApplicationStatus;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SubjectRepository;
import com.example.tms.repository.TutorClassApplicationRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.security.RoleGuard;
import com.example.tms.service.ClassAssignmentService;
import com.example.tms.service.MailService;
import com.example.tms.service.NotificationOutboxService;
import com.example.tms.service.UserRoleService;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassAssignmentServiceTests {
    @Mock
    private SubjectRepository subjectRepository;
    @Mock
    private TutorClassRepository tutorClassRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private TutorClassApplicationRepository classApplicationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleService userRoleService;
    @Mock
    private RoleGuard roleGuard;
    @Mock
    private MailService mailService;
    @Mock
    private NotificationOutboxService notificationOutboxService;
    @Mock
    private RealtimeOutboxService realtimeOutboxService;

    private ClassAssignmentService classAssignmentService;

    @BeforeEach
    void setUp() {
        classAssignmentService = new ClassAssignmentService(
                subjectRepository,
                tutorClassRepository,
                enrollmentRepository,
                classApplicationRepository,
                userRepository,
                userRoleService,
                roleGuard,
                mailService,
                notificationOutboxService,
                realtimeOutboxService
        );
    }

    @Test
    void publishClassAutoCreatesPendingStudentWhenEmailNotFound() {
        User admin = user("admin@example.com", "Admin");
        Subject subject = new Subject();
        subject.setId(UUID.randomUUID());
        subject.setName("SAT Math");
        subject.setDefaultPricePerHour(180000L);

        TutorClass savedClass = new TutorClass();
        savedClass.setId(UUID.randomUUID());
        savedClass.setSubject(subject);
        savedClass.setStatus(ClassStatus.AVAILABLE);
        savedClass.setPricePerHour(180000L);
        savedClass.setDisplayName("[SAT Math] Student");

        User pendingStudent = user("student@example.com", "Student");
        pendingStudent.setStatus(UserStatus.PENDING_VERIFICATION);

        when(subjectRepository.findById(subject.getId())).thenReturn(Optional.of(subject));
        when(userRepository.findByEmail("student@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(pendingStudent);
        when(tutorClassRepository.save(any(TutorClass.class))).thenReturn(savedClass);
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PublishedClassResponse response = classAssignmentService.publishClass(
                admin,
                new PublishClassRequest(
                        List.of(new PublishClassStudentRequest("student@example.com", "Student")),
                        subject.getId(),
                        null,
                        null,
                        "note"
                )
        );

        verify(enrollmentRepository).save(any(Enrollment.class));
        verify(mailService).sendStudentInvitationEmail("student@example.com");
        verify(userRoleService).ensureActiveRole(pendingStudent, RoleName.STUDENT, admin);
        assertEquals("SAT Math", response.subjectName());
        assertNotNull(response.classId());
    }

    @Test
    void applyClassCreatesPendingApplication() {
        User tutor = user("tutor@example.com", "Tutor");
        tutor.setId(UUID.randomUUID());

        Subject subject = new Subject();
        subject.setName("SAT Math");
        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(UUID.randomUUID());
        tutorClass.setSubject(subject);
        tutorClass.setStatus(ClassStatus.AVAILABLE);
        tutorClass.setPricePerHour(180000L);

        TutorClassApplication saved = new TutorClassApplication();
        saved.setId(UUID.randomUUID());
        saved.setTutor(tutor);
        saved.setTutorClass(tutorClass);
        saved.setStatus(TutorClassApplicationStatus.PENDING);
        saved.setAppliedAt(LocalDateTime.now());

        when(tutorClassRepository.findDetailedById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));
        when(classApplicationRepository.findByTutorClassIdAndTutorId(tutorClass.getId(), tutor.getId())).thenReturn(Optional.empty());
        when(classApplicationRepository.save(any(TutorClassApplication.class))).thenReturn(saved);

        var response = classAssignmentService.applyClass(tutor, tutorClass.getId());

        assertEquals("PENDING", response.status());
        assertEquals(tutorClass.getId(), response.classId());
    }

    private User user(String email, String name) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setName(name);
        return user;
    }
}
