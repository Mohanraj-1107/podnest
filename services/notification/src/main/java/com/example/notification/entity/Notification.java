package com.example.notification.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table(name="Notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long notificationId;

    @Column(nullable = false, length = 500)
    private String message;

    /*
     * Hibernate 6+ maps @Enumerated(STRING) to a native MySQL ENUM column by
     * default. MySQL then rejects any constant that was not in the original
     * column definition ("Data truncated for column ..."), and ddl-auto=update
     * never extends an existing enum. Forcing VARCHAR means new constants only
     * need a code change.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private NotificationLevel notificationLevel=NotificationLevel.INFO;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 32)
    private NotificationType notificationType=NotificationType.GENERAL;

    @Column(nullable = false)
    private long entityId;

    @CreationTimestamp 
    @Column(updatable = false)
    private Instant createdOn;

    @UpdateTimestamp
    private Instant modifiedOn;

}
