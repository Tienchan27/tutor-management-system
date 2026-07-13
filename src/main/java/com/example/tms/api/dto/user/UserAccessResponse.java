package com.example.tms.api.dto.user;

import com.example.tms.entity.enums.RoleName;

import java.util.List;
import java.util.UUID;

public record UserAccessResponse(
        UUID userId,
        String email,
        String name,
        List<RoleName> roles,
        RoleName activeRole,
        boolean needsProfileCompletion,
        boolean needsTutorOnboarding
) {
}
