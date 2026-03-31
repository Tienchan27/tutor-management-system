package com.example.tms.service;

import com.example.tms.api.dto.dashboard.AdminTutorBankAccountResponse;
import com.example.tms.api.dto.dashboard.AdminTutorDetailResponse;
import com.example.tms.api.dto.dashboard.AdminTutorPayoutSnapshotResponse;
import com.example.tms.api.dto.dashboard.TutorDashboardResponse;
import com.example.tms.api.dto.dashboard.TutorClassOverviewResponse;
import com.example.tms.api.dto.dashboard.TutorClassRosterResponse;
import com.example.tms.api.dto.dashboard.TutorClassRosterStudentResponse;
import com.example.tms.api.dto.dashboard.TutorSummaryResponse;
import com.example.tms.entity.Session;
import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.TutorClass;
import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.Enrollment;
import com.example.tms.entity.User;
import com.example.tms.entity.UserRole;
import com.example.tms.entity.SessionStudentTuition;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.EnrollmentRepository;
import com.example.tms.repository.SessionRepository;
import com.example.tms.repository.SessionStudentTuitionRepository;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.TutorClassRepository;
import com.example.tms.repository.TutorPayoutRepository;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

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

    public DashboardService(
            TutorPayoutRepository tutorPayoutRepository,
            TutorClassRepository tutorClassRepository,
            TutorBankAccountRepository tutorBankAccountRepository,
            SessionRepository sessionRepository,
            EnrollmentRepository enrollmentRepository,
            SessionStudentTuitionRepository sessionStudentTuitionRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository
    ) {
        this.tutorPayoutRepository = tutorPayoutRepository;
        this.tutorClassRepository = tutorClassRepository;
        this.tutorBankAccountRepository = tutorBankAccountRepository;
        this.sessionRepository = sessionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.sessionStudentTuitionRepository = sessionStudentTuitionRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<TutorSummaryResponse> adminTutorSummary(User admin, YearMonth month) {
        List<UserRole> tutorRoles = userRoleRepository.findByRoleAndStatus(RoleName.TUTOR, UserRoleStatus.ACTIVE);
        return tutorRoles.stream()
                .map(UserRole::getUser)
                .map(tutor -> toSummary(tutor, month))
                .toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public AdminTutorDetailResponse adminTutorDetail(User admin, UUID tutorId, YearMonth month) {
        User tutor = userRepository.findById(tutorId)
                .orElseThrow(() -> new ApiException("Tutor not found"));

        TutorPayout payout = tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutorId, month.getYear(), month.getMonthValue())
                .orElse(null);
        List<AdminTutorBankAccountResponse> bankAccounts = tutorBankAccountRepository.findByUserIdOrderByIsPrimaryDescCreatedAtDesc(tutorId)
                .stream()
                .map(this::toBankAccountResponse)
                .toList();
        List<TutorClassOverviewResponse> managedClasses = tutorClassRepository.findByTutorId(tutorId)
                .stream()
                .map(this::toClassOverview)
                .toList();

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

    @PreAuthorize("hasRole('TUTOR')")
    public List<TutorClassOverviewResponse> tutorClassOverview(User tutor) {
        return tutorClassRepository.findByTutorId(tutor.getId())
                .stream()
                .map(this::toClassOverview)
                .toList();
    }

    @PreAuthorize("hasRole('TUTOR')")
    @Transactional(readOnly = true)
    public TutorClassRosterResponse tutorClassRoster(User tutor, UUID classId) {
        TutorClass tutorClass = tutorClassRepository.findById(classId)
                .orElseThrow(() -> new ApiException("Class not found"));
        if (tutorClass.getTutor() == null || !tutorClass.getTutor().getId().equals(tutor.getId())) {
            throw new ApiException("Not authorized to view roster for this class");
        }

        List<Enrollment> activeEnrollments = enrollmentRepository.findByTutorClassIdAndStatus(classId, EnrollmentStatus.ACTIVE);

        Session latestSession = sessionRepository.findTopByTutorClassIdOrderByDateDesc(classId).orElse(null);
        java.util.Map<UUID, Long> tuitionByStudentIdComputed;
        if (latestSession != null) {
            List<SessionStudentTuition> lines = sessionStudentTuitionRepository.findBySessionIdWithStudent(latestSession.getId());
            tuitionByStudentIdComputed = lines.stream()
                    .collect(java.util.stream.Collectors.toMap(
                            l -> l.getStudent().getId(),
                            SessionStudentTuition::getTuitionAtLog,
                            (a, b) -> a
                    ));
        } else {
            tuitionByStudentIdComputed = java.util.Map.of();
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

    private TutorSummaryResponse toSummary(User tutor, YearMonth month) {
        TutorPayout payout = tutorPayoutRepository.findByTutorIdAndYearAndMonth(tutor.getId(), month.getYear(), month.getMonthValue())
                .orElse(null);

        List<Session> sessionsThisMonth = sessionRepository.findByTutorClassTutorIdAndPayrollMonth(tutor.getId(), month.toString());
        long classesReceivingThisMonth = sessionsThisMonth.stream()
                .map(s -> s.getTutorClass().getId())
                .distinct()
                .count();
        return new TutorSummaryResponse(
                tutor.getId(),
                tutor.getName(),
                tutor.getEmail(),
                payout == null ? 0L : payout.getGrossRevenue(),
                payout == null ? 0L : payout.getNetSalary(),
                classesReceivingThisMonth,
                payout == null ? "NO_PAYOUT" : payout.getStatus().name()
        );
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

    private TutorClassOverviewResponse toClassOverview(TutorClass tutorClass) {
        long sessionCount = sessionRepository.countByTutorClassId(tutorClass.getId());
        Session latestSession = sessionRepository.findTopByTutorClassIdOrderByDateDesc(tutorClass.getId()).orElse(null);
        return new TutorClassOverviewResponse(
                tutorClass.getId(),
                tutorClass.getSubject().getName(),
                tutorClass.getStatus().name(),
                tutorClass.getPricePerHour(),
                tutorClass.getDefaultSalaryRate(),
                sessionCount,
                latestSession == null ? null : latestSession.getDate()
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
