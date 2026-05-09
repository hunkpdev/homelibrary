package com.homelibrary.dto;

import com.homelibrary.model.BookSource;
import com.homelibrary.model.BookStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String isbn,
        String title,
        String subtitle,
        List<String> authors,
        String publisher,
        Integer publishYear,
        Integer pageCount,
        String language,
        List<String> categories,
        String description,
        String coverImageUrl,
        BookStatus status,
        BookLocationResponse location,
        BookSource source,
        Long version,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
