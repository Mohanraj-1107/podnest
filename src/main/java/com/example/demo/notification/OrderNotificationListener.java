package com.example.demo.notification;

import com.example.demo.order.OrderCreatedEvent;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;


@Component
public class OrderNotificationListener {

    private final NotificationClient notificationClient;

    public OrderNotificationListener(NotificationClient notificationClient) {
        this.notificationClient = notificationClient;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        notificationClient.sendOrderCreated(event);
    }
}
