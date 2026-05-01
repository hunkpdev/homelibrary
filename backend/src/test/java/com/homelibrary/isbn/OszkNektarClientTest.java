package com.homelibrary.isbn;

import com.homelibrary.dto.IsbnLookupResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.marc4j.MarcStreamWriter;
import org.marc4j.marc.DataField;
import org.marc4j.marc.MarcFactory;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.yaz4j.Connection;
import org.yaz4j.Record;
import org.yaz4j.ResultSet;
import org.yaz4j.exception.ConnectionTimeoutException;
import org.yaz4j.exception.ConnectionUnavailableException;

import java.io.ByteArrayOutputStream;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OszkNektarClientTest {

    @Mock
    private Connection mockConnection;
    @Mock
    private ResultSet mockResultSet;
    @Mock
    private Record mockRecord;

    private OszkNektarClient spy;

    @BeforeEach
    void setUp() {
        spy = Mockito.spy(new OszkNektarClient());
    }

    private void stubInitDoNothing() {
        doNothing().when(spy).initConnection();
    }

    private void stubInitInjectsConnection() {
        doAnswer(inv -> {
            ReflectionTestUtils.setField(spy, "connection", mockConnection);
            return null;
        }).when(spy).initConnection();
    }

    private void injectConnection() {
        ReflectionTestUtils.setField(spy, "connection", mockConnection);
    }

    @Test
    void lookup_whenConnectionNull_returnsEmpty() {
        stubInitDoNothing();

        assertThat(spy.lookup("9789636091996")).isEmpty();
    }

    @Test
    void lookup_whenNoHits_returnsEmpty() throws Exception {
        stubInitDoNothing();
        injectConnection();
        when(mockConnection.search(any())).thenReturn(mockResultSet);
        when(mockResultSet.getHitCount()).thenReturn(0L);

        assertThat(spy.lookup("9789636091996")).isEmpty();
    }

    @Test
    void lookup_whenFirstRecordValid_returnsResult() throws Exception {
        stubInitDoNothing();
        injectConnection();
        when(mockConnection.search(any())).thenReturn(mockResultSet);
        when(mockResultSet.getHitCount()).thenReturn(1L);
        when(mockResultSet.getRecord(0)).thenReturn(mockRecord);
        when(mockRecord.get("raw")).thenReturn(buildValidMarc());

        Optional<IsbnLookupResponse> result = spy.lookup("9789636091996");

        assertThat(result).isPresent();
        assertThat(result.get().title()).isEqualTo("Teszt cím");
    }

    @Test
    void lookup_whenFirstRecordInvalidSecondValid_returnsResult() throws Exception {
        stubInitDoNothing();
        injectConnection();
        Record mockRecord2 = mock(Record.class);
        when(mockConnection.search(any())).thenReturn(mockResultSet);
        when(mockResultSet.getHitCount()).thenReturn(2L);
        when(mockResultSet.getRecord(0)).thenReturn(mockRecord);
        when(mockResultSet.getRecord(1)).thenReturn(mockRecord2);
        when(mockRecord.get("raw")).thenReturn(new byte[0]);
        when(mockRecord2.get("raw")).thenReturn(buildValidMarc());

        Optional<IsbnLookupResponse> result = spy.lookup("9789636091996");

        assertThat(result).isPresent();
        assertThat(result.get().title()).isEqualTo("Teszt cím");
    }

    @Test
    void lookup_whenAllRecordsInvalid_returnsEmpty() throws Exception {
        stubInitDoNothing();
        injectConnection();
        when(mockConnection.search(any())).thenReturn(mockResultSet);
        when(mockResultSet.getHitCount()).thenReturn(1L);
        when(mockResultSet.getRecord(0)).thenReturn(mockRecord);
        when(mockRecord.get("raw")).thenReturn(new byte[0]);

        assertThat(spy.lookup("9789636091996")).isEmpty();
    }

    @Test
    void lookup_whenConnectionUnavailableExceptionThenSuccess_returnsResult() throws Exception {
        stubInitInjectsConnection();
        when(mockConnection.search(any()))
                .thenThrow(new ConnectionUnavailableException("stale"))
                .thenReturn(mockResultSet);
        when(mockResultSet.getHitCount()).thenReturn(1L);
        when(mockResultSet.getRecord(0)).thenReturn(mockRecord);
        when(mockRecord.get("raw")).thenReturn(buildValidMarc());

        Optional<IsbnLookupResponse> result = spy.lookup("9789636091996");

        assertThat(result).isPresent();
    }

    @Test
    void lookup_whenConnectionUnavailableExceptionTwice_returnsEmpty() throws Exception {
        stubInitInjectsConnection();
        when(mockConnection.search(any()))
                .thenThrow(new ConnectionUnavailableException("stale"))
                .thenThrow(new ConnectionUnavailableException("still stale"));

        assertThat(spy.lookup("9789636091996")).isEmpty();
    }

    @Test
    void lookup_whenConnectionTimeoutExceptionTwice_returnsEmpty() throws Exception {
        stubInitInjectsConnection();
        when(mockConnection.search(any()))
                .thenThrow(new ConnectionTimeoutException("timeout"))
                .thenThrow(new ConnectionTimeoutException("still timeout"));

        assertThat(spy.lookup("9789636091996")).isEmpty();
    }

    @Test
    void lookup_whenGenericException_returnsEmpty() throws Exception {
        stubInitDoNothing();
        injectConnection();
        when(mockConnection.search(any())).thenThrow(new RuntimeException("unexpected"));

        assertThat(spy.lookup("9789636091996")).isEmpty();
    }

    @Test
    void destroy_whenConnectionNotNull_closesAndNulls() {
        injectConnection();

        spy.destroy();

        verify(mockConnection).close();
        assertThat(ReflectionTestUtils.getField(spy, "connection")).isNull();
    }

    @Test
    void destroy_whenConnectionCloseThrows_setsConnectionToNull() {
        injectConnection();
        doThrow(new RuntimeException("close failed")).when(mockConnection).close();

        spy.destroy();

        assertThat(ReflectionTestUtils.getField(spy, "connection")).isNull();
    }

    @Test
    void destroy_whenConnectionNull_doesNothing() {
        assertThatCode(() -> spy.destroy()).doesNotThrowAnyException();
    }

    private byte[] buildValidMarc() {
        MarcFactory factory = MarcFactory.newInstance();
        org.marc4j.marc.Record rec = factory.newRecord();

        DataField f100 = factory.newDataField("100", ' ', ' ');
        f100.addSubfield(factory.newSubfield('a', "Teszt Szerző"));
        rec.addVariableField(f100);

        DataField f245 = factory.newDataField("245", ' ', ' ');
        f245.addSubfield(factory.newSubfield('a', "Teszt cím /"));
        rec.addVariableField(f245);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MarcStreamWriter writer = new MarcStreamWriter(baos, "UTF-8");
        writer.write(rec);
        writer.close();
        return baos.toByteArray();
    }
}
