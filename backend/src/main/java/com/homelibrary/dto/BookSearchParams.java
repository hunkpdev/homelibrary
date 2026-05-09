package com.homelibrary.dto;

import com.homelibrary.model.BookStatus;

import java.util.UUID;

public record BookSearchParams(
        String isbn,
        String title,
        String authors,
        BookStatus status,
        UUID locationId,
        String category,
        String language,
        String publishYear
) {
}
