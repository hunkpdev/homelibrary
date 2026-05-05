package com.homelibrary.util;

import com.homelibrary.dto.IsbnLookupResponse;
import com.homelibrary.model.IsbnSource;
import lombok.extern.slf4j.Slf4j;
import org.marc4j.MarcReader;
import org.marc4j.MarcStreamReader;
import org.marc4j.marc.DataField;
import org.marc4j.marc.Subfield;
import org.marc4j.marc.VariableField;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
public final class Marc21Util {

    private Marc21Util() {}

    public static Optional<IsbnLookupResponse> parseMarc(byte[] data, String isbn) {
        try {
            MarcReader reader = new MarcStreamReader(new ByteArrayInputStream(data));
            if (!reader.hasNext()) {
                return Optional.empty();
            }
            org.marc4j.marc.Record marcRecord = reader.next();

            String title = extractSubfield(marcRecord, "245", 'a');
            if (title != null) {
                if (title.endsWith("/")) title = title.substring(0, title.length() - 1);
                title = title.strip();
            }

            String subtitle = extractSubfield(marcRecord, "245", 'b');

            List<String> authors = buildAuthors(marcRecord);

            String publisher = extractSubfield(marcRecord, "260", 'b');
            if (publisher != null) publisher = publisher.replaceAll(",\\s*$", "").strip();

            Integer publishYear = extractNumber(extractSubfield(marcRecord, "260", 'c'));
            Integer pageCount = extractNumber(extractSubfield(marcRecord, "300", 'a'));
            String language = extractSubfield(marcRecord, "041", 'a');

            IsbnLookupResponse result = new IsbnLookupResponse(
                    isbn,
                    title,
                    subtitle,
                    authors,
                    publisher,
                    publishYear,
                    pageCount,
                    language,
                    IsbnSource.OSZK
            );

            return result.hasMinimumFields() ? Optional.of(result) : Optional.empty();
        } catch (Exception e) {
            Marc21Util.log.warn("MARC21 parsing failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static String extractSubfield(org.marc4j.marc.Record marcRecord, String tag, char code) {
        VariableField field = marcRecord.getVariableField(tag);
        if (!(field instanceof DataField df)) {
            return null;
        }
        Subfield sf = df.getSubfield(code);
        return sf != null ? sf.getData() : null;
    }

    private static Integer extractNumber(String value) {
        if (value == null) return null;
        String digits = value.replaceAll("\\D", "");
        if (digits.isEmpty()) return null;
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String buildAuthorString(DataField df) {
        Subfield nameField = df.getSubfield('a');
        if (nameField == null) return null;
        String name = nameField.getData();
        Subfield roleField = df.getSubfield('j');
        return roleField != null ? (name + " " + roleField.getData()).strip() : name.strip();
    }

    private static List<String> buildAuthors(org.marc4j.marc.Record marcRecord) {
        List<String> authors = new ArrayList<>();
        VariableField field100 = marcRecord.getVariableField("100");
        if (field100 instanceof DataField df) {
            String author = buildAuthorString(df);
            if (author != null) authors.add(author);
        }
        marcRecord.getVariableFields("700").stream()
                .filter(DataField.class::isInstance)
                .map(DataField.class::cast)
                .map(Marc21Util::buildAuthorString)
                .filter(Objects::nonNull)
                .forEach(authors::add);
        return authors;
    }
}
