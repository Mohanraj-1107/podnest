package com.example.demo.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "name is required")
        @Size(max = 120, message = "name must be at most 120 characters")
        String name,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description,

        @NotNull(message = "price is required")
        @DecimalMin(value = "0.0", message = "price must be zero or positive")
        @Digits(integer = 10, fraction = 2, message = "price must have at most 2 decimals")
        BigDecimal price,

        @NotNull(message = "stock is required")
        @Min(value = 0, message = "stock must be zero or positive")
        Integer stock) {
}
