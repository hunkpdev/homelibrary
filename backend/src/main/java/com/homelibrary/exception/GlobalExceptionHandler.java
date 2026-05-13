package com.homelibrary.exception;

import com.homelibrary.dto.RateLimitExceededResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Void> handleBadCredentialsException() {
        return ResponseEntity.status(401).build();
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<Void> handleAuthorizationDeniedException() {
        return ResponseEntity.status(403).build();
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Void> handleResourceNotFoundException() {
        return ResponseEntity.status(404).build();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Void> handleMethodArgumentNotValid() {
        return ResponseEntity.badRequest().build();
    }

    @ExceptionHandler(InvalidDataAccessResourceUsageException.class)
    public ResponseEntity<Void> handleInvalidDataAccessResourceUsage(InvalidDataAccessResourceUsageException ex) {
        log.warn("Invalid DB resource usage (likely bad sort param): {}", ex.getMessage());
        return ResponseEntity.badRequest().build();
    }

    @ExceptionHandler({ActiveChildException.class, ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<Void> handleConflict() {
        return ResponseEntity.status(409).build();
    }

    @ExceptionHandler(DemoRateLimitExceededException.class)
    public ResponseEntity<RateLimitExceededResponse> handleDemoRateLimitExceeded(DemoRateLimitExceededException ex) {
        String reason = "session".equals(ex.getLimitType()) ? "DEMO_SESSION_LIMIT_EXCEEDED" : "DEMO_DAILY_LIMIT_EXCEEDED";
        return ResponseEntity.status(429).body(new RateLimitExceededResponse(reason));
    }

    @ExceptionHandler(InvalidIsbnException.class)
    public ResponseEntity<Void> handleInvalidIsbn() {
        return ResponseEntity.status(422).build();
    }
}
