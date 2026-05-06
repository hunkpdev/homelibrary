package com.homelibrary.isbn;

import com.homelibrary.util.NativeLibraryLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.yaz4j.Connection;
import org.yaz4j.PrefixQuery;
import org.yaz4j.ResultSet;
import org.yaz4j.exception.ConnectionUnavailableException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OszkNektarClientTest {

    @Mock
    private NativeLibraryLoader nativeLibraryLoader;

    @Mock
    private Connection connection;

    private OszkNektarClient client;

    @BeforeEach
    void setUp() {
        client = new OszkNektarClient(nativeLibraryLoader, () -> connection, Clock.systemUTC());
    }

    @Test
    void init_loadsNativeLibraryForCurrentOs() {
        client.init();

        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        String expectedPath = isWindows ? "native/win32-x86_64/yaz5.dll" : "native/linux-x86_64/libyaz.so.5";
        String expectedSuffix = isWindows ? ".dll" : ".so";
        verify(nativeLibraryLoader).load(expectedPath, expectedSuffix);
    }

    @Test
    void lookup_connectionInitFails_returnsEmpty() {
        OszkNektarClient failingClient = new OszkNektarClient(
                nativeLibraryLoader,
                () -> { throw new RuntimeException("conn failed"); },
                Clock.systemUTC()
        );

        assertThat(failingClient.lookup("9780000000001")).isEmpty();
    }

    @Test
    void lookup_noHits_returnsEmpty() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getHitCount()).thenReturn(0L);
        when(connection.search(any(PrefixQuery.class))).thenReturn(rs);

        assertThat(client.lookup("9780000000001")).isEmpty();
    }

    @Test
    void lookup_connectionUnavailable_retriesOnce() throws Exception {
        Connection conn2 = mock(Connection.class);
        Supplier<Connection> factory = mock(Supplier.class);
        when(factory.get()).thenReturn(connection, conn2);

        ResultSet emptyRs = mock(ResultSet.class);
        when(emptyRs.getHitCount()).thenReturn(0L);
        when(connection.search(any())).thenThrow(new ConnectionUnavailableException("stale"));
        when(conn2.search(any())).thenReturn(emptyRs);

        OszkNektarClient c = new OszkNektarClient(nativeLibraryLoader, factory, Clock.systemUTC());

        assertThat(c.lookup("9780000000001")).isEmpty();
        verify(connection).close();
        verify(factory, times(2)).get();
    }

    @Test
    void lookup_allRetriesExhausted_returnsEmpty() throws Exception {
        when(connection.search(any())).thenThrow(new ConnectionUnavailableException("stale"));

        assertThat(client.lookup("9780000000001")).isEmpty();
        verify(connection, times(2)).search(any());
    }

    @Test
    void lookup_unexpectedException_returnsEmptyWithoutRetry() throws Exception {
        when(connection.search(any())).thenThrow(new RuntimeException("unexpected"));

        assertThat(client.lookup("9780000000001")).isEmpty();
        verify(connection, times(1)).search(any());
    }

    @Test
    void lookup_idleTimeoutExpired_closesAndReopensConnection() throws Exception {
        Instant t0 = Instant.EPOCH;
        Instant t1 = t0.plus(Duration.ofMinutes(2));
        Clock controlledClock = mock(Clock.class);
        when(controlledClock.instant()).thenReturn(t0, t1, t1);

        Connection conn2 = mock(Connection.class);
        Supplier<Connection> factory = mock(Supplier.class);
        when(factory.get()).thenReturn(connection, conn2);

        ResultSet emptyRs = mock(ResultSet.class);
        when(emptyRs.getHitCount()).thenReturn(0L);
        when(connection.search(any())).thenReturn(emptyRs);
        when(conn2.search(any())).thenReturn(emptyRs);

        OszkNektarClient c = new OszkNektarClient(nativeLibraryLoader, factory, controlledClock);

        c.lookup("9780000000001"); // lastUsed = t0
        c.lookup("9780000000002"); // t1 - t0 = 2min > idle timeout → close + reopen

        verify(connection).close();
        verify(factory, times(2)).get();
    }

    @Test
    void lookup_withinIdleTimeout_reusesConnection() throws Exception {
        Instant t0 = Instant.EPOCH;
        Instant t1 = t0.plus(Duration.ofSeconds(30));
        Clock controlledClock = mock(Clock.class);
        when(controlledClock.instant()).thenReturn(t0, t1, t1);

        Supplier<Connection> factory = mock(Supplier.class);
        when(factory.get()).thenReturn(connection);

        ResultSet emptyRs = mock(ResultSet.class);
        when(emptyRs.getHitCount()).thenReturn(0L);
        when(connection.search(any())).thenReturn(emptyRs);

        OszkNektarClient c = new OszkNektarClient(nativeLibraryLoader, factory, controlledClock);

        c.lookup("9780000000001"); // lastUsed = t0
        c.lookup("9780000000002"); // t1 - t0 = 30s < idle timeout → reuse

        verify(connection, never()).close();
        verify(factory, times(1)).get();
    }
}
