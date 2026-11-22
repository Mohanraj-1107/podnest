package com.example.demo.redisadmin;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Atomic counter CRUD backed by Redis INCR / DECR.
 */
@Service
public class CounterService {

    private static final String KEY_PREFIX = "demo:counter:";

    private final StringRedisTemplate redis;

    public CounterService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public CounterResponse increment(String name, long by) {
        Long value = redis.opsForValue().increment(key(name), by);
        return new CounterResponse(name, value == null ? 0 : value);
    }

    public CounterResponse get(String name) {
        String raw = redis.opsForValue().get(key(name));
        return new CounterResponse(name, raw == null ? 0 : Long.parseLong(raw));
    }

    /** Returns true when the counter existed before deletion. */
    public boolean delete(String name) {
        return Boolean.TRUE.equals(redis.delete(key(name)));
    }

    private static String key(String name) {
        if (name == null || !name.matches("[A-Za-z0-9_-]{1,40}")) {
            throw new IllegalArgumentException(
                    "Counter name must be 1-40 characters and may only contain letters, digits, '_' or '-'");
        }
        return KEY_PREFIX + name;
    }
}
