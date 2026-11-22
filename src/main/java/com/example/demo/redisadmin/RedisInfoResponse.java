package com.example.demo.redisadmin;

public record RedisInfoResponse(
        String status,
        String redisVersion,
        long databaseSize,
        long uptimeSeconds) {
}
