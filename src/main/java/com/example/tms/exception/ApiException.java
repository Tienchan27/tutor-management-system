package com.example.tms.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus status;

    public ApiException(String message) {
        this(HttpStatus.BAD_REQUEST, null, message);
    }

    /**
     * @param errorCode machine-readable code for clients (e.g. PENDING_VERIFICATION); returned in JSON "code" field
     */
    public ApiException(String errorCode, String message) {
        this(HttpStatus.BAD_REQUEST, errorCode, message);
    }

    public ApiException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status != null ? status : HttpStatus.BAD_REQUEST;
        this.errorCode = errorCode;
    }

    /** 404 — the requested resource does not exist. */
    public static ApiException notFound(String errorCode, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, errorCode, message);
    }

    /** 403 — the caller is authenticated but not allowed to act on this resource. */
    public static ApiException forbidden(String errorCode, String message) {
        return new ApiException(HttpStatus.FORBIDDEN, errorCode, message);
    }

    /** 409 — the request conflicts with current state (already exists, finalized, etc.). */
    public static ApiException conflict(String errorCode, String message) {
        return new ApiException(HttpStatus.CONFLICT, errorCode, message);
    }

    public String getErrorCode() {
        return errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
