package com.example.demo.order;

import com.example.demo.common.ResourceNotFoundException;
import com.example.demo.customer.Customer;
import com.example.demo.customer.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ApplicationEventPublisher events;

    private OrderService service;

    @BeforeEach
    void setUp() {
        service = new OrderService(orderRepository, customerRepository, events);
    }

    @Test
    void createComputesTotalPriceAndUsesCreatedStatus() {
        Customer customer = new Customer();
        customer.setId(1L);
        customer.setName("Alice");
        customer.setEmail("alice@example.com");

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(10L);
            return order;
        });

        OrderResponse response = service.create(
                new OrderRequest(1L, "USB-C Hub", 3, new BigDecimal("39.95")));

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.customerName()).isEqualTo("Alice");
        assertThat(response.totalPrice()).isEqualByComparingTo("119.85");
        assertThat(response.status()).isEqualTo(OrderStatus.CREATED);
        assertThat(response.orderNumber()).startsWith("ORD-");

        verify(events).publishEvent(any(OrderCreatedEvent.class));
    }

    @Test
    void createThrowsWhenCustomerIsMissing() {
        when(customerRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(
                new OrderRequest(404L, "Mouse", 1, new BigDecimal("24.99"))))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("404");
    }
}
