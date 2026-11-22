package com.example.notification.service;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import com.example.notification.entity.Notification;
import com.example.notification.entity.NotificationLevel;
import com.example.notification.entity.NotificationType;
import com.example.notification.model.HealthCheckResponse;
import com.example.notification.repository.NotificationRepo;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Service 
public class NotificationService {

    private final NotificationRepo notificationRepo;

    private final List<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();

    public NotificationService(NotificationRepo notificationRepo){
        this.notificationRepo=notificationRepo;
    }
   
    public Notification createNotification(Notification notification){
        if(notification==null){
            throw new IllegalArgumentException("Unable to create Notification , request body is null");
        }
        if(notification.getMessage()==null || notification.getMessage().isBlank()){
            throw new IllegalArgumentException("message is required");
        }
        Notification newNotification=new Notification();
        newNotification.setMessage(notification.getMessage().trim());
        newNotification.setEntityId(notification.getEntityId());
        newNotification.setNotificationLevel(notification.getNotificationLevel()==null
                ? NotificationLevel.INFO : notification.getNotificationLevel());
        newNotification.setNotificationType(notification.getNotificationType()==null
                ? NotificationType.GENERAL : notification.getNotificationType());

        Notification saved=notificationRepo.save(newNotification);
        emitEvent(saved);
        return saved;
    }


    public void deleteNotification(Long notificationId){
        if(notificationId==null){
            throw new IllegalArgumentException("Unable to delete the notification , notification id is null");
        }
        Notification notification=notificationRepo.findById(notificationId)
                            .orElseThrow(()->new IllegalArgumentException("No resource found with id"));
        notificationRepo.delete(notification);
    }

    public HealthCheckResponse healthCheck(){
        return new HealthCheckResponse("Server in up state","UP",Instant.now());
    }

    public List<Notification> getNotifications(){
        return notificationRepo.findAllByOrderByCreatedOnDesc();
    }

    public SseEmitter subscribe(){
        SseEmitter emitter=new SseEmitter(Duration.ofMinutes(30).toMillis());
        emitter.onCompletion(()->sseEmitters.remove(emitter));
        emitter.onTimeout(()->sseEmitters.remove(emitter));
        emitter.onError(ex->sseEmitters.remove(emitter));
        sseEmitters.add(emitter);
        try{
            emitter.send(SseEmitter.event().comment("connected"));
        }catch(IOException ex){
            sseEmitters.remove(emitter);
            emitter.completeWithError(ex);
        }
        return emitter;
    }
    
    private void emitEvent(Notification notification) {
        for (SseEmitter emitter : sseEmitters) {
            try {
                synchronized (emitter) {
                    emitter.send(SseEmitter.event()
                            .id(String.valueOf(notification.getNotificationId()))
                            .name("notification")
                            .data(notification, MediaType.APPLICATION_JSON));
                }
            } catch (IOException | IllegalStateException ex) {
                sseEmitters.remove(emitter);
                emitter.complete();
            }
        }
    }

    @Scheduled(fixedRateString = "${notification.heartbeat-ms:15000}")
    public void sendHeartBeats(){
        for(SseEmitter emitter:sseEmitters){
            try{
                synchronized (emitter) {
                    emitter.send(SseEmitter.event().comment("keep-alive"));
                }
            }catch(IOException | IllegalStateException ex){
                sseEmitters.remove(emitter);
                emitter.complete();
            }
        }
    }
}
