package com.example.demo.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Small cache-aside helper on top of Redis strings (JSON encoded values).
 * Redis problems never break the API: they are logged and treated as cache misses.
 */
@Component
public class RedisJsonCache {

    private static final Logger log = LoggerFactory.getLogger(RedisJsonCache.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final Duration defaultTtl;

    public RedisJsonCache(StringRedisTemplate redis,
                          ObjectMapper objectMapper,
                          @Value("${app.cache.product-ttl-seconds:60}") long ttlSeconds) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.defaultTtl = Duration.ofSeconds(ttlSeconds);
    }

    public <T> T get(String key, TypeReference<T> type) {
        try {
            String json = redis.opsForValue().get(key);
            return json == null ? null : objectMapper.readValue(json, type);
        } catch (JsonProcessingException | DataAccessException ex) {
            log.warn("Could not read cache key '{}': {}", key, ex.getMessage());
            return null;
        }
    }

    public <T> T getOrLoad(String key, TypeReference<T> type, Supplier<T> loader) {
        T cached = get(key, type);
        if (cached != null) {
            return cached;
        }
        T value = loader.get();
        put(key, value);
        return value;
    }

    public void put(String key, Object value) {
        put(key, value, defaultTtl);
    }

    public void put(String key, Object value, Duration ttl) {
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (JsonProcessingException | DataAccessException ex) {
            log.warn("Could not write cache key '{}': {}", key, ex.getMessage());
        }
    }

    public void evict(String... keys) {
        if (keys.length == 0) {
            return;
        }
        try {
            redis.delete(Set.of(keys));
        } catch (DataAccessException ex) {
            log.warn("Could not evict cache keys {}: {}", Set.of(keys), ex.getMessage());
        }
    }

    /** Deletes all keys matching a pattern. Intended for the small demo keyspace only. */
    public long evictPattern(String pattern) {
        try {
            Set<String> keys = redis.keys(pattern);
            if (keys == null || keys.isEmpty()) {
                return 0;
            }
            Long deleted = redis.delete(keys);
            return deleted == null ? 0 : deleted;
        } catch (DataAccessException ex) {
            log.warn("Could not evict cache pattern '{}': {}", pattern, ex.getMessage());
            return 0;
        }
    }
}
