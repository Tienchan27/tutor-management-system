package com.example.tms.service;

import com.example.tms.api.dto.bank.BankAccountResponse;
import com.example.tms.api.dto.bank.UpdateBankAccountRequest;
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

    private BankAccountService service() {
        return new BankAccountService(bankAccountRepository, userRepository);
    }

    private TutorBankAccount account(User owner) {
        TutorBankAccount account = new TutorBankAccount();
        account.setUser(owner);
        account.setBankName("Old Bank");
        account.setAccountNumber("113366668888");
        account.setAccountHolderName("Old Holder");
        return account;
    }

    @Test
    void updateBankAccountAttachesBinAndKeepsAccountNumber() {
        UUID userId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        User owner = new User();
        owner.setId(userId);
        TutorBankAccount account = account(owner);
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(TutorBankAccount.class))).thenAnswer(inv -> inv.getArgument(0));

        BankAccountResponse res = service().updateBankAccount(userId, accountId,
                new UpdateBankAccountRequest("970415", "Vietinbank", "ICB", "New Holder"));

        assertEquals("970415", res.bankBin());
        assertEquals("Vietinbank", res.bankName());
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
    }
}
