package com.example.demo.config;

import com.example.demo.customer.Customer;
import com.example.demo.customer.CustomerRepository;
import com.example.demo.note.NoteRequest;
import com.example.demo.note.NoteService;
import com.example.demo.order.OrderRequest;
import com.example.demo.order.OrderRepository;
import com.example.demo.order.OrderService;
import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Inserts a small amount of demo data on first start. Existing data is never overwritten.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final NoteService noteService;
    private final StringRedisTemplate redis;

    public DataSeeder(CustomerRepository customerRepository,
                      ProductRepository productRepository,
                      OrderRepository orderRepository,
                      OrderService orderService,
                      NoteService noteService,
                      StringRedisTemplate redis) {
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.noteService = noteService;
        this.redis = redis;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Customer> customers = seedCustomers();
        seedProducts();
        seedOrders(customers);
        seedNotes();
    }

    private List<Customer> seedCustomers() {
        if (customerRepository.count() > 0) {
            return customerRepository.findAll();
        }
        List<Customer> customers = List.of(
                customer("Alice Johnson", "alice@example.com", "+1-555-0101"),
                customer("Bob Smith", "bob@example.com", "+1-555-0102"),
                customer("Carol Diaz", "carol@example.com", "+1-555-0103"));
        log.info("Seeding {} demo customers", customers.size());
        return customerRepository.saveAll(customers);
    }

    private void seedProducts() {
        if (productRepository.count() > 0) {
            return;
        }
        List<Product> products = List.of(
                product("Wireless Mouse", "2.4 GHz ergonomic mouse", "24.99", 120),
                product("Mechanical Keyboard", "Tenkeyless, brown switches", "89.50", 45),
                product("27-inch Monitor", "QHD IPS panel, 75 Hz", "219.00", 30),
                product("USB-C Hub", "7-in-1 with HDMI and card reader", "39.95", 80));
        log.info("Seeding {} demo products", products.size());
        productRepository.saveAll(products);
    }

    private void seedOrders(List<Customer> customers) {
        if (orderRepository.count() > 0 || customers.isEmpty()) {
            return;
        }
        orderService.create(new OrderRequest(customers.get(0).getId(), "Mechanical Keyboard", 1,
                new BigDecimal("89.50")));
        orderService.create(new OrderRequest(customers.get(0).getId(), "USB-C Hub", 2,
                new BigDecimal("39.95")));
        orderService.create(new OrderRequest(customers.get(1).getId(), "27-inch Monitor", 1,
                new BigDecimal("219.00")));
        log.info("Seeding demo orders");
    }

    private void seedNotes() {
        try {
            if (redis.opsForHash().size(NoteService.NOTES_KEY) > 0) {
                return;
            }
            noteService.create(new NoteRequest("Welcome", "This note lives in Redis, not in MySQL."));
            noteService.create(new NoteRequest("Try it", "POST, PUT and DELETE here never touch the database."));
            log.info("Seeding demo notes in Redis");
        } catch (DataAccessException ex) {
            log.warn("Redis is not reachable, skipping note seed: {}", ex.getMessage());
        }
    }

    private static Customer customer(String name, String email, String phone) {
        Customer customer = new Customer();
        customer.setName(name);
        customer.setEmail(email);
        customer.setPhone(phone);
        return customer;
    }

    private static Product product(String name, String description, String price, int stock) {
        Product product = new Product();
        product.setName(name);
        product.setDescription(description);
        product.setPrice(new BigDecimal(price));
        product.setStock(stock);
        return product;
    }
}
