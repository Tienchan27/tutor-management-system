package com.example.tms.payment;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;


@Component
public class VietQrGenerator {

    private static final String NAPAS_AID = "A000000727";       // NAPAS GUID
    private static final String SERVICE_TO_ACCOUNT = "QRIBFTTA"; // interbank transfer to account
    private static final String CURRENCY_VND = "704";
    private static final String COUNTRY_VN = "VN";
    private static final int MAX_DESCRIPTION = 25;

    /**
     * @param bankBin       6-digit acquirer BIN (from the bank catalog)
     * @param accountNumber beneficiary account number
     * @param amountVnd     transfer amount in VND (nullable → open-amount static QR)
     * @param description   short alphanumeric memo (the qr_ref); nullable
     */
    public String build(String bankBin, String accountNumber, Long amountVnd, String description) {
        requireDigits(bankBin, "bankBin");
        requireNotBlank(accountNumber, "accountNumber");
        if (amountVnd != null && amountVnd < 0) {
            throw new IllegalArgumentException("amountVnd must be non-negative");
        }

        StringBuilder sb = new StringBuilder();
        sb.append(tlv("00", "01"));                                  // payload format indicator
        sb.append(tlv("01", amountVnd != null ? "12" : "11"));       // dynamic (fixed amount) / static

        String beneficiary = tlv("00", bankBin) + tlv("01", accountNumber.trim());
        String merchantAccountInfo = tlv("00", NAPAS_AID) + tlv("01", beneficiary) + tlv("02", SERVICE_TO_ACCOUNT);
        sb.append(tlv("38", merchantAccountInfo));                   // merchant account information

        sb.append(tlv("53", CURRENCY_VND));                          // currency
        if (amountVnd != null) {
            sb.append(tlv("54", String.valueOf(amountVnd)));         // amount
        }
        sb.append(tlv("58", COUNTRY_VN));                            // country

        String memo = sanitize(description);
        if (!memo.isEmpty()) {
            sb.append(tlv("62", tlv("08", memo)));                   // additional data → purpose (08)
        }

        sb.append("6304");                                          // CRC id + length, value computed over all above
        sb.append(crc16(sb.toString()));
        return sb.toString();
    }

    private static String tlv(String id, String value) {
        int len = value.length();
        if (len > 99) {
            throw new IllegalArgumentException("TLV value too long for id " + id + " (" + len + ")");
        }
        return id + String.format("%02d", len) + value;
    }

    /** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflection, no xorout). */
    static String crc16(String data) {
        int crc = 0xFFFF;
        for (byte b : data.getBytes(StandardCharsets.US_ASCII)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                if ((crc & 0x8000) != 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }
        return String.format("%04X", crc);
    }

    /** Strip diacritics and keep only VietQR-safe characters, capped in length. */
    private static String sanitize(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String ascii = Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^A-Za-z0-9 ]", "");
        return ascii.length() > MAX_DESCRIPTION ? ascii.substring(0, MAX_DESCRIPTION) : ascii;
    }

    private static void requireNotBlank(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
    }

    private static void requireDigits(String value, String field) {
        requireNotBlank(value, field);
        if (!value.trim().matches("\\d+")) {
            throw new IllegalArgumentException(field + " must be numeric");
        }
    }
}
