package com.example.tms.service;

import com.example.tms.api.dto.session.CreateSessionRequest;
import com.example.tms.api.dto.session.UpdateSessionFinancialRequest;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionFinancialEditAudit;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.NotificationType;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.SessionFinancialEditAuditRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.security.RoleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final TutorClassRepository tutorClassRepository;
    private final UserRoleRepository userRoleRepository;
    private final SessionFinancialEditAuditRepository auditRepository;
    private final NotificationService notificationService;
    private final RoleGuard roleGuard;

    public SessionService(
            SessionRepository sessionRepository,
            TutorClassRepository tutorClassRepository,
            UserRoleRepository userRoleRepository,
            SessionFinancialEditAuditRepository auditRepository,
            NotificationService notificationService,
            RoleGuard roleGuard
    ) {
        this.sessionRepository = sessionRepository;
        this.tutorClassRepository = tutorClassRepository;
        this.userRoleRepository = userRoleRepository;
        this.auditRepository = auditRepository;
        this.notificationService = notificationService;
        this.roleGuard = roleGuard;
    }

    @Transactional
    public Session create(User tutor, CreateSessionRequest request) {
        roleGuard.requireRole(tutor, RoleName.TUTOR);
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
    public Session updateFinancial(User tutor, UUID sessionId, UpdateSessionFinancialRequest request) {
        roleGuard.requireRole(tutor, RoleName.TUTOR);
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
