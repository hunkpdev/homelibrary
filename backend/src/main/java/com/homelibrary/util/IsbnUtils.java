package com.homelibrary.util;

import com.homelibrary.exception.InvalidIsbnException;

public final class IsbnUtils {

    private IsbnUtils() {}

    public static String normalize(String isbn) {
        if (isbn == null) {
            throw new InvalidIsbnException();
        }
        String normalized = isbn.replaceAll("[\\s-]", "");
        if (!normalized.matches("\\d{13}") && !normalized.matches("\\d{9}[\\dX]")) {
            throw new InvalidIsbnException();
        }
        return normalized;
    }
}
