package com.example.demo.order;

import com.example.demo.common.ResourceNotFoundException;
import com.example.demo.customer.Customer;
import com.example.demo.customer.CustomerRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository repository;
    private final CustomerRepository customerRepository;
    private final ApplicationEventPublisher events;

    public OrderService(OrderRepository repository, CustomerRepository customerRepository,
                        ApplicationEventPublisher events) {
        this.repository = repository;
        this.customerRepository = customerRepository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll(Long customerId) {
        List<Order> orders = customerId == null
                ? repository.findAllByOrderByIdDesc()
                : repository.findByCustomerIdOrderByIdDesc(customerId);
        return orders.stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(Long id) {
        return OrderResponse.from(requireOrder(id));
    }

    @Transactional
    public OrderResponse create(OrderRequest request) {
        Order order = new Order();
        order.setOrderNumber(nextOrderNumber());
        order.setStatus(OrderStatus.CREATED);
        apply(order, request);

        Order saved = repository.save(order);
        OrderResponse response = OrderResponse.from(saved);

        // The listener runs after this transaction commits, so a rolled-back order
        // never produces a notification.
        events.publishEvent(new OrderCreatedEvent(
                response.id(),
                response.orderNumber(),
                response.customerName(),
                response.productName(),
                response.quantity(),
                response.totalPrice()));

        return response;
    }

    @Transactional
    public OrderResponse update(Long id, OrderRequest request) {
        Order order = requireOrder(id);
        apply(order, request);
        return OrderResponse.from(repository.save(order));
    }

    @Transactional
    public OrderResponse updateStatus(Long id, OrderStatus status) {
        Order order = requireOrder(id);
        order.setStatus(status);
        return OrderResponse.from(repository.save(order));
    }

    @Transactional
    public void delete(Long id) {
        Order order = requireOrder(id);
        repository.delete(order);
    }

    private void apply(Order order, OrderRequest request) {
        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", request.customerId()));
        order.setCustomer(customer);
        order.setProductName(request.productName().trim());
        order.setQuantity(request.quantity());
        order.setUnitPrice(request.unitPrice());
        order.setTotalPrice(request.unitPrice()
                .multiply(BigDecimal.valueOf(request.quantity()))
                .setScale(2, RoundingMode.HALF_UP));
    }

    private Order requireOrder(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
    }

    private static String nextOrderNumber() {
        return "ORD-" + UUID.randomUUID().toString()
                .substring(0, 8)
                .toUpperCase(Locale.ROOT);
    }
}
