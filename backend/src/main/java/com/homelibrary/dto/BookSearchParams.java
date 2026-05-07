package com.homelibrary.dto;

import com.homelibrary.model.BookStatus;

import java.util.UUID;

public record BookSearchParams(
        String search,
        BookStatus status,
        UUID locationId,
        String category,
        String language,
        Integer publishYear
) {
}
