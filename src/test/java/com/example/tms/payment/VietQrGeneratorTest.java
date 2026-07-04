package com.example.tms.payment;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VietQrGeneratorTest {

    private final VietQrGenerator generator = new VietQrGenerator();

    @Test
    void crc16MatchesCcittFalseReferenceVector() {
        // CRC-16/CCITT-FALSE("123456789") == 0x29B1 (canonical check value).
        assertEquals("29B1", VietQrGenerator.crc16("123456789"));
    }

    @Test
    void buildEmbedsBankBinAccountAmountAndDescription() {
        String payload = generator.build("970415", "113366668888", 50000L, "HP123ABC");

        assertTrue(payload.startsWith("000201"), "payload format indicator");
        assertTrue(payload.contains("010212"), "dynamic POI method when amount present");
        assertTrue(payload.contains("0010A000000727"), "NAPAS AID in merchant account info");
        assertTrue(payload.contains("0006970415"), "bank BIN under sub-tag 00");
        assertTrue(payload.contains("0112113366668888"), "account number under sub-tag 01");
        assertTrue(payload.contains("0208QRIBFTTA"), "service code QRIBFTTA");
        assertTrue(payload.contains("5303704"), "currency 704 (VND)");
        assertTrue(payload.contains("540550000"), "amount 50000 under tag 54");
        assertTrue(payload.contains("5802VN"), "country VN");
        assertTrue(payload.contains("0808HP123ABC"), "description under 62/08");
    }

    @Test
    void appendedCrcIsValidOverTheWholePayload() {
        String payload = generator.build("970415", "113366668888", 50000L, "HP123ABC");
        String body = payload.substring(0, payload.length() - 4); // includes the "6304" tag+len
        String crc = payload.substring(payload.length() - 4);
        assertEquals(VietQrGenerator.crc16(body), crc, "trailing CRC must verify");
    }

    @Test
    void openAmountQrUsesStaticPoiAndOmitsAmountTag() {
        String payload = generator.build("970415", "113366668888", null, null);
        assertTrue(payload.contains("010211"), "static POI method when no amount");
        assertFalse(payload.contains("5405"), "no amount tag");
    }

    @Test
    void descriptionIsStrippedOfDiacriticsAndUnsafeChars() {
        String payload = generator.build("970415", "113366668888", 1000L, "Học phí #1!");
        // "Học phí 1" → "Hoc phi 1"
        assertTrue(payload.contains("Hoc phi 1"), "diacritics and symbols removed");
    }

    @Test
    void rejectsNonNumericBin() {
        assertThrows(IllegalArgumentException.class,
                () -> generator.build("VCB", "12345", 1000L, "x"));
    }
}
