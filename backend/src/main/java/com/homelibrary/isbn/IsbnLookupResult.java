package com.homelibrary.isbn;

import java.util.List;

public record IsbnLookupResult(
        String isbn,
        String title,
        String subtitle,
        List<String> authors,
        String publisher,
        Integer publishYear,
        Integer pageCount,
        String language,
        IsbnSource source
) {
    public boolean hasMinimumFields() {
        return title != null && !title.isBlank()
                && authors != null && !authors.isEmpty();
    }
}
