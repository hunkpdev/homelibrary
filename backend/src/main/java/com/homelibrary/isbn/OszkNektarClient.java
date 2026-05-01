package com.homelibrary.isbn;

import com.homelibrary.dto.IsbnLookupResponse;
import com.homelibrary.util.Marc21Util;
import io.swagger.v3.core.util.Json;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.yaz4j.Connection;
import org.yaz4j.PrefixQuery;
import org.yaz4j.Record;
import org.yaz4j.ResultSet;
import org.yaz4j.exception.ConnectionTimeoutException;
import org.yaz4j.exception.ConnectionUnavailableException;
import org.yaz4j.exception.ZoomException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Optional;
import java.util.Set;

@Component
@Slf4j
public class OszkNektarClient {

    private static final String HOST = "tagetes2.oszk.hu";
    private static final int PORT = 1616;
    private static final String DATABASE = "B1";
    private static final String USMARC_SYNTAX = "usmarc";
    private static final int RETRY_COUNT = 1;

    private Connection connection;

    @PostConstruct
    void init() {
        loadNativeLibrary();
    }

    @PreDestroy
    void destroy() {
        closeConnection();
    }

    public Optional<IsbnLookupResponse> lookup(String isbn) {
        initConnection();
        if (connection == null) {
            log.warn("Z39.50 connection not available, lookup skipped");
            return Optional.empty();
        }
        int retries = 0;
        while (retries <= RETRY_COUNT) {
            try {
                log.debug("trying to lookup... retry number #{}", retries);
                return performLookup(isbn);
            } catch (ConnectionUnavailableException | ConnectionTimeoutException e) {
                if (++retries <= RETRY_COUNT) {
                    reconnect(isbn, e);
                }
            } catch (Exception e) {
                log.warn("Z39.50 lookup failed for ISBN {}: {}", isbn, e.getMessage());
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private Optional<IsbnLookupResponse> performLookup(String isbn) throws ZoomException {
        ResultSet rs = connection.search(new PrefixQuery("@attr 1=7 " + isbn));
        for (int i = 0; i < rs.getHitCount(); i++) {
            Record rec = rs.getRecord(i);
            byte[] rawData = rec.get("raw");
            log.debug("Record {}: syntax={}, rawBytes={}", i, rec.getSyntax(), rawData != null ? rawData.length : "null");
            Optional<IsbnLookupResponse> result = Marc21Util.parseMarc(rawData, isbn);
            if (result.isPresent()) {
                return result;
            }
        }
        return Optional.empty();
    }

    private void reconnect(String isbn, Exception cause) {
        log.warn("Z39.50 stale connection for ISBN {}, reconnecting: {}", isbn, cause.getMessage());
        closeConnection();
        initConnection();
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
            Path tempDir = createSecureTempDir();
            tempDir.toFile().deleteOnExit();
            Path tempFile = Files.createTempFile(tempDir, "yaz_native_", tempSuffix);
            tempFile.toFile().deleteOnExit();
            Files.copy(is, tempFile, StandardCopyOption.REPLACE_EXISTING);
            System.load(tempFile.toAbsolutePath().toString());
            log.info("Loaded native yaz library from classpath: {}", resourcePath);
        } catch (IOException | UnsatisfiedLinkError e) {
            log.warn("Failed to load native yaz library: {}", e.getMessage());
        }
    }

    @SuppressWarnings("java:S5443")
    private static Path createSecureTempDir() throws IOException {
        try {
            FileAttribute<Set<PosixFilePermission>> attr = PosixFilePermissions.asFileAttribute(
                    PosixFilePermissions.fromString("rwx------"));
            return Files.createTempDirectory("homelibrary_", attr);
        } catch (UnsupportedOperationException e) {
            return Files.createTempDirectory("homelibrary_");
        }
    }

    void initConnection() {
        try {
            connection = new Connection(HOST, PORT);
            connection.connect();
            connection.setDatabaseName(DATABASE);
            connection.option("preferredRecordSyntax", USMARC_SYNTAX);
            connection.option("elementSetName", "F");
            log.info("Z39.50 connection established to {}:{}", HOST, PORT);
        } catch (Exception | Error e) {
            log.warn("Z39.50 connection initialization failed: {}", e.getMessage());
            connection = null;
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
