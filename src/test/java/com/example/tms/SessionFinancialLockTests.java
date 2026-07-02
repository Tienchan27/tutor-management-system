package com.example.tms;

import com.example.tms.api.dto.session.UpdateSessionRequest;
import com.example.tms.entity.Session;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.realtime.outbox.RealtimeOutboxService;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SessionFinancialEditAuditRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.service.NotificationOutboxService;
import com.example.tms.service.SessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
class SessionFinancialLockTests {

    @Mock private SessionRepository sessionRepository;
    @Mock private TutorClassRepository tutorClassRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private SessionStudentTuitionRepository sessionStudentTuitionRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private SessionFinancialEditAuditRepository auditRepository;
    @Mock private TutorPayoutRepository tutorPayoutRepository;
    @Mock private NotificationOutboxService notificationOutboxService;
    @Mock private RealtimeOutboxService realtimeOutboxService;

    private SessionService service() {
        return new SessionService(
                sessionRepository, tutorClassRepository, enrollmentRepository,
                sessionStudentTuitionRepository, userRoleRepository, auditRepository,
                tutorPayoutRepository, notificationOutboxService, realtimeOutboxService
        );
    }

    private Session sessionOwnedBy(User tutor, String payrollMonth) {
        TutorClass tutorClass = new TutorClass();
        tutorClass.setTutor(tutor);
        Session session = new Session();
        session.setId(UUID.randomUUID());
        session.setTutorClass(tutorClass);
        session.setTuitionAtLog(100000L);
        session.setSalaryRateAtLog(new BigDecimal("0.75"));
        session.setDurationHours(new BigDecimal("2"));
        session.setPayrollMonth(payrollMonth);
        return session;
    }

    private UpdateSessionRequest req(Long tuition, BigDecimal salary, String payrollMonth, String note, String reason) {
        return new UpdateSessionRequest(null, null, tuition, salary, payrollMonth, note, reason);
    }

    @Test
    void rejectsEditWhenPayrollMonthIsLocked() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        Session session = sessionOwnedBy(tutor, "2026-06");
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        TutorPayout locked = new TutorPayout();
        locked.setStatus(PayoutStatus.LOCKED);
        when(tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutor.getId(), 2026, 6))
                .thenReturn(Optional.of(locked));

        ApiException ex = assertThrows(ApiException.class,
                () -> service().updateSession(tutor, session.getId(), req(200000L, new BigDecimal("0.90"), null, null, "raise my rate")));
        assertEquals("PAYOUT_FINALIZED", ex.getErrorCode());
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void rejectsMovingSessionIntoAFinalizedMonth() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        Session session = sessionOwnedBy(tutor, "2026-06");
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        // Source month (2026-06) is open, target month (2026-05) is PAID.
        when(tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutor.getId(), 2026, 6))
                .thenReturn(Optional.empty());
        TutorPayout paid = new TutorPayout();
        paid.setStatus(PayoutStatus.PAID);
        when(tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutor.getId(), 2026, 5))
                .thenReturn(Optional.of(paid));

        ApiException ex = assertThrows(ApiException.class,
                () -> service().updateSession(tutor, session.getId(), req(null, null, "2026-05", null, "move month")));
        assertEquals("PAYOUT_FINALIZED", ex.getErrorCode());
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void allowsEditWhenMonthIsOpenOrHasNoPayout() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        Session session = sessionOwnedBy(tutor, "2026-06");
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutor.getId(), 2026, 6))
                .thenReturn(Optional.empty());
        lenient().when(sessionRepository.save(any(Session.class))).thenAnswer(i -> i.getArgument(0));

        service().updateSession(tutor, session.getId(), req(null, new BigDecimal("0.80"), null, "ok", "correction"));
        verify(sessionRepository).save(any(Session.class));
    }

    @Test
    void rejectsDeleteWhenPayrollMonthIsFinalized() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        Session session = sessionOwnedBy(tutor, "2026-06");
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        TutorPayout paid = new TutorPayout();
        paid.setStatus(PayoutStatus.PAID);
        when(tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutor.getId(), 2026, 6))
                .thenReturn(Optional.of(paid));

        ApiException ex = assertThrows(ApiException.class,
                () -> service().deleteSession(tutor, session.getId()));
        assertEquals("PAYOUT_FINALIZED", ex.getErrorCode());
        verify(sessionRepository, never()).delete(any());
        verify(sessionStudentTuitionRepository, never()).deleteBySessionId(any());
    }

    @Test
    void deleteRemovesTuitionLinesThenSession() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        Session session = sessionOwnedBy(tutor, "2026-06");
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutor.getId(), 2026, 6))
                .thenReturn(Optional.empty());

        service().deleteSession(tutor, session.getId());

        verify(sessionStudentTuitionRepository).deleteBySessionId(session.getId());
        verify(sessionRepository).delete(session);
    }
}
