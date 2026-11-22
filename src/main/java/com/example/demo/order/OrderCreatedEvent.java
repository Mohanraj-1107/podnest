package com.example.demo.order;

import java.math.BigDecimal;

/**
 * Plain-value event published after an order is created. It deliberately does not
 * carry the JPA entity because the notification listener runs after the transaction
 * has closed.
 */
public record OrderCreatedEvent(
        Long orderId,
        String orderNumber,
        String customerName,
        String productName,
        Integer quantity,
        BigDecimal totalPrice) {
}
