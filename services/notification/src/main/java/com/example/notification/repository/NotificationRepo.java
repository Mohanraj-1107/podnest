package com.example.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.notification.entity.Notification;

import java.util.List;

public interface NotificationRepo extends JpaRepository<Notification,Long> {

    List<Notification> findAllByOrderByCreatedOnDesc();
}
