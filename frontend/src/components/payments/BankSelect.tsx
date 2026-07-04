import { BankCatalogEntry } from '../../types/payments';

interface BankSelectProps {
  banks: BankCatalogEntry[];
  valueBin: string;
  onSelect: (bank: BankCatalogEntry) => void;
  disabled?: boolean;
}

/** Bank picker from the synced catalog. Banks that can't receive transfers are marked "*" and disabled. */
function BankSelect({ banks, valueBin, onSelect, disabled }: BankSelectProps) {
  return (
    <select
      className="text-input"
      value={valueBin}
      disabled={disabled}
      onChange={(e) => {
        const bank = banks.find((b) => b.bin === e.target.value);
        if (bank) {
          onSelect(bank);
        }
      }}
    >
      <option value="" disabled>
        Select bank
      </option>
      {banks.map((bank) => (
        <option key={bank.bin} value={bank.bin} disabled={!bank.transferSupported}>
          {bank.shortName}
          {bank.transferSupported ? '' : ' *'}
        </option>
      ))}
    </select>
  );
}

export default BankSelect;
