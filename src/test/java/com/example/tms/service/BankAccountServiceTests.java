package com.example.tms.service;

import com.example.tms.api.dto.bank.BankAccountResponse;
import com.example.tms.api.dto.bank.CreateBankAccountRequest;
import com.example.tms.api.dto.bank.UpdateBankAccountRequest;
import com.example.tms.entity.BankCatalogEntry;
import com.example.tms.entity.TutorBankAccount;
import com.example.tms.entity.User;
import com.example.tms.exception.ApiException;
import com.example.tms.repository.TutorBankAccountRepository;
import com.example.tms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BankAccountServiceTests {

    @Mock private TutorBankAccountRepository bankAccountRepository;
    @Mock private UserRepository userRepository;
    @Mock private BankCatalogService bankCatalogService;

    private BankAccountService service() {
        return new BankAccountService(bankAccountRepository, userRepository, bankCatalogService);
    }

    private TutorBankAccount account(User owner) {
        TutorBankAccount account = new TutorBankAccount();
        account.setUser(owner);
        account.setBankName("Old Bank");
        account.setAccountNumber("113366668888");
        account.setAccountHolderName("Old Holder");
        return account;
    }

    private BankCatalogEntry vietin() {
        BankCatalogEntry entry = new BankCatalogEntry();
        entry.setBin("970415");
        entry.setCode("ICB");
        entry.setShortName("VietinBank");
        entry.setTransferSupported(true);
        return entry;
    }

    @Test
    void createBankAccount_requiresTransferableBinFromCatalog() {
        UUID userId = UUID.randomUUID();
        User owner = new User();
        owner.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(owner));
        when(bankCatalogService.requireTransferable("970415")).thenReturn(vietin());
        when(bankAccountRepository.existsByUserIdAndIsPrimaryTrue(userId)).thenReturn(false);
        when(bankAccountRepository.save(any(TutorBankAccount.class))).thenAnswer(inv -> inv.getArgument(0));

        BankAccountResponse res = service().createBankAccount(userId, new CreateBankAccountRequest(
                "ignored", "113366668888", "Holder", "970415", "ignored"));

        assertEquals("970415", res.bankBin());
        assertEquals("VietinBank", res.bankName());
    }

    @Test
    void createBankAccount_rejectsMissingBinViaCatalog() {
        UUID userId = UUID.randomUUID();
        User owner = new User();
        owner.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(owner));
        when(bankCatalogService.requireTransferable("000000"))
                .thenThrow(ApiException.notFound("BANK_NOT_FOUND", "Bank is not in the catalog"));

        assertThrows(ApiException.class, () -> service().createBankAccount(userId,
                new CreateBankAccountRequest(null, "113366668888", "Holder", "000000", null)));
        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    void updateBankAccountAttachesBinAndKeepsAccountNumber() {
        UUID userId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        User owner = new User();
        owner.setId(userId);
        TutorBankAccount account = account(owner);
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(bankCatalogService.requireTransferable("970415")).thenReturn(vietin());
        when(bankAccountRepository.save(any(TutorBankAccount.class))).thenAnswer(inv -> inv.getArgument(0));

        BankAccountResponse res = service().updateBankAccount(userId, accountId,
                new UpdateBankAccountRequest("970415", "ignored", "ICB", "New Holder"));

        assertEquals("970415", res.bankBin());
        assertEquals("VietinBank", res.bankName());
        assertEquals("New Holder", res.accountHolderName());
        assertEquals("113366668888", account.getAccountNumber(), "account number is preserved");
    }

    @Test
    void updateBankAccountRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        User owner = new User();
        owner.setId(ownerId);
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(account(owner)));

        ApiException ex = assertThrows(ApiException.class, () -> service().updateBankAccount(
                UUID.randomUUID(), accountId, new UpdateBankAccountRequest("970415", "Vietinbank", "ICB", "Holder")));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(bankAccountRepository, never()).save(any());
        verify(bankCatalogService, never()).requireTransferable(any());
    }
}
