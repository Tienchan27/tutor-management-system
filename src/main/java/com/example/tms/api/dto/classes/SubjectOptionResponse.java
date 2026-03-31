package com.example.tms.api.dto.classes;

import java.util.UUID;

public record SubjectOptionResponse(
        UUID id,
        String name,
        Long defaultPricePerHour
) {
}
