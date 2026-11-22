package com.example.demo.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Tiny landing endpoint so the base URL is not a 404.
 */
@RestController
@RequestMapping("/")
public class InfoController {

    @GetMapping
    public Map<String, Object> index() {
        return Map.of(
                "application", "spring-mysql-redis-demo",
                "apis", List.of(
                        "GET/POST/PUT/DELETE /api/v1/products (MySQL + Redis cache)",
                        "GET/POST/PUT/DELETE /api/v1/customers (MySQL)",
                        "GET/POST/PUT/PATCH/DELETE /api/v1/orders (MySQL)",
                        "GET/POST/PUT/DELETE /api/v1/notes (Redis only)",
                        "GET /api/v1/redis/info, /cache/keys, /counters/{name} (Redis admin)"));
    }
}
