package com.homelibrary.util;

import com.homelibrary.exception.InvalidIsbnException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IsbnUtilsTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "9789634058489",
            "9780306406157",
            "9780000000002"
    })
    void normalize_validIsbn13_returnsUnchanged(String isbn) {
        assertThat(IsbnUtils.normalize(isbn)).isEqualTo(isbn);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "9634058480",
            "963405848X"
    })
    void normalize_validIsbn10_returnsUnchanged(String isbn) {
        assertThat(IsbnUtils.normalize(isbn)).isEqualTo(isbn);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "978-963-405-848-9",
            "978 963 405 848 9",
            "978-9634058489"
    })
    void normalize_isbn13WithSeparators_returnsStripped(String isbn) {
        assertThat(IsbnUtils.normalize(isbn)).isEqualTo("9789634058489");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "963-405-848-0",
            "963-405-848-X"
    })
    void normalize_isbn10WithHyphens_returnsStripped(String isbn) {
        assertThat(IsbnUtils.normalize(isbn)).isIn("9634058480", "963405848X");
    }

    @Test
    void normalize_null_throwsInvalidIsbnException() {
        assertThatThrownBy(() -> IsbnUtils.normalize(null))
                .isInstanceOf(InvalidIsbnException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "123456789",
            "12345678901",
            "123456789012",
            "12345678901234",
            "978963405848X",
            "963405848x",
            "not-an-isbn"
    })
    void normalize_invalidFormat_throwsInvalidIsbnException(String isbn) {
        assertThatThrownBy(() -> IsbnUtils.normalize(isbn))
                .isInstanceOf(InvalidIsbnException.class);
    }
}
