package com.homelibrary.controller;

import com.homelibrary.dto.BookCreateRequest;
import com.homelibrary.dto.BookLocationRequest;
import com.homelibrary.dto.BookResponse;
import com.homelibrary.dto.BookSearchParams;
import com.homelibrary.dto.BookStatusRequest;
import com.homelibrary.dto.BookUpdateRequest;
import com.homelibrary.entity.User;
import com.homelibrary.model.BookStatus;
import com.homelibrary.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    @Operation(summary = "Search books with optional filters")
    @ApiResponse(responseCode = "200", description = "Books returned successfully")
    @ApiResponse(responseCode = "400", description = "Invalid page size (max 100)")
    @GetMapping
    @PreAuthorize("hasAnyRole('VISITOR', 'DEMO')")
    public ResponseEntity<Page<BookResponse>> search(
            @Parameter(description = "startsWith filter on ISBN field")
            @RequestParam(required = false) String isbn,
            @Parameter(description = "contains filter on title field (case insensitive)")
            @RequestParam(required = false) String title,
            @Parameter(description = "contains filter on authors field (case insensitive)")
            @RequestParam(required = false) String authors,
            @RequestParam(required = false) BookStatus status,
            @RequestParam(required = false) UUID locationId,
            @Parameter(description = "contains filter on categories field (case insensitive)")
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String language,
            @Parameter(description = "startsWith filter on publish year (matched as string prefix)")
            @RequestParam(required = false) String publishYear,
            @PageableDefault(size = 20) Pageable pageable) {
        if (pageable.getPageSize() > 100) {
            return ResponseEntity.badRequest().build();
        }
        BookSearchParams params = new BookSearchParams(isbn, title, authors, status, locationId, category, language, publishYear);
        return ResponseEntity.ok(bookService.search(params, pageable));
    }

    @Operation(summary = "Get a book by ID")
    @ApiResponse(responseCode = "200", description = "Book returned successfully")
    @ApiResponse(responseCode = "404", description = "Book not found")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('VISITOR', 'DEMO')")
    public ResponseEntity<BookResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(bookService.getById(id));
    }

    @Operation(summary = "Create a new book")
    @ApiResponse(responseCode = "201", description = "Book created successfully")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "404", description = "Location not found")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponse> create(
            @Valid @RequestBody BookCreateRequest request,
            @AuthenticationPrincipal User principal) {
        return ResponseEntity.status(201).body(bookService.create(request, principal.getId()));
    }

    @Operation(summary = "Update an existing book")
    @ApiResponse(responseCode = "200", description = "Book updated successfully")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "404", description = "Book not found")
    @ApiResponse(responseCode = "409", description = "Optimistic locking conflict")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody BookUpdateRequest request) {
        return ResponseEntity.ok(bookService.update(id, request));
    }

    @Operation(summary = "Update book status (AT_HOME or LOANED only — use DELETE for soft delete)")
    @ApiResponse(responseCode = "200", description = "Status updated successfully")
    @ApiResponse(responseCode = "400", description = "DELETED status not allowed on this endpoint")
    @ApiResponse(responseCode = "404", description = "Book not found")
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody BookStatusRequest request) {
        if (request.status() == BookStatus.DELETED) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(bookService.updateStatus(id, request.status()));
    }

    @Operation(summary = "Move book to a different location")
    @ApiResponse(responseCode = "200", description = "Location updated successfully")
    @ApiResponse(responseCode = "404", description = "Book or location not found")
    @PutMapping("/{id}/location")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookResponse> updateLocation(
            @PathVariable UUID id,
            @Valid @RequestBody BookLocationRequest request) {
        return ResponseEntity.ok(bookService.updateLocation(id, request.locationId()));
    }

    @Operation(summary = "Soft delete a book")
    @ApiResponse(responseCode = "204", description = "Book deleted successfully")
    @ApiResponse(responseCode = "404", description = "Book not found")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        bookService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
