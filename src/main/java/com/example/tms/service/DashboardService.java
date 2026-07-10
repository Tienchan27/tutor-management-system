package com.example.tms.service;

import com.example.tms.api.dto.dashboard.AdminDashboardSnapshotResponse;
import com.example.tms.api.dto.dashboard.AdminTutorBankAccountResponse;
import com.example.tms.api.dto.dashboard.AdminTutorDetailResponse;
import com.example.tms.api.dto.dashboard.AdminTutorPayoutSnapshotResponse;
import com.example.tms.api.dto.dashboard.TutorDashboardResponse;
import com.example.tms.api.dto.dashboard.TutorClassOverviewResponse;
import com.example.tms.api.dto.dashboard.TutorClassRosterResponse;
import com.example.tms.api.dto.dashboard.TutorClassRosterStudentResponse;
import com.example.tms.api.dto.dashboard.TutorMonthSnapshotResponse;
import com.example.tms.api.dto.dashboard.TutorSummaryResponse;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.Session;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.ClassStatus;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.InvoiceStatus;
import com.example.tms.entity.enums.PayoutStatus;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.TutorClassApplicationStatus;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.InvoiceRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorClassApplicationRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import com.example.tms.util.ClassDisplayNames;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    private final TutorPayoutRepository tutorPayoutRepository;
    private final TutorClassRepository tutorClassRepository;
    private final TutorBankAccountRepository tutorBankAccountRepository;
    private final SessionRepository sessionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SessionStudentTuitionRepository sessionStudentTuitionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final TutorClassApplicationRepository tutorClassApplicationRepository;
    private final InvoiceRepository invoiceRepository;

    public DashboardService(
            TutorPayoutRepository tutorPayoutRepository,
            TutorClassRepository tutorClassRepository,
            TutorBankAccountRepository tutorBankAccountRepository,
            SessionRepository sessionRepository,
            EnrollmentRepository enrollmentRepository,
            SessionStudentTuitionRepository sessionStudentTuitionRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            TutorClassApplicationRepository tutorClassApplicationRepository,
            InvoiceRepository invoiceRepository
    ) {
        this.tutorPayoutRepository = tutorPayoutRepository;
        this.tutorClassRepository = tutorClassRepository;
        this.tutorBankAccountRepository = tutorBankAccountRepository;
        this.sessionRepository = sessionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.sessionStudentTuitionRepository = sessionStudentTuitionRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.tutorClassApplicationRepository = tutorClassApplicationRepository;
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public AdminDashboardSnapshotResponse adminDashboardSnapshot(User admin, YearMonth month) {
        long activeClasses = tutorClassRepository.countByStatus(ClassStatus.ACTIVE);
        long awaitingTutor = tutorClassRepository.countByStatus(ClassStatus.AVAILABLE);
        long pendingApplications = tutorClassApplicationRepository.countByStatus(TutorClassApplicationStatus.PENDING);
        long tutorCount = userRoleRepository.countByRoleAndStatus(RoleName.TUTOR, UserRoleStatus.ACTIVE);

        Map<PayoutStatus, Long> payoutCounts = countPayoutsByStatus(month);
        long paidPayouts = payoutCounts.getOrDefault(PayoutStatus.PAID, 0L);
        long payoutTotal = payoutCounts.values().stream().mapToLong(Long::longValue).sum();
        long openPayouts = payoutTotal - paidPayouts;

        Map<InvoiceStatus, Long> invoiceCounts = countInvoicesByStatus(month);
        long invoiceTotal = invoiceCounts.values().stream().mapToLong(Long::longValue).sum();
        long unpaidInvoices = invoiceTotal - invoiceCounts.getOrDefault(InvoiceStatus.PAID, 0L);

        return new AdminDashboardSnapshotResponse(
                activeClasses,
                awaitingTutor,
                pendingApplications,
                tutorCount,
                openPayouts,
                paidPayouts,
                payoutTotal,
                unpaidInvoices,
                invoiceTotal
        );
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public Slice<TutorSummaryResponse> adminTutorSummary(User admin, YearMonth month, Pageable pageable) {
        Slice<UserRole> userRolesSlice = userRoleRepository.findByRoleAndStatus(RoleName.TUTOR, UserRoleStatus.ACTIVE, pageable);
        List<UserRole> roles = userRolesSlice.getContent();
        if (roles.isEmpty()) {
            return new SliceImpl<>(List.of(), pageable, userRolesSlice.hasNext());
        }

        List<UUID> tutorIds = roles.stream().map(ur -> ur.getUser().getId()).toList();

        Map<UUID, TutorPayout> payoutByTutorId = tutorPayoutRepository
                .findByYearAndMonthAndTutor_IdIn(month.getYear(), month.getMonthValue(), tutorIds)
                .stream()
                .collect(Collectors.toMap(p -> p.getTutor().getId(), p -> p, (a, b) -> a));

        Map<UUID, Long> distinctClassesByTutor = new HashMap<>();
        for (Object[] row : sessionRepository.countDistinctClassesByTutorForPayrollMonth(month.toString(), tutorIds)) {
            UUID tutorId = (UUID) row[0];
            long cnt = ((Number) row[1]).longValue();
            distinctClassesByTutor.put(tutorId, cnt);
        }

        List<TutorSummaryResponse> summaries = roles.stream()
                .map(ur -> {
                    User tutor = ur.getUser();
                    TutorPayout payout = payoutByTutorId.get(tutor.getId());
                    long classesReceiving = distinctClassesByTutor.getOrDefault(tutor.getId(), 0L);
                    return new TutorSummaryResponse(
                            tutor.getId(),
                            tutor.getName(),
                            tutor.getEmail(),
                            payout == null ? 0L : payout.getGrossRevenue(),
                            payout == null ? 0L : payout.getNetSalary(),
                            classesReceiving,
                            payout == null ? "NO_PAYOUT" : payout.getStatus().name()
                    );
                })
                .toList();

        return new SliceImpl<>(summaries, pageable, userRolesSlice.hasNext());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public AdminTutorDetailResponse adminTutorDetail(User admin, UUID tutorId, YearMonth month) {
        User tutor = userRepository.findById(tutorId)
                .orElseThrow(() -> ApiException.notFound("TUTOR_NOT_FOUND", "Tutor not found"));

        TutorPayout payout = tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutorId, month.getYear(), month.getMonthValue())
                .orElse(null);
        List<AdminTutorBankAccountResponse> bankAccounts = tutorBankAccountRepository.findByUserIdOrderByIsPrimaryDescCreatedAtDesc(tutorId)
                .stream()
                .map(this::toBankAccountResponse)
                .toList();
        List<TutorClassOverviewResponse> managedClasses = buildClassOverviews(tutorClassRepository.findByTutorId(tutorId));

        return new AdminTutorDetailResponse(
                tutor.getId(),
                tutor.getName(),
                tutor.getEmail(),
                tutor.getPhoneNumber(),
                tutor.getFacebookUrl(),
                tutor.getAddress(),
                payout == null ? null : new AdminTutorPayoutSnapshotResponse(
                        payout.getId(),
                        payout.getYear(),
                        payout.getMonth(),
                        payout.getGrossRevenue(),
                        payout.getNetSalary(),
                        payout.getStatus().name()
                ),
                bankAccounts,
                managedClasses
        );
    }

    @PreAuthorize("hasRole('TUTOR')")
    public List<TutorDashboardResponse> tutorSelf(User tutor) {
        return tutorPayoutRepository.findByTutorIdOrderByYearDescMonthDesc(tutor.getId())
                .stream()
                .map(this::toDashboard)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('TUTOR')")
    public List<TutorClassOverviewResponse> tutorClassOverview(User tutor) {
        return buildClassOverviews(tutorClassRepository.findByTutorId(tutor.getId()));
    }

    @PreAuthorize("hasRole('TUTOR')")
    @Transactional(readOnly = true)
    public TutorClassRosterResponse tutorClassRoster(User tutor, UUID classId) {
        TutorClass tutorClass = tutorClassRepository.findById(classId)
                .orElseThrow(() -> ApiException.notFound("CLASS_NOT_FOUND", "Class not found"));
        if (tutorClass.getTutor() == null || !tutorClass.getTutor().getId().equals(tutor.getId())) {
            throw ApiException.forbidden("ROSTER_FORBIDDEN", "Not authorized to view roster for this class");
        }

        List<Enrollment> activeEnrollments = enrollmentRepository.findByTutorClassIdAndStatus(classId, EnrollmentStatus.ACTIVE);

        Session latestSession = sessionRepository.findTopByTutorClassIdOrderByDateDesc(classId).orElse(null);
        Map<UUID, Long> tuitionByStudentIdComputed;
        if (latestSession != null) {
            List<SessionStudentTuition> lines = sessionStudentTuitionRepository.findBySessionIdWithStudent(latestSession.getId());
            tuitionByStudentIdComputed = lines.stream()
                    .collect(Collectors.toMap(
                            l -> l.getStudent().getId(),
                            SessionStudentTuition::getTuitionAtLog,
                            (a, b) -> a
                    ));
        } else {
            tuitionByStudentIdComputed = Map.of();
        }

        List<TutorClassRosterStudentResponse> students = activeEnrollments.stream()
                .map(enrollment -> new TutorClassRosterStudentResponse(
                        enrollment.getStudent().getId(),
                        enrollment.getStudent().getName(),
                        tuitionByStudentIdComputed.getOrDefault(enrollment.getStudent().getId(), 0L)
                ))
                .toList();

        return new TutorClassRosterResponse(
                classId,
                students
        );
    }

    @PreAuthorize("hasRole('TUTOR')")
    @Transactional(readOnly = true)
    public TutorMonthSnapshotResponse tutorMonthSnapshot(User tutor, YearMonth month) {
        Object[] row = sessionRepository.countAndSumTuitionByTutorAndPayrollMonth(tutor.getId(), month.toString());
        long sessionCount = row[0] == null ? 0L : ((Number) row[0]).longValue();
        long totalTuition = row[1] == null ? 0L : ((Number) row[1]).longValue();
        return new TutorMonthSnapshotResponse(sessionCount, totalTuition);
    }

    private Map<PayoutStatus, Long> countPayoutsByStatus(YearMonth month) {
        Map<PayoutStatus, Long> counts = new HashMap<>();
        for (Object[] row : tutorPayoutRepository.countGroupedByStatusForMonth(month.getYear(), month.getMonthValue())) {
            counts.put((PayoutStatus) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private Map<InvoiceStatus, Long> countInvoicesByStatus(YearMonth month) {
        Map<InvoiceStatus, Long> counts = new HashMap<>();
        for (Object[] row : invoiceRepository.countGroupedByStatusForMonth(month.getYear(), month.getMonthValue())) {
            counts.put((InvoiceStatus) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private List<TutorClassOverviewResponse> buildClassOverviews(List<TutorClass> classes) {
        if (classes.isEmpty()) {
            return List.of();
        }

        List<UUID> classIds = classes.stream().map(TutorClass::getId).toList();

        Map<UUID, Long> sessionCountByClassId = new HashMap<>();
        Map<UUID, LocalDate> latestSessionDateByClassId = new HashMap<>();
        for (Object[] row : sessionRepository.countAndLatestDateByClassIds(classIds)) {
            UUID classId = (UUID) row[0];
            sessionCountByClassId.put(classId, ((Number) row[1]).longValue());
            latestSessionDateByClassId.put(classId, row[2] == null ? null : (LocalDate) row[2]);
        }

        Map<UUID, List<String>> studentNamesByClassId = enrollmentRepository
                .findByClassIdsAndStatus(classIds, EnrollmentStatus.ACTIVE)
                .stream()
                .collect(Collectors.groupingBy(
                        enrollment -> enrollment.getTutorClass().getId(),
                        Collectors.mapping(enrollment -> enrollment.getStudent().getName(), Collectors.toList())
                ));

        return classes.stream()
                .map(tutorClass -> {
                    UUID classId = tutorClass.getId();
                    List<String> studentNames = studentNamesByClassId.getOrDefault(classId, List.of());
                    String displayName = ClassDisplayNames.resolve(
                            tutorClass.getDisplayName(),
                            tutorClass.getSubject().getName(),
                            studentNames
                    );
                    return new TutorClassOverviewResponse(
                            classId,
                            displayName,
                            tutorClass.getSubject().getName(),
                            tutorClass.getStatus().name(),
                            tutorClass.getPricePerHour(),
                            tutorClass.getDefaultSalaryRate(),
                            sessionCountByClassId.getOrDefault(classId, 0L),
                            latestSessionDateByClassId.get(classId)
                    );
                })
                .toList();
    }

    private TutorDashboardResponse toDashboard(TutorPayout payout) {
        return new TutorDashboardResponse(
                payout.getYear(),
                payout.getMonth(),
                payout.getGrossRevenue(),
                payout.getNetSalary(),
                payout.getStatus().name()
        );
    }

    private AdminTutorBankAccountResponse toBankAccountResponse(TutorBankAccount bankAccount) {
        return new AdminTutorBankAccountResponse(
                bankAccount.getId(),
                bankAccount.getBankName(),
                bankAccount.getMaskedAccountNumber(),
                bankAccount.getAccountHolderName(),
                bankAccount.isPrimary(),
                bankAccount.isVerified(),
                bankAccount.getVerifiedAt()
        );
    }
}
