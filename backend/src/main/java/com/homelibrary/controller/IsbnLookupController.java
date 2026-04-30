package com.homelibrary.controller;

import com.homelibrary.dto.IsbnLookupResponse;
import com.homelibrary.dto.IsbnLookupResult;
import com.homelibrary.exception.DemoRateLimitExceededException;
import com.homelibrary.service.IsbnLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/books")
public class IsbnLookupController {

    private final IsbnLookupService isbnLookupService;
    private final ModelMapper modelMapper;

    @Operation(summary = "Look up a book by ISBN via OSZK Nektar")
    @ApiResponse(responseCode = "200", description = "Lookup completed (book found or not found)")
    @ApiResponse(responseCode = "403", description = "VISITOR role not permitted")
    @ApiResponse(responseCode = "429", description = "Demo rate limit exceeded")
    @GetMapping("/isbn/{isbn}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEMO')")
    public ResponseEntity<IsbnLookupResponse> lookup(@PathVariable String isbn) {
        Optional<IsbnLookupResult> result = isbnLookupService.lookup(isbn);
        return result.map(r -> ResponseEntity.ok(toFound(r)))
                .orElseGet(() -> ResponseEntity.ok(toNotFound(isbn)));
    }

    @ExceptionHandler(DemoRateLimitExceededException.class)
    public ResponseEntity<IsbnLookupResponse> handleRateLimit() {
        IsbnLookupResponse response = new IsbnLookupResponse();
        response.setRateLimitExceeded(true);
        return ResponseEntity.status(429).body(response);
    }

    private IsbnLookupResponse toFound(IsbnLookupResult r) {
        IsbnLookupResponse response = modelMapper.map(r, IsbnLookupResponse.class);
        response.setFound(true);
        return response;
    }

    private IsbnLookupResponse toNotFound(String isbn) {
        IsbnLookupResponse response = new IsbnLookupResponse();
        response.setIsbn(isbn);
        return response;
    }
}
