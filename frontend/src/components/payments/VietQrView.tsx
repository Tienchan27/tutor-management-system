import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../feedback/ToastProvider';
import { formatVnd } from '../../utils/format';
import './VietQrView.css';

interface VietQrViewProps {
  qrPayload: string;
  qrRef?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  amount?: number | null;
}

function VietQrView({ qrPayload, qrRef, bankName, accountNumber, accountHolderName, amount }: VietQrViewProps) {
  const { showToast } = useToast();

  function copy(value: string, label: string): void {
    navigator.clipboard.writeText(value).then(
      () => showToast(`${label} copied`, 'success'),
      () => showToast('Copy failed', 'error')
    );
  }

  return (
    <div className="vietqr">
      <div className="vietqr-code">
        <QRCodeSVG value={qrPayload} size={220} level="M" />
      </div>
      <dl className="vietqr-details">
        {bankName ? (
          <div className="vietqr-row">
            <dt>Bank</dt>
            <dd>{bankName}</dd>
          </div>
        ) : null}
        {accountNumber ? (
          <div className="vietqr-row">
            <dt>Account</dt>
            <dd>
              <span className="vietqr-mono">{accountNumber}</span>
              <button type="button" className="vietqr-copy" onClick={() => copy(accountNumber, 'Account number')}>
                Copy
              </button>
            </dd>
          </div>
        ) : null}
        {accountHolderName ? (
          <div className="vietqr-row">
            <dt>Holder</dt>
            <dd>{accountHolderName}</dd>
          </div>
        ) : null}
        {amount != null ? (
          <div className="vietqr-row">
            <dt>Amount</dt>
            <dd>
              <strong>{formatVnd(amount)}</strong>
              <button type="button" className="vietqr-copy" onClick={() => copy(String(amount), 'Amount')}>
                Copy
              </button>
            </dd>
          </div>
        ) : null}
        {qrRef ? (
          <div className="vietqr-row">
            <dt>Reference</dt>
            <dd>
              <span className="vietqr-mono">{qrRef}</span>
              <button type="button" className="vietqr-copy" onClick={() => copy(qrRef, 'Reference')}>
                Copy
              </button>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export default VietQrView;
