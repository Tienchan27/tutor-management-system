import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceQr, listMyInvoices } from '../../../services/studentInvoiceService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import StatusPill from '../../../components/ui/StatusPill';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import VietQrView from '../../../components/payments/VietQrView';
import { formatDate, formatVnd, formatYearMonth } from '../../../utils/format';
import { invoiceTone } from '../../../utils/statusTone';
import { queryKeys } from '../../../lib/queryKeys';

function StudentBillingPage() {
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: queryKeys.studentInvoices,
    queryFn: listMyInvoices,
  });

  const qrQuery = useQuery({
    queryKey: ['invoiceQr', payInvoiceId],
    queryFn: () => getInvoiceQr(payInvoiceId as string),
    enabled: !!payInvoiceId,
  });

  return (
    <PageLayout title="Billing" subtitle="Monthly tuition statements.">
      <PageSection>
        {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load invoices')}</p> : null}
        {isLoading ? <Spinner label="Loading invoices..." /> : null}
        {!isLoading && !items.length ? <EmptyState title="No invoices yet" /> : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Hours</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatYearMonth(`${item.year}-${`${item.month}`.padStart(2, '0')}`)}</td>
                    <td>{item.totalHours}</td>
                    <td>{formatVnd(item.totalAmount)}</td>
                    <td>{formatDate(item.dueDate)}</td>
                    <td>
                      <StatusPill label={item.status} tone={invoiceTone(item.status)} />
                    </td>
                    <td>
                      {item.status !== 'PAID' ? (
                        <Button variant="primary" size="sm" onClick={() => setPayInvoiceId(item.id)}>
                          Pay
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageSection>

      <Modal
        open={!!payInvoiceId}
        title="Pay tuition"
        subtitle="Scan with your banking app to transfer."
        onClose={() => setPayInvoiceId(null)}
        footer={
          <Button variant="secondary" onClick={() => setPayInvoiceId(null)}>
            Close
          </Button>
        }
      >
        {qrQuery.isLoading ? <Spinner label="Preparing QR..." /> : null}
        {qrQuery.error ? (
          <p className="error-text">{extractApiErrorMessage(qrQuery.error, 'Failed to prepare payment')}</p>
        ) : null}
        {qrQuery.data ? (
          <VietQrView
            qrPayload={qrQuery.data.qrPayload}
            qrRef={qrQuery.data.qrRef}
            bankName={qrQuery.data.bankName}
            accountNumber={qrQuery.data.accountNumber}
            accountHolderName={qrQuery.data.accountHolderName}
            amount={qrQuery.data.amount}
          />
        ) : null}
      </Modal>
    </PageLayout>
  );
}

export default StudentBillingPage;
