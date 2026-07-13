import { useMemo, useState } from 'react';
import { BankCatalogEntry } from '../../types/payments';

interface BankSelectProps {
  banks: BankCatalogEntry[];
  valueBin: string;
  onSelect: (bank: BankCatalogEntry) => void;
  disabled?: boolean;
}

/** Bank picker from the synced catalog. Filter by typing; non-transferable banks are marked "*" and disabled. */
function BankSelect({ banks, valueBin, onSelect, disabled }: BankSelectProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return banks;
    }
    return banks.filter(
      (bank) =>
        bank.shortName.toLowerCase().includes(q) ||
        bank.name.toLowerCase().includes(q) ||
        bank.code.toLowerCase().includes(q) ||
        bank.bin.includes(q)
    );
  }, [banks, filter]);

  return (
    <div className="stack-8">
      <input
        className="text-input"
        type="search"
        placeholder="Search bank by name or BIN"
        value={filter}
        disabled={disabled}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter banks"
      />
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
        {filtered.map((bank) => (
          <option key={bank.bin} value={bank.bin} disabled={!bank.transferSupported}>
            {bank.shortName}
            {bank.transferSupported ? '' : ' *'}
          </option>
        ))}
      </select>
      {!filtered.length ? <p className="muted">No banks match your search.</p> : null}
    </div>
  );
}

export default BankSelect;
