package com.homelibrary.controller;

import com.homelibrary.dto.IsbnLookupResponse;
import com.homelibrary.dto.RateLimitExceededResponse;
import com.homelibrary.exception.DemoRateLimitExceededException;
import com.homelibrary.service.IsbnLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/books")
public class IsbnLookupController {

    private final IsbnLookupService isbnLookupService;

    @Operation(summary = "Look up a book by ISBN via OSZK Nektar")
    @ApiResponse(responseCode = "200", description = "Book found")
    @ApiResponse(responseCode = "204", description = "Book not found")
    @ApiResponse(responseCode = "403", description = "VISITOR role not permitted")
    @ApiResponse(responseCode = "429", description = "Demo rate limit exceeded")
    @GetMapping("/isbn/{isbn}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEMO')")
    public ResponseEntity<IsbnLookupResponse> lookup(@PathVariable String isbn) {
        Optional<IsbnLookupResponse> result = isbnLookupService.lookup(isbn);
        return result.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @ExceptionHandler(DemoRateLimitExceededException.class)
    public ResponseEntity<RateLimitExceededResponse> handleRateLimit() {
        return ResponseEntity.status(429).body(new RateLimitExceededResponse("DEMO_RATE_LIMIT_EXCEEDED"));
    }
}
