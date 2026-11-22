package com.example.demo.common;

import java.time.Instant;

/**
 * Standard error payload returned by every API error.
 */
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
