package com.example.tms.api.dto.common;

import java.util.UUID;

public record UserRefResponse(
        UUID id,
        String name,
        String email
) {
}
