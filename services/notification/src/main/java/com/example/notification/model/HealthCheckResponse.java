package com.example.notification.model;

import java.time.Instant;

public record HealthCheckResponse( 
    String message,
    String status,
    Instant timeStamp
){

};