package com.example.demo.order;

import jakarta.validation.constraints.NotNull;

public record OrderStatusRequest(
        @NotNull(message = "status is required")
        OrderStatus status) {
}
