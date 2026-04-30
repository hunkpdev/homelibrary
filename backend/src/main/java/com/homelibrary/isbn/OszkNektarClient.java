package com.homelibrary.isbn;

import com.homelibrary.dto.IsbnLookupResult;
import com.homelibrary.model.IsbnSource;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.marc4j.MarcReader;
import org.marc4j.MarcStreamReader;
import org.marc4j.marc.DataField;
import org.marc4j.marc.Subfield;
import org.marc4j.marc.VariableField;
import org.springframework.stereotype.Component;
import org.yaz4j.Connection;
import org.yaz4j.PrefixQuery;
import org.yaz4j.Record;
import org.yaz4j.ResultSet;
import org.yaz4j.exception.ConnectionTimeoutException;
import org.yaz4j.exception.ConnectionUnavailableException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
@Slf4j
public class OszkNektarClient {

    private static final String HOST = "tagetes2.oszk.hu";
    private static final int PORT = 1616;
    private static final String DATABASE = "B1";
    private static final String USMARC_SYNTAX = "usmarc";

    private Connection connection;

    @PostConstruct
    void init() {
        loadNativeLibrary();
        initConnection();
    }

    @PreDestroy
    void destroy() {
        closeConnection();
    }

    private void loadNativeLibrary() {
        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        String resourcePath = isWindows
                ? "native/win32-x86_64/yaz5.dll"
                : "native/linux-x86_64/libyaz.so.5";
        String tempSuffix = isWindows ? ".dll" : ".so";

        try (InputStream is = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
            if (is == null) {
                log.warn("Native yaz library not found in classpath at {}", resourcePath);
                return;
            }
            Path tempFile = Files.createTempFile("yaz_native_", tempSuffix);
            tempFile.toFile().deleteOnExit();
            Files.copy(is, tempFile, StandardCopyOption.REPLACE_EXISTING);
            System.load(tempFile.toAbsolutePath().toString());
            log.info("Loaded native yaz library from classpath: {}", resourcePath);
        } catch (IOException | UnsatisfiedLinkError e) {
            log.warn("Failed to load native yaz library: {}", e.getMessage());
        }
    }

    private void initConnection() {
        try {
            connection = new Connection(HOST, PORT);
            connection.connect();
            connection.setDatabaseName(DATABASE);
            connection.option("preferredRecordSyntax", USMARC_SYNTAX);
            log.info("Z39.50 connection established to {}:{}", HOST, PORT);
        } catch (Exception | Error e) {
            log.warn("Z39.50 connection initialization failed: {}", e.getMessage());
            connection = null;
        }
    }

    public Optional<IsbnLookupResult> lookup(String isbn) {
        if (connection == null) {
            log.warn("Z39.50 connection not available, lookup skipped");
            return Optional.empty();
        }
        try {
            return performLookup(isbn);
        } catch (ConnectionUnavailableException | ConnectionTimeoutException e) {
            return reconnectAndRetry(isbn, e);
        } catch (Exception e) {
            log.warn("Z39.50 lookup failed for ISBN {}: {}", isbn, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<IsbnLookupResult> reconnectAndRetry(String isbn, Exception cause) {
        log.warn("Z39.50 stale connection for ISBN {}, reconnecting: {}", isbn, cause.getMessage());
        closeConnection();
        initConnection();
        if (connection == null) {
            return Optional.empty();
        }
        try {
            return performLookup(isbn);
        } catch (Exception e) {
            log.warn("Z39.50 retry failed for ISBN {}: {}", isbn, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<IsbnLookupResult> performLookup(String isbn) throws Exception {
        ResultSet rs = connection.search(new PrefixQuery("@attr 1=7 " + isbn));
        if (rs.getHitCount() == 0) {
            return Optional.empty();
        }
        Record rec = rs.getRecord(0);
        byte[] rawMarc = rec.get(USMARC_SYNTAX);
        return parseMarc(rawMarc, isbn);
    }

    Optional<IsbnLookupResult> parseMarc(byte[] data, String isbn) {
        try {
            MarcReader reader = new MarcStreamReader(new ByteArrayInputStream(data));
            if (!reader.hasNext()) {
                return Optional.empty();
            }
            org.marc4j.marc.Record record = reader.next();

            String title = extractSubfield(record, "245", 'a');
            if (title != null) title = title.replaceAll("\\s+/$", "").strip();

            String subtitle = extractSubfield(record, "245", 'b');

            List<String> authors = buildAuthors(record);

            String publisher = extractSubfield(record, "260", 'b');
            if (publisher != null) publisher = publisher.replaceAll(",\\s*$", "").strip();

            Integer publishYear = extractNumber(extractSubfield(record, "260", 'c'));
            Integer pageCount = extractNumber(extractSubfield(record, "300", 'a'));
            String language = extractSubfield(record, "041", 'a');

            String isbnValue = extractSubfield(record, "020", 'a');
            if (isbnValue != null) isbnValue = isbnValue.replaceAll("[\\s-]", "");

            IsbnLookupResult result = new IsbnLookupResult(
                    isbnValue != null ? isbnValue : isbn,
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
            log.warn("MARC21 parsing failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String extractSubfield(org.marc4j.marc.Record record, String tag, char code) {
        VariableField field = record.getVariableField(tag);
        if (!(field instanceof DataField df)) {
            return null;
        }
        Subfield sf = df.getSubfield(code);
        return sf != null ? sf.getData() : null;
    }

    private List<String> buildAuthors(org.marc4j.marc.Record record) {
        List<String> authors = new ArrayList<>();
        VariableField field100 = record.getVariableField("100");
        if (field100 instanceof DataField df) {
            String author = buildAuthorString(df);
            if (author != null) authors.add(author);
        }
        record.getVariableFields("700").stream()
                .filter(DataField.class::isInstance)
                .map(DataField.class::cast)
                .map(this::buildAuthorString)
                .filter(Objects::nonNull)
                .forEach(authors::add);
        return authors;
    }

    private String buildAuthorString(DataField df) {
        Subfield nameField = df.getSubfield('a');
        if (nameField == null) return null;
        String name = nameField.getData();
        Subfield roleField = df.getSubfield('j');
        return roleField != null ? (name + " " + roleField.getData()).strip() : name.strip();
    }

    private Integer extractNumber(String value) {
        if (value == null) return null;
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void closeConnection() {
        if (connection != null) {
            try {
                connection.close();
            } catch (Exception e) {
                log.warn("Error closing Z39.50 connection: {}", e.getMessage());
            }
            connection = null;
        }
    }
}
