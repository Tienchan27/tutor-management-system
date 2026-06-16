package com.example.tms.api.dto.classes;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateClassRequest(
        @Size(max = 255)
        String displayName,
        @Min(1)
        Long pricePerHour,
        @Size(max = 2000)
        String note
) {
}
