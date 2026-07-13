package com.example.tms.service;

import com.example.tms.entity.Enrollment;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminTutorRoleService {
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final TutorClassRepository tutorClassRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationOutboxService notificationOutboxService;
    private final RealtimeOutboxService realtimeOutboxService;

    public AdminTutorRoleService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            TutorClassRepository tutorClassRepository,
            EnrollmentRepository enrollmentRepository,
            NotificationOutboxService notificationOutboxService,
            RealtimeOutboxService realtimeOutboxService
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.tutorClassRepository = tutorClassRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.notificationOutboxService = notificationOutboxService;
        this.realtimeOutboxService = realtimeOutboxService;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void revokeTutorRole(User admin, UUID tutorId, String reason) {
        // Validate tutor exists
        User tutor = userRepository.findById(tutorId)
                .orElseThrow(() -> ApiException.notFound("TUTOR_NOT_FOUND", "Tutor not found"));

        UserRole userRole = userRoleRepository.findByUserIdAndRole(tutorId, RoleName.TUTOR)
                .orElseThrow(() -> ApiException.notFound("TUTOR_ROLE_NOT_FOUND", "Tutor role not found"));

        if (userRole.getStatus() == UserRoleStatus.REVOKED) {
            throw ApiException.conflict("ROLE_ALREADY_REVOKED", "Tutor access is already revoked");
        }

        // Revoke only role
        userRole.setStatus(UserRoleStatus.REVOKED);
        userRole.setRevokedReason(reason);
        userRole.setUpdatedBy(admin);
        userRoleRepository.save(userRole);

        // A class is bound to exactly one tutor. Revoking the tutor closes every class they
        // taught — equivalent to deleting it: the class drops out of all active views and its
        // students are released, while session/payout history is preserved (no hard delete).
        // The admin re-creates fresh classes with a new tutor for any students who continue.
        closeClassesTaughtBy(tutorId);

        notificationOutboxService.enqueue(
                tutor,
                NotificationType.TUTOR_ROLE_REVOKED,
                "Tutor access revoked",
                "Admin revoked your tutor access. " + (reason == null || reason.isBlank() ? "" : ("Reason: " + reason.trim())),
                "user:" + tutorId
        );

        ClientEvent event = ClientEvent.of(
                ClientEventType.ROLE_CHANGED,
                "user:" + tutorId,
                null,
                Map.of("role", RoleName.TUTOR.name(), "status", UserRoleStatus.REVOKED.name())
        );
        realtimeOutboxService.enqueue("user:" + tutorId, null, event);
    }

    private void closeClassesTaughtBy(UUID tutorId) {
        List<TutorClass> taughtClasses = tutorClassRepository.findByTutorId(tutorId);
        for (TutorClass tutorClass : taughtClasses) {
            if (tutorClass.getStatus() == ClassStatus.INACTIVE) {
                continue;
            }
            tutorClass.setStatus(ClassStatus.INACTIVE);
            tutorClassRepository.save(tutorClass);

            List<Enrollment> activeEnrollments =
                    enrollmentRepository.findByTutorClassIdAndStatus(tutorClass.getId(), EnrollmentStatus.ACTIVE);
            for (Enrollment enrollment : activeEnrollments) {
                enrollment.setStatus(EnrollmentStatus.LEFT);
                enrollment.setLeftAt(LocalDateTime.now());
            }
            enrollmentRepository.saveAll(activeEnrollments);

            // Drop the class from tutor marketplace / admin views, like a deletion would.
            ClientEvent classEvent = ClientEvent.of(
                    ClientEventType.MARKETPLACE_UPDATED,
                    "role:" + RoleName.TUTOR.name(),
                    "class:" + tutorClass.getId(),
                    Map.of("classId", String.valueOf(tutorClass.getId()), "status", ClassStatus.INACTIVE.name())
            );
            realtimeOutboxService.enqueue("role:" + RoleName.TUTOR.name(), "class:" + tutorClass.getId(), classEvent);
        }
    }
}
