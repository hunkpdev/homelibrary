package com.homelibrary.dto;

import com.homelibrary.model.BookSource;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record BookCreateRequest(
        @Size(max = 20) String isbn,
        @NotBlank @Size(max = 500) String title,
        @Size(max = 500) String subtitle,
        List<String> authors,
        @Size(max = 255) String publisher,
        @Min(1500) @Max(2200) Integer publishYear,
        @Min(0) Integer pageCount,
        @Size(max = 10) String language,
        List<String> categories,
        String description,
        UUID locationId,
        BookSource source
) {}
