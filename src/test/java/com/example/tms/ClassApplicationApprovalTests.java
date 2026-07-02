package com.example.tms;

import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.TutorClassApplication;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.TutorClassApplicationStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SubjectRepository;
import com.example.tms.repository.TutorClassApplicationRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.service.ClassAssignmentService;
import com.example.tms.service.MailService;
import com.example.tms.service.NotificationOutboxService;
import com.example.tms.service.UserRoleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassApplicationApprovalTests {

    @Mock private SubjectRepository subjectRepository;
    @Mock private TutorClassRepository tutorClassRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private TutorClassApplicationRepository classApplicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserRoleService userRoleService;
    @Mock private MailService mailService;
    @Mock private NotificationOutboxService notificationOutboxService;
    @Mock private RealtimeOutboxService realtimeOutboxService;

    private ClassAssignmentService service() {
        return new ClassAssignmentService(
                subjectRepository, tutorClassRepository, enrollmentRepository,
                classApplicationRepository, userRepository, userRoleService,
                mailService, notificationOutboxService, realtimeOutboxService);
    }

    private TutorClassApplication application(TutorClassApplicationStatus status, TutorClass tutorClass) {
        TutorClassApplication app = new TutorClassApplication();
        app.setId(UUID.randomUUID());
        app.setStatus(status);
        app.setTutorClass(tutorClass);
        return app;
    }

    private TutorClass classWithStatus(ClassStatus status) {
        Subject subject = new Subject();
        subject.setName("IELTS");
        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(UUID.randomUUID());
        tutorClass.setSubject(subject);
        tutorClass.setStatus(status);
        tutorClass.setPricePerHour(180000L);
        return tutorClass;
    }

    @Test
    void rejectsApprovingAnAlreadyReviewedApplication() {
        TutorClass tutorClass = classWithStatus(ClassStatus.AVAILABLE);
        TutorClassApplication rejected = application(TutorClassApplicationStatus.REJECTED, tutorClass);
        when(classApplicationRepository.findById(rejected.getId())).thenReturn(Optional.of(rejected));

        User admin = new User();
        admin.setId(UUID.randomUUID());

        ApiException ex = assertThrows(ApiException.class,
                () -> service().approveApplication(admin, rejected.getId()));
        assertEquals("APPLICATION_NOT_PENDING", ex.getErrorCode());
        // Must not have touched the class or assigned anyone.
        verify(tutorClassRepository, never()).findDetailedById(any());
        verify(tutorClassRepository, never()).save(any());
    }

    @Test
    void rejectsApprovingWhenClassIsNoLongerAvailable() {
        TutorClass tutorClass = classWithStatus(ClassStatus.ACTIVE);
        TutorClassApplication pending = application(TutorClassApplicationStatus.PENDING, tutorClass);
        when(classApplicationRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(tutorClassRepository.findDetailedById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));

        User admin = new User();
        admin.setId(UUID.randomUUID());

        ApiException ex = assertThrows(ApiException.class,
                () -> service().approveApplication(admin, pending.getId()));
        assertEquals("CLASS_NOT_AVAILABLE", ex.getErrorCode());
        verify(tutorClassRepository, never()).save(any());
    }
}
