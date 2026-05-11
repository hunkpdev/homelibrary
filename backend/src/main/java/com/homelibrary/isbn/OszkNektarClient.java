package com.homelibrary.isbn;

import com.homelibrary.dto.IsbnLookupResponse;
import com.homelibrary.util.Marc21Util;
import com.homelibrary.util.NativeLibraryLoader;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.yaz4j.Connection;
import org.yaz4j.PrefixQuery;
import org.yaz4j.Record;
import org.yaz4j.ResultSet;
import org.yaz4j.exception.ConnectionTimeoutException;
import org.yaz4j.exception.ConnectionUnavailableException;
import org.yaz4j.exception.ZoomException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Z39.50 client for the OSZK NEKTÁR service.
 *
 * <p><b>Thread-safety:</b> this class is not thread-safe on its own due to {@link Connection}.
 * The underlying yaz4j {@code ZOOM_connection} is single-threaded at the native level.
 * Designed for the AWS Lambda single-request-per-container model; the {@code synchronized}
 * on {@code lookup()} is defensive futurproofing for other deployment targets.
 */
@Component
@Slf4j
public class OszkNektarClient {

    private static final String HOST = "tagetes2.oszk.hu";
    private static final int PORT = 1616;
    private static final String DATABASE = "B1";
    private static final String USMARC_SYNTAX = "usmarc";
    private static final int RETRY_COUNT = 1;
    private static final Duration IDLE_TIMEOUT = Duration.ofMinutes(1);

    private final NativeLibraryLoader nativeLibraryLoader;
    private final Supplier<Connection> connectionFactory;
    private final Clock clock;

    private Connection connection;
    private Instant lastUsed;

    @Autowired
    public OszkNektarClient(NativeLibraryLoader nativeLibraryLoader) {
        this(nativeLibraryLoader, () -> new Connection(HOST, PORT), Clock.systemUTC());
    }

    OszkNektarClient(NativeLibraryLoader nativeLibraryLoader, Supplier<Connection> connectionFactory, Clock clock) {
        this.nativeLibraryLoader = nativeLibraryLoader;
        this.connectionFactory = connectionFactory;
        this.clock = clock;
    }

    @PostConstruct
    void init() {
        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        if (isWindows) {
            nativeLibraryLoader.load("native/win32-x86_64/yaz5.dll");
        } else {
            nativeLibraryLoader.load("native/linux-x86_64/libyaz.so.5");
            nativeLibraryLoader.load("Linux/amd64/libyaz4j.so");
        }
    }

    @PreDestroy
    void destroy() {
        closeConnection();
    }

    public synchronized Optional<IsbnLookupResponse> lookup(String isbn) {
        ensureFreshConnection();
        if (connection == null) {
            log.warn("Z39.50 connection not available, lookup skipped");
            return Optional.empty();
        }
        int retries = 0;
        while (retries <= RETRY_COUNT) {
            try {
                log.debug("Z39.50 lookup attempt #{} for ISBN {}", retries, isbn);
                Optional<IsbnLookupResponse> result = performLookup(isbn);
                lastUsed = Instant.now(clock);
                return result;
            } catch (ConnectionUnavailableException | ConnectionTimeoutException e) {
                if (++retries <= RETRY_COUNT) {
                    reconnect(isbn, e);
                }
            } catch (Exception e) {
                log.warn("Z39.50 lookup failed for ISBN {}: {}", isbn, e.getMessage());
                return Optional.empty();
            }
        }
        log.warn("Z39.50 lookup failed after {} retries for ISBN {}", RETRY_COUNT, isbn);
        return Optional.empty();
    }

    // Lazy eviction: the connection is closed on the next lookup after IDLE_TIMEOUT, not proactively.
    // On Lambda, the JVM is frozen between requests — a background scheduler would not fire during
    // the freeze anyway, so lazy eviction on the next incoming request is the correct approach.
    private void ensureFreshConnection() {
        if (connection != null && lastUsed != null
                && Duration.between(lastUsed, Instant.now(clock)).compareTo(IDLE_TIMEOUT) > 0) {
            log.debug("Z39.50 connection idle > {}, closing", IDLE_TIMEOUT);
            closeConnection();
        }
        if (connection == null) {
            initConnection();
        }
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

    private void initConnection() {
        try {
            connection = connectionFactory.get();
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
