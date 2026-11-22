package com.example.demo.notification;

import com.example.demo.order.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;

/**
 * Best-effort client for the separate notification service.
 *
 * A failure here must never affect the order itself: the order is already committed
 * by the time this runs, and notifications are secondary.
 */
@Component
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);

    private final RestClient restClient;
    private final String notificationUrl;

    public NotificationClient(
            RestClient.Builder builder,
            @Value("${app.notification.url:http://localhost:8082/api/notification}") String notificationUrl,
            @Value("${app.notification.connect-timeout:1s}") Duration connectTimeout,
            @Value("${app.notification.read-timeout:2s}") Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) connectTimeout.toMillis());
        requestFactory.setReadTimeout((int) readTimeout.toMillis());

        this.restClient = builder.requestFactory(requestFactory).build();
        // A request to the servlet context root (/api/notification) is answered by
        // Tomcat with a 302 to /api/notification/, and redirects downgrade POST to
        // GET. That silently "succeeds" while creating nothing, so always post to
        // the trailing-slash URL.
        this.notificationUrl = notificationUrl.endsWith("/") ? notificationUrl : notificationUrl + "/";
    }

    public void sendOrderCreated(OrderCreatedEvent event) {
        NotificationRequest request = new NotificationRequest(
                "Order " + event.orderNumber() + " was created for " + event.customerName()
                        + " (" + event.quantity() + " x " + event.productName() + ")",
                event.orderId(),
                "ORDER_CREATED",
                "SUCCESS");

        try {
            restClient.post()
                    .uri(notificationUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Sent ORDER_CREATED notification for order {}", event.orderNumber());
        } catch (RestClientException ex) {
            log.warn("Could not send ORDER_CREATED notification for order {}: {}",
                    event.orderNumber(), ex.getMessage());
        }
    }

    /** Matches the notification service's create-notification request body. */
    public record NotificationRequest(
            String message,
            long entityId,
            String notificationType,
            String notificationLevel) {
    }
}
