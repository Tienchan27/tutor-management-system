package com.example.tms;

import com.example.tms.entity.Enrollment;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.service.AdminTutorRoleService;
import com.example.tms.service.NotificationOutboxService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminTutorRoleServiceTests {

    @Mock private UserRepository userRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private TutorClassRepository tutorClassRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private NotificationOutboxService notificationOutboxService;
    @Mock private RealtimeOutboxService realtimeOutboxService;

    private AdminTutorRoleService service() {
        return new AdminTutorRoleService(
                userRepository, userRoleRepository, tutorClassRepository,
                enrollmentRepository, notificationOutboxService, realtimeOutboxService);
    }

    @Test
    void revokingTutorClosesTheirClassesAndReleasesStudents() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        User tutor = new User();
        tutor.setId(UUID.randomUUID());

        UserRole tutorRole = new UserRole();
        tutorRole.setStatus(UserRoleStatus.ACTIVE);

        TutorClass activeClass = new TutorClass();
        activeClass.setId(UUID.randomUUID());
        activeClass.setStatus(ClassStatus.ACTIVE);
        Enrollment enrollment = new Enrollment();
        enrollment.setStatus(EnrollmentStatus.ACTIVE);

        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(userRoleRepository.findByUserIdAndRole(tutor.getId(), RoleName.TUTOR)).thenReturn(Optional.of(tutorRole));
        when(tutorClassRepository.findByTutorId(tutor.getId())).thenReturn(List.of(activeClass));
        when(enrollmentRepository.findByTutorClassIdAndStatus(activeClass.getId(), EnrollmentStatus.ACTIVE))
                .thenReturn(List.of(enrollment));

        service().revokeTutorRole(admin, tutor.getId(), "left the team");

        assertEquals(UserRoleStatus.REVOKED, tutorRole.getStatus());
        assertEquals(ClassStatus.INACTIVE, activeClass.getStatus());
        assertEquals(EnrollmentStatus.LEFT, enrollment.getStatus());
        verify(tutorClassRepository).save(activeClass);
        verify(enrollmentRepository).saveAll(List.of(enrollment));
    }

    @Test
    void rejectsRevokingAnAlreadyRevokedRole() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        User tutor = new User();
        tutor.setId(UUID.randomUUID());

        UserRole revoked = new UserRole();
        revoked.setStatus(UserRoleStatus.REVOKED);

        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(userRoleRepository.findByUserIdAndRole(tutor.getId(), RoleName.TUTOR)).thenReturn(Optional.of(revoked));

        ApiException ex = assertThrows(ApiException.class,
                () -> service().revokeTutorRole(admin, tutor.getId(), "again"));
        assertEquals("ROLE_ALREADY_REVOKED", ex.getErrorCode());
        // No class closing should happen on a no-op revoke.
        verify(tutorClassRepository, never()).findByTutorId(any());
    }
}
