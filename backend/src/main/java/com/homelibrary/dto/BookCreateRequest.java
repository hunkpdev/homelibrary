package com.homelibrary.dto;

import com.homelibrary.model.BookSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record BookCreateRequest(
        String isbn,
        @NotBlank @Size(max = 500) String title,
        String subtitle,
        List<String> authors,
        String publisher,
        Integer publishYear,
        Integer pageCount,
        @Size(max = 10) String language,
        List<String> categories,
        String description,
        UUID locationId,
        BookSource source
) {}
