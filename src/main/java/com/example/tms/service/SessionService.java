package com.example.tms.service;

import com.example.tms.api.dto.session.CreateSessionRequest;
import com.example.tms.api.dto.session.TutorSessionClassOptionResponse;
import com.example.tms.api.dto.session.UpdateSessionFinancialRequest;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionFinancialEditAudit;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.SessionFinancialEditAuditRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final TutorClassRepository tutorClassRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRoleRepository userRoleRepository;
    private final SessionFinancialEditAuditRepository auditRepository;
    private final NotificationService notificationService;

    public SessionService(
            SessionRepository sessionRepository,
            TutorClassRepository tutorClassRepository,
            EnrollmentRepository enrollmentRepository,
            UserRoleRepository userRoleRepository,
            SessionFinancialEditAuditRepository auditRepository,
            NotificationService notificationService
    ) {
        this.sessionRepository = sessionRepository;
        this.tutorClassRepository = tutorClassRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRoleRepository = userRoleRepository;
        this.auditRepository = auditRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    @PreAuthorize("hasRole('TUTOR')")
    public Session create(User tutor, CreateSessionRequest request) {
        TutorClass tutorClass = tutorClassRepository.findById(request.classId())
                .orElseThrow(() -> new ApiException("Class not found"));
        if (!tutorClass.getTutor().getId().equals(tutor.getId())) {
            throw new ApiException("Tutor can only log own class session");
        }
        Session session = new Session();
        session.setTutorClass(tutorClass);
        session.setDate(request.date());
        session.setDurationHours(request.durationHours());
        session.setTuitionAtLog(request.tuitionAtLog());
        session.setSalaryRateAtLog(request.salaryRateAtLog());
        session.setPayrollMonth(
                request.payrollMonth() == null || request.payrollMonth().isBlank()
                        ? YearMonth.now().toString()
                        : request.payrollMonth()
        );
        session.setNote(request.note());
        session.setCreatedBy(tutor);
        session.setUpdatedBy(tutor);
        return sessionRepository.save(session);
    }

    @Transactional
    @PreAuthorize("hasRole('TUTOR')")
    public Session updateFinancial(User tutor, UUID sessionId, UpdateSessionFinancialRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException("Session not found"));
        if (!session.getTutorClass().getTutor().getId().equals(tutor.getId())) {
            throw new ApiException("Tutor can only edit own class session");
        }

        auditIfChanged(session, tutor, "tuitionAtLog", String.valueOf(session.getTuitionAtLog()), String.valueOf(request.tuitionAtLog()), request.reason());
        auditIfChanged(session, tutor, "salaryRateAtLog", String.valueOf(session.getSalaryRateAtLog()), String.valueOf(request.salaryRateAtLog()), request.reason());
        auditIfChanged(session, tutor, "payrollMonth", session.getPayrollMonth(), request.payrollMonth(), request.reason());

        if (request.tuitionAtLog() != null) {
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
            notificationService.notifyUser(
                    userRole.getUser(),
                    NotificationType.SESSION_FINANCIAL_EDIT,
                    "Session financial updated",
                    "Tutor " + tutor.getEmail() + " updated session " + saved.getId()
            );
        }
        return saved;
    }

    public List<Session> getByPayrollMonth(String payrollMonth) {
        return sessionRepository.findByPayrollMonth(payrollMonth);
    }

    @PreAuthorize("hasRole('TUTOR')")
    public List<TutorSessionClassOptionResponse> getTutorClasses(User tutor) {
        return tutorClassRepository.findByTutorId(tutor.getId())
                .stream()
                .map(this::toClassOptionResponse)
                .toList();
    }

    private TutorSessionClassOptionResponse toClassOptionResponse(TutorClass tutorClass) {
        List<String> studentNames = enrollmentRepository.findByTutorClassIdAndStatus(tutorClass.getId(), EnrollmentStatus.ACTIVE)
                .stream()
                .map(Enrollment::getStudent)
                .map(User::getName)
                .toList();
        String className = tutorClass.getDisplayName();
        if (className == null || className.isBlank()) {
            className = studentNames.isEmpty()
                    ? "[" + tutorClass.getSubject().getName() + "] Class"
                    : "[" + tutorClass.getSubject().getName() + "] " + String.join(" - ", studentNames);
        }
        return new TutorSessionClassOptionResponse(
                tutorClass.getId(),
                className,
                tutorClass.getSubject().getName(),
                tutorClass.getPricePerHour(),
                tutorClass.getDefaultSalaryRate(),
                studentNames
        );
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
