package com.example.demo.redisadmin;

import com.example.demo.cache.RedisJsonCache;
import com.example.demo.product.ProductService;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.TreeSet;

/**
 * Utility endpoints that expose what Redis is doing for this demo:
 * server info, cache inspection/eviction and atomic counters.
 */
@RestController
@RequestMapping("/api/v1/redis")
public class RedisAdminController {

    private final RedisConnectionFactory connectionFactory;
    private final StringRedisTemplate redis;
    private final RedisJsonCache jsonCache;
    private final CounterService counterService;

    public RedisAdminController(RedisConnectionFactory connectionFactory,
                                StringRedisTemplate redis,
                                RedisJsonCache jsonCache,
                                CounterService counterService) {
        this.connectionFactory = connectionFactory;
        this.redis = redis;
        this.jsonCache = jsonCache;
        this.counterService = counterService;
    }

    @GetMapping("/info")
    public RedisInfoResponse info() {
        try (RedisConnection connection = connectionFactory.getConnection()) {
            String pong = connection.ping();
            Properties server = connection.serverCommands().info("server");
            Long size = connection.serverCommands().dbSize();
            String version = server == null ? null : server.getProperty("redis_version");
            String uptime = server == null ? null : server.getProperty("uptime_in_seconds");
            return new RedisInfoResponse(
                    pong,
                    version == null ? "unknown" : version,
                    size == null ? 0 : size,
                    parseLong(uptime));
        }
    }

    @GetMapping("/cache/keys")
    public Set<String> cacheKeys(@RequestParam(defaultValue = "demo:*") String pattern) {
        requireDemoPattern(pattern);
        Set<String> keys = redis.keys(pattern);
        return keys == null ? Set.of() : new TreeSet<>(keys);
    }

    @DeleteMapping("/cache")
    public Map<String, Object> clearCache() {
        long deleted = jsonCache.evictPattern(ProductService.CACHE_PATTERN);
        return Map.of("pattern", ProductService.CACHE_PATTERN, "deletedKeys", deleted);
    }

    @PostMapping("/counters/{name}/increment")
    public CounterResponse increment(@PathVariable String name,
                                     @RequestParam(defaultValue = "1") long by) {
        return counterService.increment(name, by);
    }

    @GetMapping("/counters/{name}")
    public CounterResponse counter(@PathVariable String name) {
        return counterService.get(name);
    }

    @DeleteMapping("/counters/{name}")
    public ResponseEntity<Map<String, Object>> deleteCounter(@PathVariable String name) {
        boolean removed = counterService.delete(name);
        return ResponseEntity.ok(Map.of("name", name, "deleted", removed));
    }

    private static void requireDemoPattern(String pattern) {
        if (pattern == null || !pattern.startsWith("demo:")) {
            throw new IllegalArgumentException("For safety, patterns must start with 'demo:'");
        }
    }

    private static long parseLong(String value) {
        if (value == null) {
            return 0;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }
}
