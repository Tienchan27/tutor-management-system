package com.example.tms.service;

import com.example.tms.api.dto.session.CreateSessionRequest;
import com.example.tms.api.dto.session.SessionListItemResponse;
import com.example.tms.api.mapper.SessionMapper;
import com.example.tms.api.dto.session.TutorSessionClassOptionResponse;
import com.example.tms.api.dto.session.TutorSessionStudentOptionResponse;
import com.example.tms.api.dto.session.UpdateSessionRequest;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionFinancialEditAudit;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.util.ClassDisplayNames;
import com.example.tms.realtime.core.ClientEvent;
import com.example.tms.realtime.core.ClientEventType;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.SessionFinancialEditAuditRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.time.YearMonth;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.UUID;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final TutorClassRepository tutorClassRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SessionStudentTuitionRepository sessionStudentTuitionRepository;
    private final UserRoleRepository userRoleRepository;
    private final SessionFinancialEditAuditRepository auditRepository;
    private final TutorPayoutRepository tutorPayoutRepository;
    private final NotificationOutboxService notificationOutboxService;
    private final RealtimeOutboxService realtimeOutboxService;

    public SessionService(
            SessionRepository sessionRepository,
            TutorClassRepository tutorClassRepository,
            EnrollmentRepository enrollmentRepository,
            SessionStudentTuitionRepository sessionStudentTuitionRepository,
            UserRoleRepository userRoleRepository,
            SessionFinancialEditAuditRepository auditRepository,
            TutorPayoutRepository tutorPayoutRepository,
            NotificationOutboxService notificationOutboxService,
            RealtimeOutboxService realtimeOutboxService
    ) {
        this.sessionRepository = sessionRepository;
        this.tutorClassRepository = tutorClassRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.sessionStudentTuitionRepository = sessionStudentTuitionRepository;
        this.userRoleRepository = userRoleRepository;
        this.auditRepository = auditRepository;
        this.tutorPayoutRepository = tutorPayoutRepository;
        this.notificationOutboxService = notificationOutboxService;
        this.realtimeOutboxService = realtimeOutboxService;
    }

    private List<Long> splitTotalEvenly(long total, int parts) {
        if (parts <= 0) {
            return List.of();
        }
        long base = total / parts;
        long remainder = total % parts;
        return IntStream.range(0, parts)
                .mapToLong(i -> base + (i < remainder ? 1 : 0))
                .boxed()
                .toList();
    }

    private void syncSessionTuitionLines(Session session, long totalTuition) {
        List<SessionStudentTuition> existingLines = sessionStudentTuitionRepository.findBySessionId(session.getId());

        // If legacy session exists without line items, create them from current active enrollments.
        if (existingLines.isEmpty()) {
            List<Enrollment> activeEnrollments = enrollmentRepository.findByTutorClassIdAndStatus(
                    session.getTutorClass().getId(),
                    EnrollmentStatus.ACTIVE
            );
            if (activeEnrollments.isEmpty()) {
                throw new ApiException("No active students to sync tuition lines");
            }

            List<Long> perStudent = splitTotalEvenly(totalTuition, activeEnrollments.size());
            List<SessionStudentTuition> toSave = IntStream.range(0, activeEnrollments.size())
                    .mapToObj(i -> {
                        Enrollment enrollment = activeEnrollments.get(i);
                        SessionStudentTuition line = new SessionStudentTuition();
                        line.setSession(session);
                        line.setStudent(enrollment.getStudent());
                        line.setTuitionAtLog(perStudent.get(i));
                        return line;
                    })
                    .toList();

            sessionStudentTuitionRepository.saveAll(toSave);
            return;
        }

        // Keep distribution deterministic across re-sync calls.
        existingLines.sort(Comparator.comparing(t -> t.getStudent().getId()));
        List<Long> perStudent = splitTotalEvenly(totalTuition, existingLines.size());
        IntStream.range(0, existingLines.size()).forEach(i -> existingLines.get(i).setTuitionAtLog(perStudent.get(i)));
        sessionStudentTuitionRepository.saveAll(existingLines);
    }

    @Transactional
    @PreAuthorize("hasRole('TUTOR')")
    public SessionListItemResponse create(User tutor, CreateSessionRequest request) {
        TutorClass tutorClass = tutorClassRepository.findById(request.classId())
                .orElseThrow(() -> ApiException.notFound("CLASS_NOT_FOUND", "Class not found"));
        if (!tutorClass.getTutor().getId().equals(tutor.getId())) {
            throw ApiException.forbidden("FORBIDDEN", "Tutor can only log own class session");
        }
        String resolvedPayrollMonth = request.payrollMonth() == null || request.payrollMonth().isBlank()
                ? YearMonth.now().toString()
                : request.payrollMonth();
        // Cannot log a session into a month whose payout is already finalized — it would never be paid.
        assertMonthNotFinalized(tutorClass.getTutor().getId(), resolvedPayrollMonth);
        List<Enrollment> activeEnrollments = enrollmentRepository.findByTutorClassIdAndStatus(
                tutorClass.getId(),
                EnrollmentStatus.ACTIVE
        );
        if (activeEnrollments.isEmpty()) {
            throw new ApiException("No active students in this class");
        }

        Set<UUID> activeStudentIds = activeEnrollments.stream()
                .map(e -> e.getStudent().getId())
                .collect(Collectors.toSet());

        Map<UUID, Long> tuitionByStudentId = request.studentTuitions().stream()
                .collect(Collectors.toMap(
                        t -> t.studentId(),
                        t -> t.tuitionAtLog()
                ));

        // Validate request contains only students currently active in this class.
        for (UUID studentId : tuitionByStudentId.keySet()) {
            if (!activeStudentIds.contains(studentId)) {
                throw new ApiException("Student is not active in this class");
            }
        }

        // Build tuition per active enrollment (preserve stable ordering from EnrollmentRepository query).
        List<Long> perStudentTuition = activeEnrollments.stream()
                .map(enrollment -> {
                    Long provided = tuitionByStudentId.get(enrollment.getStudent().getId());
                    if (provided != null) {
                        return provided;
                    }
                    // Fallback: if tutor didn't provide tuition for some active student, derive from pricePerHour * duration.
                    BigDecimal tuition = BigDecimal.valueOf(tutorClass.getPricePerHour())
                            .multiply(request.durationHours())
                            .setScale(0, RoundingMode.HALF_UP);
                    return tuition.longValueExact();
                })
                .toList();

        long tuitionSum = perStudentTuition.stream().mapToLong(Long::longValue).sum();

        Session session = new Session();
        session.setTutorClass(tutorClass);
        session.setDate(request.date());
        session.setDurationHours(request.durationHours());
        session.setTuitionAtLog(tuitionSum);
        session.setSalaryRateAtLog(request.salaryRateAtLog());
        session.setPayrollMonth(resolvedPayrollMonth);
        session.setNote(request.note());
        session.setCreatedBy(tutor);
        session.setUpdatedBy(tutor);
        Session saved = sessionRepository.save(session);

        List<SessionStudentTuition> lines = IntStream.range(0, activeEnrollments.size())
                .mapToObj(i -> {
                    Enrollment enrollment = activeEnrollments.get(i);
                    SessionStudentTuition line = new SessionStudentTuition();
                    line.setSession(saved);
                    line.setStudent(enrollment.getStudent());
                    line.setTuitionAtLog(perStudentTuition.get(i));
                    return line;
                })
                .toList();
        sessionStudentTuitionRepository.saveAll(lines);

        return SessionMapper.toListItemResponse(saved);
    }

    @Transactional
    @PreAuthorize("hasRole('TUTOR')")
    public SessionListItemResponse updateSession(User tutor, UUID sessionId, UpdateSessionRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> ApiException.notFound("SESSION_NOT_FOUND", "Session not found"));
        if (!session.getTutorClass().getTutor().getId().equals(tutor.getId())) {
            throw ApiException.forbidden("FORBIDDEN", "Tutor can only edit own class session");
        }

        // Once the payroll month has been finalized (payout LOCKED or PAID), the tutor must not be
        // able to retroactively change financial figures (their own rate, tuition) or move the
        // session out of that month. Guard the current month, and — if the month is changing — the
        // target month too (no moving a session into an already-finalized month).
        assertMonthNotFinalized(tutor.getId(), session.getPayrollMonth());
        if (request.payrollMonth() != null && !request.payrollMonth().isBlank()
                && !request.payrollMonth().equals(session.getPayrollMonth())) {
            assertMonthNotFinalized(tutor.getId(), request.payrollMonth());
        }

        auditIfChanged(session, tutor, "tuitionAtLog", String.valueOf(session.getTuitionAtLog()), String.valueOf(request.tuitionAtLog()), request.reason());
        auditIfChanged(session, tutor, "salaryRateAtLog", String.valueOf(session.getSalaryRateAtLog()), String.valueOf(request.salaryRateAtLog()), request.reason());
        auditIfChanged(session, tutor, "payrollMonth", session.getPayrollMonth(), request.payrollMonth(), request.reason());
        auditIfChanged(session, tutor, "date", String.valueOf(session.getDate()),
                request.date() == null ? null : request.date().toString(), request.reason());
        auditIfChanged(session, tutor, "durationHours", String.valueOf(session.getDurationHours()),
                request.durationHours() == null ? null : request.durationHours().toString(), request.reason());

        if (request.date() != null) {
            session.setDate(request.date());
        }
        if (request.durationHours() != null) {
            session.setDurationHours(request.durationHours());
        }
        if (request.tuitionAtLog() != null) {
            syncSessionTuitionLines(session, request.tuitionAtLog());
            session.setTuitionAtLog(request.tuitionAtLog());
        }
        if (request.salaryRateAtLog() != null) {
            session.setSalaryRateAtLog(request.salaryRateAtLog());
        }
        if (request.payrollMonth() != null && !request.payrollMonth().isBlank()) {
            session.setPayrollMonth(request.payrollMonth());
        }
        if (request.note() != null) {
            session.setNote(request.note());
        }
        session.setUpdatedBy(tutor);
        Session saved = sessionRepository.save(session);

        List<UserRole> admins = userRoleRepository.findByRoleAndStatus(RoleName.ADMIN, UserRoleStatus.ACTIVE);
        for (UserRole userRole : admins) {
            notificationOutboxService.enqueue(
                    userRole.getUser(),
                    NotificationType.SESSION_FINANCIAL_EDIT,
                    "Session financial updated",
                    "Tutor " + tutor.getEmail() + " updated session " + saved.getId(),
                    "session:" + saved.getId()
            );
        }

        ClientEvent tutorEvent = ClientEvent.of(
                ClientEventType.SESSION_FINANCIAL_UPDATED,
                "user:" + tutor.getId(),
                "session:" + saved.getId(),
                Map.of("sessionId", String.valueOf(saved.getId()))
        );
        realtimeOutboxService.enqueue("user:" + tutor.getId(), "session:" + saved.getId(), tutorEvent);

        ClientEvent adminEvent = ClientEvent.of(
                ClientEventType.SESSION_FINANCIAL_UPDATED,
                "role:" + RoleName.ADMIN.name(),
                "session:" + saved.getId(),
                Map.of("sessionId", String.valueOf(saved.getId()))
        );
        realtimeOutboxService.enqueue("role:" + RoleName.ADMIN.name(), "session:" + saved.getId(), adminEvent);
        return SessionMapper.toListItemResponse(saved);
    }

    @Transactional
    @PreAuthorize("hasRole('TUTOR')")
    public void deleteSession(User tutor, UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> ApiException.notFound("SESSION_NOT_FOUND", "Session not found"));
        if (!session.getTutorClass().getTutor().getId().equals(tutor.getId())) {
            throw ApiException.forbidden("FORBIDDEN", "Tutor can only delete own class session");
        }
        // Same rule as editing: a session in a finalized payroll month is locked.
        assertMonthNotFinalized(tutor.getId(), session.getPayrollMonth());

        sessionStudentTuitionRepository.deleteBySessionId(sessionId);
        sessionRepository.delete(session);

        ClientEvent tutorEvent = ClientEvent.of(
                ClientEventType.SESSION_FINANCIAL_UPDATED,
                "user:" + tutor.getId(),
                "session:" + sessionId,
                Map.of("sessionId", String.valueOf(sessionId), "deleted", "true")
        );
        realtimeOutboxService.enqueue("user:" + tutor.getId(), "session:" + sessionId, tutorEvent);

        ClientEvent adminEvent = ClientEvent.of(
                ClientEventType.DASHBOARD_INVALIDATE,
                "role:" + RoleName.ADMIN.name(),
                "session:" + sessionId,
                Map.of("sessionId", String.valueOf(sessionId), "reason", "SESSION_DELETED")
        );
        realtimeOutboxService.enqueue("role:" + RoleName.ADMIN.name(), "session:" + sessionId, adminEvent);
    }

    @PreAuthorize("hasRole('TUTOR')")
    public Slice<SessionListItemResponse> getByPayrollMonth(User tutor, String payrollMonth, Pageable pageable) {
        return sessionRepository.findByTutorClassTutorIdAndPayrollMonth(tutor.getId(), payrollMonth, pageable)
                .map(SessionMapper::toListItemResponse);
    }

    @PreAuthorize("hasRole('TUTOR')")
    public List<TutorSessionClassOptionResponse> getTutorClasses(User tutor) {
        return tutorClassRepository.findByTutorId(tutor.getId())
                .stream()
                .map(this::toClassOptionResponse)
                .toList();
    }

    private TutorSessionClassOptionResponse toClassOptionResponse(TutorClass tutorClass) {
        List<Enrollment> activeEnrollments = enrollmentRepository.findByTutorClassIdAndStatus(tutorClass.getId(), EnrollmentStatus.ACTIVE);
        List<String> studentNames = activeEnrollments.stream()
                .map(Enrollment::getStudent)
                .map(User::getName)
                .toList();

        List<TutorSessionStudentOptionResponse> students = activeEnrollments.stream()
                .map(Enrollment::getStudent)
                .map(student -> new TutorSessionStudentOptionResponse(student.getId(), student.getName()))
                .toList();
        String className = ClassDisplayNames.resolve(
                tutorClass.getDisplayName(), tutorClass.getSubject().getName(), studentNames);
        return new TutorSessionClassOptionResponse(
                tutorClass.getId(),
                className,
                tutorClass.getSubject().getName(),
                tutorClass.getPricePerHour(),
                tutorClass.getDefaultSalaryRate(),
                students
        );
    }

    private void assertMonthNotFinalized(UUID tutorId, String payrollMonth) {
        if (payrollMonth == null || payrollMonth.isBlank()) {
            return;
        }
        YearMonth ym;
        try {
            ym = YearMonth.parse(payrollMonth);
        } catch (RuntimeException e) {
            return;
        }
        tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutorId, ym.getYear(), ym.getMonthValue())
                .filter(p -> p.getStatus() == PayoutStatus.LOCKED || p.getStatus() == PayoutStatus.PAID)
                .ifPresent(p -> {
                    throw ApiException.conflict(
                            "PAYOUT_FINALIZED",
                            "Payroll month " + payrollMonth + " has already been finalized ("
                                    + p.getStatus() + "). Session financials can no longer be changed."
                    );
                });
    }

    private void auditIfChanged(Session session, User tutor, String fieldName, String oldValue, String newValue, String reason) {
        if (newValue == null || oldValue.equals(newValue)) {
            return;
        }
        SessionFinancialEditAudit audit = new SessionFinancialEditAudit();
        audit.setSession(session);
        audit.setEditedBy(tutor);
        audit.setFieldName(fieldName);
        audit.setOldValue(oldValue);
        audit.setNewValue(newValue);
        audit.setReason(reason);
        auditRepository.save(audit);
    }
}
