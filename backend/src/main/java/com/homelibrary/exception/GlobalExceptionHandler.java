package com.homelibrary.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Void> handleBadCredentialsException() {
        return ResponseEntity.status(401).build();
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Void> handleResourceNotFoundException() {
        return ResponseEntity.status(404).build();
    }

    @ExceptionHandler({ActiveChildException.class, ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<Void> handleConflict() {
        return ResponseEntity.status(409).build();
    }
}
