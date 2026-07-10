package com.example.tms;

import com.example.tms.api.dto.dashboard.TutorClassOverviewResponse;
import com.example.tms.api.dto.dashboard.TutorMonthSnapshotResponse;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Session;
import com.example.tms.entity.Subject;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.TutorClassApplicationStatus;
import com.example.tms.entity.enums.InvoiceStatus;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.InvoiceRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorClassApplicationRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTests {
    @Mock
    private TutorPayoutRepository tutorPayoutRepository;
    @Mock
    private TutorClassRepository tutorClassRepository;
    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private SessionStudentTuitionRepository sessionStudentTuitionRepository;

    @Mock
    private TutorBankAccountRepository tutorBankAccountRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private TutorClassApplicationRepository tutorClassApplicationRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(
                tutorPayoutRepository,
                tutorClassRepository,
                tutorBankAccountRepository,
                sessionRepository,
                enrollmentRepository,
                sessionStudentTuitionRepository,
                userRepository,
                userRoleRepository,
                tutorClassApplicationRepository,
                invoiceRepository
        );
    }

    @Test
    void tutorClassOverviewReturnsClassMetrics() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());

        Subject subject = new Subject();
        subject.setName("Math");

        TutorClass tutorClass = new TutorClass();
        tutorClass.setId(UUID.randomUUID());
        tutorClass.setTutor(tutor);
        tutorClass.setSubject(subject);
        tutorClass.setStatus(ClassStatus.ACTIVE);
        tutorClass.setPricePerHour(250000L);
        tutorClass.setDefaultSalaryRate(new BigDecimal("0.7500"));

        when(tutorClassRepository.findByTutorId(tutor.getId())).thenReturn(List.of(tutorClass));
        when(sessionRepository.countAndLatestDateByClassIds(List.of(tutorClass.getId())))
                .thenReturn(List.<Object[]>of(new Object[]{tutorClass.getId(), 5L, LocalDate.of(2026, 3, 20)}));
        when(enrollmentRepository.findByClassIdsAndStatus(List.of(tutorClass.getId()), EnrollmentStatus.ACTIVE))
                .thenReturn(List.of());

        List<TutorClassOverviewResponse> response = dashboardService.tutorClassOverview(tutor);

        assertEquals(1, response.size());
        assertEquals("Math", response.getFirst().subjectName());
        assertEquals("ACTIVE", response.getFirst().classStatus());
        assertEquals(5L, response.getFirst().sessionCount());
        assertEquals(LocalDate.of(2026, 3, 20), response.getFirst().latestSessionDate());
    }

    @Test
    void tutorMonthSnapshotAggregatesSessions() {
        User tutor = new User();
        tutor.setId(UUID.randomUUID());
        YearMonth month = YearMonth.of(2026, 3);

        when(sessionRepository.countAndSumTuitionByTutorAndPayrollMonth(tutor.getId(), month.toString()))
                .thenReturn(new Object[]{12L, 3_500_000L});

        TutorMonthSnapshotResponse snapshot = dashboardService.tutorMonthSnapshot(tutor, month);

        assertEquals(12L, snapshot.sessionCount());
        assertEquals(3_500_000L, snapshot.totalTuition());
    }

    @Test
    void adminTutorDetailReturnsNotFoundForMissingTutor() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        UUID tutorId = UUID.randomUUID();
        when(userRepository.findById(tutorId)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class,
                () -> dashboardService.adminTutorDetail(admin, tutorId, YearMonth.of(2026, 3)));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    void adminDashboardSnapshotAggregatesCounts() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        YearMonth month = YearMonth.of(2026, 3);

        when(tutorClassRepository.countByStatus(ClassStatus.ACTIVE)).thenReturn(10L);
        when(tutorClassRepository.countByStatus(ClassStatus.AVAILABLE)).thenReturn(3L);
        when(tutorClassApplicationRepository.countByStatus(TutorClassApplicationStatus.PENDING)).thenReturn(5L);
        when(userRoleRepository.countByRoleAndStatus(RoleName.TUTOR, UserRoleStatus.ACTIVE)).thenReturn(8L);
        when(tutorPayoutRepository.countGroupedByStatusForMonth(2026, 3)).thenReturn(List.of(
                new Object[]{PayoutStatus.PAID, 4L},
                new Object[]{PayoutStatus.OPEN, 2L}
        ));
        when(invoiceRepository.countGroupedByStatusForMonth(2026, 3)).thenReturn(List.of(
                new Object[]{InvoiceStatus.PAID, 20L},
                new Object[]{InvoiceStatus.UNPAID, 7L}
        ));

        var snapshot = dashboardService.adminDashboardSnapshot(admin, month);

        assertEquals(10L, snapshot.activeClasses());
        assertEquals(3L, snapshot.awaitingTutor());
        assertEquals(5L, snapshot.pendingApplications());
        assertEquals(8L, snapshot.tutorCount());
        assertEquals(2L, snapshot.openPayouts());
        assertEquals(4L, snapshot.paidPayouts());
        assertEquals(6L, snapshot.payoutTotal());
        assertEquals(7L, snapshot.unpaidInvoices());
        assertEquals(27L, snapshot.invoiceTotal());
    }

    @Test
    void adminDashboardSnapshotReturnsZerosWhenNoData() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        YearMonth month = YearMonth.of(2026, 3);

        when(tutorClassRepository.countByStatus(ClassStatus.ACTIVE)).thenReturn(0L);
        when(tutorClassRepository.countByStatus(ClassStatus.AVAILABLE)).thenReturn(0L);
        when(tutorClassApplicationRepository.countByStatus(TutorClassApplicationStatus.PENDING)).thenReturn(0L);
        when(userRoleRepository.countByRoleAndStatus(RoleName.TUTOR, UserRoleStatus.ACTIVE)).thenReturn(0L);
        when(tutorPayoutRepository.countGroupedByStatusForMonth(2026, 3)).thenReturn(List.of());
        when(invoiceRepository.countGroupedByStatusForMonth(2026, 3)).thenReturn(List.of());

        var snapshot = dashboardService.adminDashboardSnapshot(admin, month);

        assertEquals(0L, snapshot.activeClasses());
        assertEquals(0L, snapshot.awaitingTutor());
        assertEquals(0L, snapshot.pendingApplications());
        assertEquals(0L, snapshot.tutorCount());
        assertEquals(0L, snapshot.openPayouts());
        assertEquals(0L, snapshot.paidPayouts());
        assertEquals(0L, snapshot.payoutTotal());
        assertEquals(0L, snapshot.unpaidInvoices());
        assertEquals(0L, snapshot.invoiceTotal());
    }

    @Test
    void adminDashboardSnapshotCountsLockedPayoutAsOpen() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        YearMonth month = YearMonth.of(2026, 3);

        when(tutorClassRepository.countByStatus(ClassStatus.ACTIVE)).thenReturn(0L);
        when(tutorClassRepository.countByStatus(ClassStatus.AVAILABLE)).thenReturn(0L);
        when(tutorClassApplicationRepository.countByStatus(TutorClassApplicationStatus.PENDING)).thenReturn(0L);
        when(userRoleRepository.countByRoleAndStatus(RoleName.TUTOR, UserRoleStatus.ACTIVE)).thenReturn(0L);
        when(tutorPayoutRepository.countGroupedByStatusForMonth(2026, 3)).thenReturn(List.of(
                new Object[]{PayoutStatus.PAID, 2L},
                new Object[]{PayoutStatus.LOCKED, 1L},
                new Object[]{PayoutStatus.OPEN, 3L}
        ));
        when(invoiceRepository.countGroupedByStatusForMonth(2026, 3)).thenReturn(List.of());

        var snapshot = dashboardService.adminDashboardSnapshot(admin, month);

        assertEquals(2L, snapshot.paidPayouts());
        assertEquals(6L, snapshot.payoutTotal());
        assertEquals(4L, snapshot.openPayouts());
    }
}
