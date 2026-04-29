package com.homelibrary.isbn;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.marc4j.MarcStreamWriter;
import org.marc4j.marc.MarcFactory;
import org.marc4j.marc.DataField;

import java.io.ByteArrayOutputStream;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OszkNektarClientTest {

    private OszkNektarClient client;

    @BeforeEach
    void setUp() {
        client = new OszkNektarClient();
    }

    @Test
    void parseMarc_fullRecord_returnsAllMappedFields() throws Exception {
        byte[] marc = buildMarc(Map.of(
                "020", Map.of('a', "978-963-609-199-6"),
                "100", Map.of('a', "Steigervald Krisztián"),
                "245", Map.of('a', "Szülői generációk harca /", 'b', "hogyan értsük meg magunkat?"),
                "260", Map.of('b', "Partvonal,", 'c', "[2026]"),
                "300", Map.of('a', "311 p."),
                "041", Map.of('a', "hun")
        ));

        Optional<IsbnLookupResult> result = client.parseMarc(marc, "9789636091996");

        assertThat(result).isPresent();
        IsbnLookupResult r = result.get();
        assertThat(r.isbn()).isEqualTo("9789636091996");
        assertThat(r.title()).isEqualTo("Szülői generációk harca");
        assertThat(r.subtitle()).isEqualTo("hogyan értsük meg magunkat?");
        assertThat(r.authors()).containsExactly("Steigervald Krisztián");
        assertThat(r.publisher()).isEqualTo("Partvonal");
        assertThat(r.publishYear()).isEqualTo(2026);
        assertThat(r.pageCount()).isEqualTo(311);
        assertThat(r.language()).isEqualTo("hun");
        assertThat(r.source()).isEqualTo(IsbnSource.OSZK);
    }

    @Test
    void parseMarc_missingTitle_returnsEmpty() throws Exception {
        byte[] marc = buildMarc(Map.of(
                "100", Map.of('a', "Szerző Neve")
        ));

        assertThat(client.parseMarc(marc, "9780000000000")).isEmpty();
    }

    @Test
    void parseMarc_blankTitle_returnsEmpty() throws Exception {
        byte[] marc = buildMarc(Map.of(
                "100", Map.of('a', "Szerző Neve"),
                "245", Map.of('a', "   /")
        ));

        assertThat(client.parseMarc(marc, "9780000000000")).isEmpty();
    }

    @Test
    void parseMarc_missingAuthor_returnsEmpty() throws Exception {
        byte[] marc = buildMarc(Map.of(
                "245", Map.of('a', "Valamilyen cím")
        ));

        assertThat(client.parseMarc(marc, "9780000000000")).isEmpty();
    }

    @Test
    void parseMarc_multipleAuthors_includesAll() throws Exception {
        MarcFactory factory = MarcFactory.newInstance();
        org.marc4j.marc.Record record = factory.newRecord();

        DataField field245 = factory.newDataField("245", ' ', ' ');
        field245.addSubfield(factory.newSubfield('a', "Közös könyv"));
        record.addVariableField(field245);

        DataField field100 = factory.newDataField("100", ' ', ' ');
        field100.addSubfield(factory.newSubfield('a', "Első Szerző"));
        field100.addSubfield(factory.newSubfield('j', "szerk."));
        record.addVariableField(field100);

        DataField field700a = factory.newDataField("700", ' ', ' ');
        field700a.addSubfield(factory.newSubfield('a', "Második Szerző"));
        record.addVariableField(field700a);

        DataField field700b = factory.newDataField("700", ' ', ' ');
        field700b.addSubfield(factory.newSubfield('a', "Harmadik Szerző"));
        record.addVariableField(field700b);

        Optional<IsbnLookupResult> result = client.parseMarc(toBytes(record), "9780000000001");

        assertThat(result).isPresent();
        assertThat(result.get().authors()).containsExactly(
                "Első Szerző szerk.",
                "Második Szerző",
                "Harmadik Szerző"
        );
    }

    @Test
    void parseMarc_hungarianAccentedIsbn_parsedCorrectly() throws Exception {
        byte[] marc = buildMarc(Map.of(
                "020", Map.of('a', "978-963-609-199-6"),
                "100", Map.of('a', "Tóth Árpád"),
                "245", Map.of('a', "Árvácska /")
        ));

        Optional<IsbnLookupResult> result = client.parseMarc(marc, "9789636091996");

        assertThat(result).isPresent();
        assertThat(result.get().authors()).containsExactly("Tóth Árpád");
        assertThat(result.get().title()).isEqualTo("Árvácska");
        assertThat(result.get().isbn()).isEqualTo("9789636091996");
    }

    @Test
    void parseMarc_isbnFallsBackToInputWhenFieldMissing() throws Exception {
        byte[] marc = buildMarc(Map.of(
                "100", Map.of('a', "Szerző"),
                "245", Map.of('a', "Cím")
        ));

        Optional<IsbnLookupResult> result = client.parseMarc(marc, "9780000000002");

        assertThat(result).isPresent();
        assertThat(result.get().isbn()).isEqualTo("9780000000002");
    }

    @Test
    void parseMarc_optionalFieldsMissing_returnsResultWithNulls() throws Exception {
        byte[] marc = buildMarc(Map.of(
                "100", Map.of('a', "Szerző"),
                "245", Map.of('a', "Cím")
        ));

        Optional<IsbnLookupResult> result = client.parseMarc(marc, "9780000000003");

        assertThat(result).isPresent();
        assertThat(result.get().subtitle()).isNull();
        assertThat(result.get().publisher()).isNull();
        assertThat(result.get().publishYear()).isNull();
        assertThat(result.get().pageCount()).isNull();
        assertThat(result.get().language()).isNull();
    }

    // --- helpers ---

    private byte[] buildMarc(Map<String, Map<Character, String>> fields) throws Exception {
        MarcFactory factory = MarcFactory.newInstance();
        org.marc4j.marc.Record record = factory.newRecord();
        for (Map.Entry<String, Map<Character, String>> entry : fields.entrySet()) {
            DataField df = factory.newDataField(entry.getKey(), ' ', ' ');
            for (Map.Entry<Character, String> sf : entry.getValue().entrySet()) {
                df.addSubfield(factory.newSubfield(sf.getKey(), sf.getValue()));
            }
            record.addVariableField(df);
        }
        return toBytes(record);
    }

    private byte[] toBytes(org.marc4j.marc.Record record) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MarcStreamWriter writer = new MarcStreamWriter(baos, "UTF-8");
        writer.write(record);
        writer.close();
        return baos.toByteArray();
    }
}
