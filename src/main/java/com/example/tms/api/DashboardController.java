package com.example.tms.api;

import com.example.tms.api.dto.dashboard.AdminTutorDetailResponse;
import com.example.tms.api.dto.dashboard.TutorDashboardResponse;
import com.example.tms.api.dto.dashboard.TutorClassOverviewResponse;
import com.example.tms.api.dto.dashboard.TutorClassRosterResponse;
import com.example.tms.api.dto.dashboard.TutorSummaryResponse;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;
    private final CurrentUserResolver currentUserResolver;

    public DashboardController(DashboardService dashboardService, CurrentUserResolver currentUserResolver) {
        this.dashboardService = dashboardService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/admin/tutors/summary")
    public List<TutorSummaryResponse> adminSummary(@RequestParam String month) {
        return dashboardService.adminTutorSummary(currentUserResolver.requireUser(), YearMonth.parse(month));
    }

    @GetMapping("/admin/tutors/detail")
    public AdminTutorDetailResponse adminTutorDetail(@RequestParam UUID tutorId, @RequestParam String month) {
        return dashboardService.adminTutorDetail(currentUserResolver.requireUser(), tutorId, YearMonth.parse(month));
    }

    @GetMapping("/tutor/me")
    public List<TutorDashboardResponse> tutorMe() {
        return dashboardService.tutorSelf(currentUserResolver.requireUser());
    }

    @GetMapping("/tutor/classes")
    public List<TutorClassOverviewResponse> tutorClasses() {
        return dashboardService.tutorClassOverview(currentUserResolver.requireUser());
    }

    @GetMapping("/tutor/classes/{classId}/roster")
    public TutorClassRosterResponse tutorClassRoster(@PathVariable UUID classId) {
        return dashboardService.tutorClassRoster(currentUserResolver.requireUser(), classId);
    }
}
