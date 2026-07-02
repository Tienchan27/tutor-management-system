package com.example.tms;

import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassRosterServiceTests {

    @Mock private SubjectRepository subjectRepository;
    @Mock private TutorClassRepository tutorClassRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private TutorClassApplicationRepository classApplicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserRoleService userRoleService;
    @Mock private RoleGuard roleGuard;
    @Mock private MailService mailService;
    @Mock private NotificationOutboxService notificationOutboxService;
    @Mock private RealtimeOutboxService realtimeOutboxService;

    private ClassAssignmentService service() {
        return new ClassAssignmentService(
                subjectRepository, tutorClassRepository, enrollmentRepository,
                classApplicationRepository, userRepository, userRoleService,
                roleGuard, mailService, notificationOutboxService, realtimeOutboxService);
    }

    private TutorClass classWithStatus(ClassStatus status) {
        Subject subject = new Subject();
        subject.setName("IELTS");
        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(UUID.randomUUID());
        tutorClass.setSubject(subject);
        tutorClass.setStatus(status);
        tutorClass.setPricePerHour(150000L);
        return tutorClass;
    }

    private User existingStudent(String email) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail(email);
        u.setName("Student");
        return u;
    }

    private void stubEmptyRosterResponse(UUID classId) {
        lenient().when(enrollmentRepository.findByTutorClassIdAndStatus(classId, EnrollmentStatus.ACTIVE))
                .thenReturn(List.of());
        lenient().when(classApplicationRepository.findByClassIdOrderByAppliedAtAsc(classId))
                .thenReturn(List.of());
    }

    @Test
    void addRejectsWhenClassIsInactive() {
        TutorClass tutorClass = classWithStatus(ClassStatus.INACTIVE);
        when(tutorClassRepository.findDetailedById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));

        ApiException ex = assertThrows(ApiException.class,
                () -> service().addStudentToClass(new User(), tutorClass.getId(), "stu@x.com", "Stu"));
        assertEquals("CLASS_INACTIVE", ex.getErrorCode());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void addRejectsWhenStudentAlreadyEnrolled() {
        TutorClass tutorClass = classWithStatus(ClassStatus.ACTIVE);
        User student = existingStudent("stu@x.com");
        when(tutorClassRepository.findDetailedById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));
        when(userRepository.findByEmail("stu@x.com")).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByTutorClassIdAndStudentIdAndStatus(tutorClass.getId(), student.getId(), EnrollmentStatus.ACTIVE))
                .thenReturn(Optional.of(new Enrollment()));

        ApiException ex = assertThrows(ApiException.class,
                () -> service().addStudentToClass(new User(), tutorClass.getId(), "stu@x.com", "Stu"));
        assertEquals("STUDENT_ALREADY_ENROLLED", ex.getErrorCode());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void addCreatesActiveEnrollmentForNewMember() {
        TutorClass tutorClass = classWithStatus(ClassStatus.ACTIVE);
        User student = existingStudent("stu@x.com");
        when(tutorClassRepository.findDetailedById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));
        when(userRepository.findByEmail("stu@x.com")).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByTutorClassIdAndStudentIdAndStatus(tutorClass.getId(), student.getId(), EnrollmentStatus.ACTIVE))
                .thenReturn(Optional.empty());
        stubEmptyRosterResponse(tutorClass.getId());

        service().addStudentToClass(new User(), tutorClass.getId(), "stu@x.com", "Stu");

        ArgumentCaptor<Enrollment> captor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(captor.capture());
        assertEquals(EnrollmentStatus.ACTIVE, captor.getValue().getStatus());
    }

    @Test
    void removeSetsEnrollmentToLeft() {
        TutorClass tutorClass = classWithStatus(ClassStatus.ACTIVE);
        User student = existingStudent("stu@x.com");
        Enrollment enrollment = new Enrollment();
        enrollment.setStatus(EnrollmentStatus.ACTIVE);
        when(tutorClassRepository.findDetailedById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));
        when(enrollmentRepository.findByTutorClassIdAndStudentIdAndStatus(tutorClass.getId(), student.getId(), EnrollmentStatus.ACTIVE))
                .thenReturn(Optional.of(enrollment));
        stubEmptyRosterResponse(tutorClass.getId());

        service().removeStudentFromClass(new User(), tutorClass.getId(), student.getId());

        assertEquals(EnrollmentStatus.LEFT, enrollment.getStatus());
        verify(enrollmentRepository).save(enrollment);
    }

    @Test
    void removeRejectsWhenNotEnrolled() {
        TutorClass tutorClass = classWithStatus(ClassStatus.ACTIVE);
        UUID studentId = UUID.randomUUID();
        when(tutorClassRepository.findDetailedById(tutorClass.getId())).thenReturn(Optional.of(tutorClass));
        when(enrollmentRepository.findByTutorClassIdAndStudentIdAndStatus(tutorClass.getId(), studentId, EnrollmentStatus.ACTIVE))
                .thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class,
                () -> service().removeStudentFromClass(new User(), tutorClass.getId(), studentId));
        assertEquals("ENROLLMENT_NOT_FOUND", ex.getErrorCode());
    }
}
