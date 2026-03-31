package com.example.tms.api;

import com.example.tms.api.dto.admin.InviteTutorRequest;
import com.example.tms.api.dto.admin.InviteTutorResponse;
import com.example.tms.service.AdminTutorRoleService;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.TutorInvitationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/tutors")
public class AdminTutorController {
    private final TutorInvitationService tutorInvitationService;
    private final CurrentUserResolver currentUserResolver;
    private final AdminTutorRoleService adminTutorRoleService;

    public AdminTutorController(
            TutorInvitationService tutorInvitationService,
            CurrentUserResolver currentUserResolver,
            AdminTutorRoleService adminTutorRoleService
    ) {
        this.tutorInvitationService = tutorInvitationService;
        this.currentUserResolver = currentUserResolver;
        this.adminTutorRoleService = adminTutorRoleService;
    }

    @PostMapping("/invite")
    public InviteTutorResponse inviteTutor(@Valid @RequestBody InviteTutorRequest request) {
        return tutorInvitationService.inviteTutor(currentUserResolver.requireUser(), request.email());
    }

    @PatchMapping("/{tutorId}/revoke-tutor-role")
    public Map<String, String> revokeTutorRole(
            @PathVariable UUID tutorId,
            @RequestParam(required = false) String reason
    ) {
        adminTutorRoleService.revokeTutorRole(currentUserResolver.requireUser(), tutorId, reason);
        return Map.of("message", "Tutor role revoked successfully");
    }
}
