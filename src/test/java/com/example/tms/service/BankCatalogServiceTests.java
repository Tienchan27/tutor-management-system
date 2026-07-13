package com.example.tms.service;

import com.example.tms.api.dto.bank.BankCatalogResponse;
import com.example.tms.entity.BankCatalogEntry;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.BankCatalogRepository;
import com.example.tms.util.AdvisoryLockService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BankCatalogServiceTests {

    @Mock private BankCatalogRepository repository;
    @Mock private RestClient vietQrRestClient;
    @Mock private AdvisoryLockService advisoryLockService;

    private BankCatalogService service() {
        return new BankCatalogService(repository, vietQrRestClient, advisoryLockService);
    }

    @Test
    void ensureSynced_noopWhenCatalogAlreadyPopulated() {
        when(repository.count()).thenReturn(12L);

        int synced = service().ensureSynced();

        assertEquals(0, synced);
        verify(advisoryLockService).acquireTransactionLock("bank-catalog-ensure");
        verify(vietQrRestClient, never()).get();
    }

    @Test
    void list_mapsEntries() {
        BankCatalogEntry entry = new BankCatalogEntry();
        entry.setBin("970415");
        entry.setCode("ICB");
        entry.setShortName("VietinBank");
        entry.setName("Vietnam Joint Stock Commercial Bank for Industry and Trade");
        entry.setTransferSupported(true);
        when(repository.findAllByOrderByShortNameAsc()).thenReturn(List.of(entry));

        List<BankCatalogResponse> list = service().list();

        assertEquals(1, list.size());
        assertEquals("970415", list.get(0).bin());
        assertEquals("VietinBank", list.get(0).shortName());
    }

    @Test
    void requireTransferable_rejectsUnknownBin() {
        when(repository.findById(anyString())).thenReturn(java.util.Optional.empty());
        org.junit.jupiter.api.Assertions.assertThrows(ApiException.class,
                () -> service().requireTransferable("000000"));
    }
}
