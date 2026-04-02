package com.example.tms.exception;

public class ApiException extends RuntimeException {
    private final String errorCode;

    public ApiException(String message) {
        super(message);
        this.errorCode = null;
    }

    /**
     * @param errorCode machine-readable code for clients (e.g. PENDING_VERIFICATION); returned in JSON "code" field
     */
    public ApiException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
