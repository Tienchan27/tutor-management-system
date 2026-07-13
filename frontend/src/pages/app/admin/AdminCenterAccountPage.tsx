import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCenterAccount,
  getCenterAccountPrefillFromPrimary,
  updateCenterAccount,
} from '../../../services/centerAccountService';
import { syncBankCatalog } from '../../../services/bankCatalogService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Button from '../../../components/ui/Button';
import BankSelect from '../../../components/payments/BankSelect';
import { useToast } from '../../../components/feedback/ToastProvider';
import { useBankCatalog } from '../../../hooks/useBankCatalog';
import { queryKeys } from '../../../lib/queryKeys';

interface CenterForm {
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

const emptyCenter: CenterForm = { bankBin: '', bankName: '', accountNumber: '', accountHolderName: '' };

function AdminCenterAccountPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [center, setCenter] = useState<CenterForm>(emptyCenter);

  const { banks, isLoading: banksLoading, error: banksError, refetch: refetchBanks } = useBankCatalog();
  const { data: centerAccount } = useQuery({
    queryKey: queryKeys.centerAccount,
    queryFn: getCenterAccount,
  });

  useEffect(() => {
    if (centerAccount) {
      setCenter({
        bankBin: centerAccount.bankBin,
        bankName: centerAccount.bankName,
        accountNumber: centerAccount.accountNumber,
        accountHolderName: centerAccount.accountHolderName,
      });
    }
  }, [centerAccount]);

  const syncMutation = useMutation({
    mutationFn: syncBankCatalog,
    onSuccess: (count) => {
      showToast(`Synced ${count} banks`, 'success');
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankCatalog });
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to sync banks')),
  });

  const prefillMutation = useMutation({
    mutationFn: getCenterAccountPrefillFromPrimary,
    onSuccess: (suggestion) => {
      if (!suggestion) {
        showToast('No primary bank account with a transferable BIN found for your user', 'error');
        return;
      }
      setCenter({
        bankBin: suggestion.bankBin,
        bankName: suggestion.bankName,
        accountNumber: suggestion.accountNumber,
        accountHolderName: suggestion.accountHolderName,
      });
      showToast('Form filled from your primary account — review and save', 'success');
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to load primary account')),
  });

  const updateCenterMutation = useMutation({
    mutationFn: () =>
      updateCenterAccount({
        bankBin: center.bankBin,
        accountNumber: center.accountNumber,
        accountHolderName: center.accountHolderName,
      }),
    onSuccess: () => {
      showToast('Center account saved', 'success');
      void queryClient.invalidateQueries({ queryKey: queryKeys.centerAccount });
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to save center account')),
  });

  const canSaveCenter = !!center.bankBin && !!center.accountNumber.trim() && !!center.accountHolderName.trim();
  const centerConfigured = !!centerAccount;

  return (
    <PageLayout
      title="Center account"
      subtitle="Bank account students use when paying tuition via VietQR."
    >
      <PageSection title="Receiving account">
        {!centerConfigured ? (
          <p className="muted">
            Not configured yet. Students cannot generate tuition QR codes until you save a receiving account.
          </p>
        ) : null}
        {actionError || banksError ? <p className="error-text">{actionError || banksError}</p> : null}
        {banksLoading && !banks.length ? <p className="muted">Loading bank catalog…</p> : null}
        <div className="grid-form">
          <BankSelect
            banks={banks}
            valueBin={center.bankBin}
            disabled={banksLoading && !banks.length}
            onSelect={(bank) => setCenter((prev) => ({ ...prev, bankBin: bank.bin, bankName: bank.shortName }))}
          />
          <input
            className="text-input"
            placeholder="Account number"
            value={center.accountNumber}
            onChange={(e) => setCenter((prev) => ({ ...prev, accountNumber: e.target.value }))}
          />
          <input
            className="text-input"
            placeholder="Account holder name"
            value={center.accountHolderName}
            onChange={(e) => setCenter((prev) => ({ ...prev, accountHolderName: e.target.value }))}
          />
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}>
            Sync banks
          </Button>
          <Button
            variant="secondary"
            onClick={() => prefillMutation.mutate()}
            loading={prefillMutation.isPending}
          >
            Fill from my primary account
          </Button>
          {banksError ? (
            <Button variant="secondary" onClick={() => refetchBanks()}>
              Retry banks
            </Button>
          ) : null}
          <Button
            variant="primary"
            onClick={() => updateCenterMutation.mutate()}
            loading={updateCenterMutation.isPending}
            disabled={!canSaveCenter}
          >
            Save account
          </Button>
        </div>
      </PageSection>
    </PageLayout>
  );
}

export default AdminCenterAccountPage;
