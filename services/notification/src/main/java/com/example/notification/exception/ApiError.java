package com.example.notification.exception;

import java.time.Instant;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Object details) {

    public static ApiError of(int status, String error, String message, String path, Object details) {
        return new ApiError(Instant.now(), status, error, message, path, details);
    }
}
