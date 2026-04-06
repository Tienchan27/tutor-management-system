package com.example.tms.service;

import com.example.tms.api.dto.classes.ApplyClassResponse;
import com.example.tms.api.dto.classes.AvailableClassResponse;
import com.example.tms.api.dto.classes.PublishClassRequest;
import com.example.tms.api.dto.classes.PublishClassStudentRequest;
import com.example.tms.api.dto.classes.PublishedClassResponse;
import com.example.tms.api.dto.classes.StudentLookupResponse;
import com.example.tms.api.dto.classes.SubjectOptionResponse;
import com.example.tms.api.dto.classes.TutorClassApplicationResponse;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.TutorClassApplication;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.TutorClassApplicationStatus;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SubjectRepository;
import com.example.tms.repository.TutorClassApplicationRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.security.RoleGuard;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ClassAssignmentService {
    private final SubjectRepository subjectRepository;
    private final TutorClassRepository tutorClassRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TutorClassApplicationRepository classApplicationRepository;
    private final UserRepository userRepository;
    private final UserRoleService userRoleService;
    private final RoleGuard roleGuard;
    private final MailService mailService;
    private final NotificationOutboxService notificationOutboxService;
    private final RealtimeOutboxService realtimeOutboxService;

    public ClassAssignmentService(
            SubjectRepository subjectRepository,
            TutorClassRepository tutorClassRepository,
            EnrollmentRepository enrollmentRepository,
            TutorClassApplicationRepository classApplicationRepository,
            UserRepository userRepository,
            UserRoleService userRoleService,
            RoleGuard roleGuard,
            MailService mailService,
            NotificationOutboxService notificationOutboxService,
            RealtimeOutboxService realtimeOutboxService
    ) {
        this.subjectRepository = subjectRepository;
        this.tutorClassRepository = tutorClassRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.classApplicationRepository = classApplicationRepository;
        this.userRepository = userRepository;
        this.userRoleService = userRoleService;
        this.roleGuard = roleGuard;
        this.mailService = mailService;
        this.notificationOutboxService = notificationOutboxService;
        this.realtimeOutboxService = realtimeOutboxService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<SubjectOptionResponse> listSubjects() {
        return subjectRepository.findAll()
                .stream()
                .map(subject -> new SubjectOptionResponse(subject.getId(), subject.getName(), subject.getDefaultPricePerHour()))
                .toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public StudentLookupResponse lookupStudent(User admin, String email) {
        String normalizedEmail = normalizeEmail(email);
        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user == null) {
            return new StudentLookupResponse(false, normalizedEmail, defaultNameFromEmail(normalizedEmail));
        }
        return new StudentLookupResponse(true, normalizedEmail, user.getName());
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PublishedClassResponse publishClass(User admin, PublishClassRequest request) {
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new ApiException("Subject not found"));
        List<PublishClassStudentRequest> students = request.students();
        if (students == null || students.isEmpty()) {
            throw new ApiException("At least one student is required");
        }
        Map<String, PublishClassStudentRequest> deduplicatedStudents = new LinkedHashMap<>();
        for (PublishClassStudentRequest student : students) {
            String normalizedEmail = normalizeEmail(student.email());
            if (deduplicatedStudents.containsKey(normalizedEmail)) {
                throw new ApiException("Duplicate student email: " + normalizedEmail);
            }
            deduplicatedStudents.put(normalizedEmail, student);
        }

        List<User> resolvedStudents = deduplicatedStudents.values()
                .stream()
                .map(student -> resolveStudent(student.email(), student.name(), admin))
                .toList();

        TutorClass tutorClass = new TutorClass();
        tutorClass.setSubject(subject);
        tutorClass.setTutor(null);
        tutorClass.setPricePerHour(request.pricePerHour() == null ? subject.getDefaultPricePerHour() : request.pricePerHour());
        tutorClass.setStatus(ClassStatus.AVAILABLE);
        tutorClass.setDisplayName(buildDisplayName(
                request.displayName(),
                subject.getName(),
                resolvedStudents.stream().map(User::getName).toList()
        ));
        tutorClass.setNote(request.note());
        tutorClass = tutorClassRepository.save(tutorClass);
        TutorClass savedClass = tutorClass;

        List<Enrollment> enrollments = resolvedStudents.stream()
                .map(student -> {
                    Enrollment enrollment = new Enrollment();
                    enrollment.setTutorClass(savedClass);
                    enrollment.setStudent(student);
                    enrollment.setStatus(EnrollmentStatus.ACTIVE);
                    enrollment.setJoinedAt(LocalDateTime.now());
                    return enrollmentRepository.save(enrollment);
                })
                .toList();

        ClientEvent event = ClientEvent.of(
                ClientEventType.MARKETPLACE_UPDATED,
                "role:" + RoleName.TUTOR.name(),
                "class:" + savedClass.getId(),
                Map.of("classId", String.valueOf(savedClass.getId()), "status", savedClass.getStatus().name())
        );
        realtimeOutboxService.enqueue("role:" + RoleName.TUTOR.name(), "class:" + savedClass.getId(), event);

        return mapPublishedClassResponse(savedClass, enrollments, List.of());
    }

    @PreAuthorize("hasRole('ADMIN')")
    public Slice<PublishedClassResponse> listPublishedClasses(User admin, Pageable pageable) {
        return tutorClassRepository.findByStatus(ClassStatus.AVAILABLE, pageable)
                .map(this::toPublishedClassResponse);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public Slice<TutorClassApplicationResponse> listClassApplications(User admin, UUID classId, Pageable pageable) {
        tutorClassRepository.findById(classId).orElseThrow(() -> new ApiException("Class not found"));
        return classApplicationRepository.findByClassId(classId, pageable)
                .map(this::toApplicationResponse);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PublishedClassResponse approveApplication(User admin, UUID applicationId) {
        TutorClassApplication approved = classApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ApiException("Application not found"));

        TutorClass tutorClass = tutorClassRepository.findDetailedById(approved.getTutorClass().getId())
                .orElseThrow(() -> new ApiException("Class not found"));
        if (tutorClass.getStatus() != ClassStatus.AVAILABLE) {
            throw new ApiException("Class is not available for assignment");
        }

        tutorClass.setTutor(approved.getTutor());
        tutorClass.setStatus(ClassStatus.ACTIVE);
        tutorClassRepository.save(tutorClass);

        List<TutorClassApplication> allApplications = classApplicationRepository.findByClassIdOrderByAppliedAtAsc(tutorClass.getId());
        for (TutorClassApplication application : allApplications) {
            if (application.getId().equals(approved.getId())) {
                application.setStatus(TutorClassApplicationStatus.APPROVED);
                application.setReviewedBy(admin);
                application.setReviewedAt(LocalDateTime.now());
                application.setRejectionReason(null);
            } else if (application.getStatus() == TutorClassApplicationStatus.PENDING) {
                application.setStatus(TutorClassApplicationStatus.REJECTED);
                application.setReviewedBy(admin);
                application.setReviewedAt(LocalDateTime.now());
                application.setRejectionReason("Assigned to another tutor");
            }
            classApplicationRepository.save(application);
        }

        notificationOutboxService.enqueue(
                approved.getTutor(),
                NotificationType.CLASS_APPLICATION_APPROVED,
                "Class application approved",
                "You have been assigned to class: " + tutorClass.getDisplayName(),
                "class:" + tutorClass.getId()
        );

        for (TutorClassApplication application : allApplications) {
            if (application.getStatus() == TutorClassApplicationStatus.REJECTED
                    && application.getTutor() != null
                    && !application.getTutor().getId().equals(approved.getTutor().getId())) {
                notificationOutboxService.enqueue(
                        application.getTutor(),
                        NotificationType.CLASS_APPLICATION_REJECTED,
                        "Class application rejected",
                        "Your application for class " + tutorClass.getDisplayName() + " was rejected. Reason: " + application.getRejectionReason(),
                        "class:" + tutorClass.getId()
                );

                ClientEvent rejectedTutorEvent = ClientEvent.of(
                        ClientEventType.DASHBOARD_INVALIDATE,
                        "user:" + application.getTutor().getId(),
                        "class:" + tutorClass.getId(),
                        Map.of("classId", String.valueOf(tutorClass.getId()))
                );
                realtimeOutboxService.enqueue("user:" + application.getTutor().getId(), "class:" + tutorClass.getId(), rejectedTutorEvent);
            }
        }

        ClientEvent tutorEvent = ClientEvent.of(
                ClientEventType.DASHBOARD_INVALIDATE,
                "user:" + approved.getTutor().getId(),
                "class:" + tutorClass.getId(),
                Map.of("classId", String.valueOf(tutorClass.getId()))
        );
        realtimeOutboxService.enqueue("user:" + approved.getTutor().getId(), "class:" + tutorClass.getId(), tutorEvent);

        ClientEvent marketplaceEvent = ClientEvent.of(
                ClientEventType.MARKETPLACE_UPDATED,
                "role:" + RoleName.TUTOR.name(),
                "class:" + tutorClass.getId(),
                Map.of("classId", String.valueOf(tutorClass.getId()), "status", tutorClass.getStatus().name())
        );
        realtimeOutboxService.enqueue("role:" + RoleName.TUTOR.name(), "class:" + tutorClass.getId(), marketplaceEvent);

        ClientEvent adminQueueEvent = ClientEvent.of(
                ClientEventType.DASHBOARD_INVALIDATE,
                "role:" + RoleName.ADMIN.name(),
                "class:" + tutorClass.getId(),
                Map.of("classId", String.valueOf(tutorClass.getId()), "reason", "APPLICATION_REVIEWED")
        );
        realtimeOutboxService.enqueue("role:" + RoleName.ADMIN.name(), "class:" + tutorClass.getId(), adminQueueEvent);

        return toPublishedClassResponse(tutorClass);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TutorClassApplicationResponse rejectApplication(User admin, UUID applicationId, String reason) {
        TutorClassApplication application = classApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ApiException("Application not found"));

        if (application.getStatus() != TutorClassApplicationStatus.PENDING) {
            throw new ApiException("Only pending applications can be rejected");
        }

        application.setStatus(TutorClassApplicationStatus.REJECTED);
        application.setReviewedBy(admin);
        application.setReviewedAt(LocalDateTime.now());
        application.setRejectionReason(reason == null || reason.isBlank() ? "Rejected by admin" : reason.trim());
        application = classApplicationRepository.save(application);

        notificationOutboxService.enqueue(
                application.getTutor(),
                NotificationType.CLASS_APPLICATION_REJECTED,
                "Class application rejected",
                "Your application was rejected. Reason: " + application.getRejectionReason(),
                "class:" + application.getTutorClass().getId()
        );

        if (application.getTutor() != null) {
            ClientEvent tutorEvent = ClientEvent.of(
                    ClientEventType.DASHBOARD_INVALIDATE,
                    "user:" + application.getTutor().getId(),
                    "class:" + application.getTutorClass().getId(),
                    Map.of("classId", String.valueOf(application.getTutorClass().getId()))
            );
            realtimeOutboxService.enqueue("user:" + application.getTutor().getId(), "class:" + application.getTutorClass().getId(), tutorEvent);
        }

        ClientEvent adminQueueEvent = ClientEvent.of(
                ClientEventType.DASHBOARD_INVALIDATE,
                "role:" + RoleName.ADMIN.name(),
                "class:" + application.getTutorClass().getId(),
                Map.of("classId", String.valueOf(application.getTutorClass().getId()), "reason", "APPLICATION_REVIEWED")
        );
        realtimeOutboxService.enqueue("role:" + RoleName.ADMIN.name(), "class:" + application.getTutorClass().getId(), adminQueueEvent);
        return toApplicationResponse(application);
    }

    @PreAuthorize("hasRole('TUTOR')")
    public Slice<AvailableClassResponse> listAvailableClasses(User tutor, Pageable pageable) {
        return tutorClassRepository.findByStatus(ClassStatus.AVAILABLE, pageable)
                .map(tutorClass -> toAvailableClassResponse(tutorClass, tutor));
    }

    @Transactional
    @PreAuthorize("hasRole('TUTOR')")
    public ApplyClassResponse applyClass(User tutor, UUID classId) {
        TutorClass tutorClass = tutorClassRepository.findDetailedById(classId)
                .orElseThrow(() -> new ApiException("Class not found"));
        if (tutorClass.getStatus() != ClassStatus.AVAILABLE) {
            throw new ApiException("Class is no longer available");
        }

        TutorClassApplication existing = classApplicationRepository.findByTutorClassIdAndTutorId(classId, tutor.getId()).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == TutorClassApplicationStatus.PENDING) {
                return new ApplyClassResponse(existing.getId(), classId, existing.getStatus().name(), existing.getAppliedAt());
            }
            if (existing.getStatus() == TutorClassApplicationStatus.APPROVED) {
                throw new ApiException("You already got approved for this class");
            }
            existing.setStatus(TutorClassApplicationStatus.PENDING);
            existing.setReviewedBy(null);
            existing.setReviewedAt(null);
            existing.setRejectionReason(null);
            existing = classApplicationRepository.save(existing);
            ClientEvent adminQueueEvent = ClientEvent.of(
                    ClientEventType.DASHBOARD_INVALIDATE,
                    "role:" + RoleName.ADMIN.name(),
                    "class:" + classId,
                    Map.of("classId", String.valueOf(classId), "reason", "TUTOR_APPLIED")
            );
            realtimeOutboxService.enqueue("role:" + RoleName.ADMIN.name(), "class:" + classId, adminQueueEvent);
            return new ApplyClassResponse(existing.getId(), classId, existing.getStatus().name(), existing.getAppliedAt());
        }

        TutorClassApplication application = new TutorClassApplication();
        application.setTutorClass(tutorClass);
        application.setTutor(tutor);
        application.setStatus(TutorClassApplicationStatus.PENDING);
        application = classApplicationRepository.save(application);

        ClientEvent adminQueueEvent = ClientEvent.of(
                ClientEventType.DASHBOARD_INVALIDATE,
                "role:" + RoleName.ADMIN.name(),
                "class:" + classId,
                Map.of("classId", String.valueOf(classId), "reason", "TUTOR_APPLIED")
        );
        realtimeOutboxService.enqueue("role:" + RoleName.ADMIN.name(), "class:" + classId, adminQueueEvent);
        return new ApplyClassResponse(application.getId(), classId, application.getStatus().name(), application.getAppliedAt());
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','TUTOR')")
    public PublishedClassResponse updateClassDisplayName(User actor, UUID classId, String displayName) {
        TutorClass tutorClass = tutorClassRepository.findDetailedById(classId)
                .orElseThrow(() -> new ApiException("Class not found"));

        boolean isAdmin = hasRole(actor, RoleName.ADMIN);
        boolean isAssignedTutor = tutorClass.getTutor() != null
                && tutorClass.getTutor().getId().equals(actor.getId())
                && hasRole(actor, RoleName.TUTOR);
        if (!isAdmin && !isAssignedTutor) {
            throw new ApiException("Not authorized to rename this class");
        }

        tutorClass.setDisplayName(displayName.trim());
        tutorClass = tutorClassRepository.save(tutorClass);
        return toPublishedClassResponse(tutorClass);
    }

    private boolean hasRole(User user, RoleName roleName) {
        try {
            roleGuard.requireRole(user, roleName);
            return true;
        } catch (ApiException ex) {
            return false;
        }
    }

    private User resolveStudent(String studentEmail, String studentName, User admin) {
        String normalizedEmail = normalizeEmail(studentEmail);
        User existing = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (existing != null) {
            userRoleService.ensureActiveRole(existing, RoleName.STUDENT, admin);
            return existing;
        }

        User pendingStudent = new User();
        pendingStudent.setName(resolveStudentName(studentName, normalizedEmail));
        pendingStudent.setEmail(normalizedEmail);
        pendingStudent.setPassword(null);
        pendingStudent.setStatus(UserStatus.PENDING_VERIFICATION);
        pendingStudent = userRepository.save(pendingStudent);
        userRoleService.ensureActiveRole(pendingStudent, RoleName.STUDENT, admin);
        mailService.sendStudentInvitationEmail(normalizedEmail);
        return pendingStudent;
    }

    private String buildDisplayName(String requestedName, String subjectName, List<String> studentNames) {
        if (requestedName != null && !requestedName.isBlank()) {
            return requestedName.trim();
        }
        return defaultClassName(subjectName, studentNames);
    }

    private String defaultClassName(String subjectName, List<String> studentNames) {
        if (studentNames == null || studentNames.isEmpty()) {
            return "[" + subjectName + "] Class";
        }
        return "[" + subjectName + "] " + String.join(" - ", studentNames);
    }

    private PublishedClassResponse toPublishedClassResponse(TutorClass tutorClass) {
        List<Enrollment> enrollments = enrollmentRepository.findByTutorClassIdAndStatus(tutorClass.getId(), EnrollmentStatus.ACTIVE);
        List<TutorClassApplication> applications = classApplicationRepository.findByClassIdOrderByAppliedAtAsc(tutorClass.getId());
        return mapPublishedClassResponse(tutorClass, enrollments, applications);
    }

    private PublishedClassResponse mapPublishedClassResponse(
            TutorClass tutorClass,
            List<Enrollment> enrollments,
            List<TutorClassApplication> applications
    ) {
        List<String> studentNames = enrollments.stream()
                .map(enrollment -> enrollment.getStudent().getName())
                .toList();

        String effectiveDisplayName = tutorClass.getDisplayName();
        if (effectiveDisplayName == null || effectiveDisplayName.isBlank()) {
            effectiveDisplayName = defaultClassName(tutorClass.getSubject().getName(), studentNames);
        }

        return new PublishedClassResponse(
                tutorClass.getId(),
                effectiveDisplayName,
                tutorClass.getSubject().getName(),
                tutorClass.getPricePerHour(),
                tutorClass.getStatus().name(),
                tutorClass.getNote(),
                studentNames,
                applications.stream().map(this::toApplicationResponse).toList()
        );
    }

    private AvailableClassResponse toAvailableClassResponse(TutorClass tutorClass, User tutor) {
        List<Enrollment> enrollments = enrollmentRepository.findByTutorClassIdAndStatus(tutorClass.getId(), EnrollmentStatus.ACTIVE);
        List<String> studentNames = enrollments.stream().map(enrollment -> enrollment.getStudent().getName()).toList();
        boolean hasApplied = classApplicationRepository.findByTutorClassIdAndTutorId(tutorClass.getId(), tutor.getId())
                .map(application -> application.getStatus() == TutorClassApplicationStatus.PENDING)
                .orElse(false);

        String displayName = tutorClass.getDisplayName();
        if (displayName == null || displayName.isBlank()) {
            displayName = defaultClassName(tutorClass.getSubject().getName(), studentNames);
        }

        return new AvailableClassResponse(
                tutorClass.getId(),
                displayName,
                tutorClass.getSubject().getName(),
                tutorClass.getPricePerHour(),
                tutorClass.getNote(),
                studentNames,
                hasApplied
        );
    }

    private TutorClassApplicationResponse toApplicationResponse(TutorClassApplication application) {
        return new TutorClassApplicationResponse(
                application.getId(),
                application.getTutor().getId(),
                application.getTutor().getName(),
                application.getTutor().getEmail(),
                application.getStatus().name(),
                application.getAppliedAt(),
                application.getReviewedAt(),
                application.getRejectionReason()
        );
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ApiException("Student email is required");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String defaultNameFromEmail(String email) {
        int atIndex = email.indexOf('@');
        String base = atIndex > 0 ? email.substring(0, atIndex) : "student";
        if (base.isBlank()) {
            return "Student";
        }
        return Character.toUpperCase(base.charAt(0)) + base.substring(1);
    }

    private String resolveStudentName(String requestedName, String email) {
        if (requestedName == null || requestedName.isBlank()) {
            return defaultNameFromEmail(email);
        }
        String trimmed = requestedName.trim();
        return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
    }
}
