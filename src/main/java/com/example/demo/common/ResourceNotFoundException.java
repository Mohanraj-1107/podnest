package com.example.demo.common;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " with id '" + id + "' was not found");
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
