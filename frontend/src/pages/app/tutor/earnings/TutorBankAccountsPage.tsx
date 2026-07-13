import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBankAccount,
  deleteBankAccount,
  listMyBankAccounts,
  setPrimaryBankAccount,
  updateBankAccount,
} from '../../../../services/bankAccountService';
import { BankAccountResponse, CreateBankAccountRequest } from '../../../../types/bankAccounts';
import { extractApiErrorMessage } from '../../../../services/authService';
import PageSection from '../../../../components/layout/PageSection';
import SectionBlock from '../../../../components/ui/SectionBlock';
import Button from '../../../../components/ui/Button';
import Spinner from '../../../../components/ui/Spinner';
import EmptyState from '../../../../components/ui/EmptyState';
import StatusPill from '../../../../components/ui/StatusPill';
import Modal from '../../../../components/ui/Modal';
import BankSelect from '../../../../components/payments/BankSelect';
import { useToast } from '../../../../components/feedback/ToastProvider';
import { useBankCatalog } from '../../../../hooks/useBankCatalog';
import { queryKeys } from '../../../../lib/queryKeys';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
  bankBin: '',
};

interface EditForm {
  bankBin: string;
  bankName: string;
  bankCode: string;
  accountHolderName: string;
}

function TutorBankAccountsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [bankError, setBankError] = useState('');
  const [editing, setEditing] = useState<BankAccountResponse | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ bankBin: '', bankName: '', bankCode: '', accountHolderName: '' });

  const { banks, isLoading: banksLoading, error: banksError, refetch: refetchBanks } = useBankCatalog();

  const { data: items = [], isLoading: bankLoading } = useQuery({
    queryKey: queryKeys.tutorBankAccounts,
    queryFn: listMyBankAccounts,
  });

  const invalidateBanks = () => queryClient.invalidateQueries({ queryKey: queryKeys.tutorBankAccounts });

  const createMutation = useMutation({
    mutationFn: () => createBankAccount(form),
    onSuccess: () => {
      showToast('Bank account added', 'success');
      setForm(initialForm);
      setBankError('');
      void invalidateBanks();
    },
    onError: (err) => setBankError(extractApiErrorMessage(err, 'Failed to add bank account')),
  });

  const primaryMutation = useMutation({
    mutationFn: (id: string) => setPrimaryBankAccount(id),
    onSuccess: () => {
      showToast('Primary account updated', 'success');
      void invalidateBanks();
    },
    onError: (err) => setBankError(extractApiErrorMessage(err, 'Failed to set primary account')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBankAccount(id),
    onSuccess: () => {
      showToast('Bank account removed', 'success');
      void invalidateBanks();
    },
    onError: (err) => setBankError(extractApiErrorMessage(err, 'Failed to delete account')),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateBankAccount(editing!.id, {
        bankBin: editForm.bankBin,
        bankName: editForm.bankName,
        bankCode: editForm.bankCode || undefined,
        accountHolderName: editForm.accountHolderName,
      }),
    onSuccess: () => {
      showToast('Bank account updated', 'success');
      setEditing(null);
      void invalidateBanks();
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update account'), 'error'),
  });

  function handleCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!form.bankBin) {
      setBankError('Select a bank from the catalog.');
      return;
    }
    setBankError('');
    createMutation.mutate();
  }

  function openEdit(account: BankAccountResponse): void {
    setEditing(account);
    setEditForm({
      bankBin: account.bankBin ?? '',
      bankName: account.bankName,
      bankCode: '',
      accountHolderName: account.accountHolderName,
    });
  }

  const canCreate = !!form.bankBin && !!form.accountNumber.trim() && !!form.accountHolderName.trim();
  const canSaveEdit = !!editForm.bankBin && !!editForm.accountHolderName.trim();

  return (
    <PageSection title="Bank accounts">
      <SectionBlock title="Add account">
        <form onSubmit={handleCreate} className="stack-16">
          {banksLoading && !banks.length ? <p className="muted">Loading bank catalog…</p> : null}
          <div className="grid-form">
            <BankSelect
              banks={banks}
              valueBin={form.bankBin ?? ''}
              disabled={banksLoading && !banks.length}
              onSelect={(bank) =>
                setForm((prev) => ({ ...prev, bankName: bank.shortName, bankBin: bank.bin, bankCode: bank.code }))
              }
            />
            <input
              className="text-input"
              placeholder="Account number"
              value={form.accountNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
              required
            />
            <input
              className="text-input"
              placeholder="Account holder name"
              value={form.accountHolderName}
              onChange={(e) => setForm((prev) => ({ ...prev, accountHolderName: e.target.value }))}
              required
            />
          </div>
          <div className="form-actions">
            <Button type="submit" loading={createMutation.isPending} disabled={!canCreate}>
              Add account
            </Button>
            {banksError ? (
              <Button type="button" variant="secondary" onClick={() => refetchBanks()}>
                Retry banks
              </Button>
            ) : null}
          </div>
        </form>
        {bankError || banksError ? <p className="error-text">{bankError || banksError}</p> : null}
      </SectionBlock>

      <SectionBlock title="Your accounts">
        {bankLoading ? <Spinner label="Loading accounts..." /> : null}
        {!bankLoading && !items.length ? (
          <EmptyState title="No bank accounts" description="Add an account to receive payouts." />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Bank</th>
                  <th scope="col">Account</th>
                  <th scope="col">Holder</th>
                  <th scope="col">Primary</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {item.bankName}
                        {!item.bankBin ? <StatusPill label="Needs update" tone="warning" /> : null}
                      </span>
                    </td>
                    <td>{item.maskedAccountNumber}</td>
                    <td>{item.accountHolderName}</td>
                    <td>
                      <StatusPill
                        label={item.isPrimary ? 'Primary' : 'Secondary'}
                        tone={item.isPrimary ? 'success' : 'neutral'}
                      />
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => primaryMutation.mutate(item.id)}
                          disabled={item.isPrimary}
                        >
                          Set primary
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionBlock>

      <Modal
        open={!!editing}
        title="Edit bank account"
        subtitle={editing ? editing.maskedAccountNumber : undefined}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={updateMutation.isPending}
              disabled={!canSaveEdit}
              onClick={() => updateMutation.mutate()}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="stack-16">
          <BankSelect
            banks={banks}
            valueBin={editForm.bankBin}
            onSelect={(bank) =>
              setEditForm((prev) => ({ ...prev, bankBin: bank.bin, bankName: bank.shortName, bankCode: bank.code }))
            }
          />
          <input
            className="text-input"
            placeholder="Account holder name"
            value={editForm.accountHolderName}
            onChange={(e) => setEditForm((prev) => ({ ...prev, accountHolderName: e.target.value }))}
          />
        </div>
      </Modal>
    </PageSection>
  );
}

export default TutorBankAccountsPage;
