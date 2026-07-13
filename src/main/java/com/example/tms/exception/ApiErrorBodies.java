package com.example.tms.exception;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** Shared JSON error envelope for MVC advice and Spring Security entry points. */
public final class ApiErrorBodies {
    private ApiErrorBodies() {
    }

    public static Map<String, Object> of(String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        body.put("timestamp", LocalDateTime.now().toString());
        return body;
    }
}
