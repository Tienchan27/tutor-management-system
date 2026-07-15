import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { BankCatalogEntry } from '../../types/payments';
import './BankSelect.css';

interface BankSelectProps {
  banks: BankCatalogEntry[];
  valueBin: string;
  onSelect: (bank: BankCatalogEntry) => void;
  disabled?: boolean;
}

/** Searchable bank combobox — type to filter, pick from the list (transferable only). */
function BankSelect({ banks, valueBin, onSelect, disabled }: BankSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(() => banks.find((b) => b.bin === valueBin) ?? null, [banks, valueBin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
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
  }, [banks, query]);

  const selectable = useMemo(
    () => filtered.filter((bank) => bank.transferSupported),
    [filtered]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setHighlight(0);
  }, [open, query]);

  useEffect(() => {
    function onDocPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocPointerDown);
    return () => document.removeEventListener('mousedown', onDocPointerDown);
  }, []);

  function openList() {
    if (disabled) {
      return;
    }
    setOpen(true);
    setQuery('');
  }

  function pick(bank: BankCatalogEntry) {
    if (!bank.transferSupported) {
      return;
    }
    onSelect(bank);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault();
      openList();
      return;
    }
    if (!open) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(selectable.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const bank = selectable[highlight];
      if (bank) {
        pick(bank);
      }
    }
  }

  const displayValue = open ? query : selected?.shortName ?? '';

  return (
    <div className={`bank-select${disabled ? ' bank-select--disabled' : ''}`} ref={rootRef}>
      <div className="bank-select-control">
        <input
          ref={inputRef}
          className="text-input bank-select-input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search and select bank"
          placeholder={selected ? selected.shortName : 'Search bank by name or BIN'}
          value={displayValue}
          disabled={disabled}
          autoComplete="off"
          onFocus={openList}
          onClick={openList}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="bank-select-chevron"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? 'Close bank list' : 'Open bank list'}
          onClick={() => {
            if (open) {
              setOpen(false);
              setQuery('');
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronDown size={18} aria-hidden />
        </button>
      </div>

      {open ? (
        <ul id={listId} className="bank-select-list" role="listbox">
          {!filtered.length ? (
            <li className="bank-select-empty" role="presentation">
              No banks match “{query.trim()}”
            </li>
          ) : (
            filtered.map((bank) => {
              const enabled = bank.transferSupported;
              const isSelected = bank.bin === valueBin;
              const selectableIndex = selectable.findIndex((b) => b.bin === bank.bin);
              const isHighlighted = enabled && selectableIndex === highlight;
              return (
                <li key={bank.bin} role="option" aria-selected={isSelected} aria-disabled={!enabled}>
                  <button
                    type="button"
                    className={[
                      'bank-select-option',
                      isSelected ? 'is-selected' : '',
                      isHighlighted ? 'is-highlighted' : '',
                      !enabled ? 'is-disabled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!enabled}
                    onMouseEnter={() => {
                      if (enabled && selectableIndex >= 0) {
                        setHighlight(selectableIndex);
                      }
                    }}
                    onClick={() => pick(bank)}
                  >
                    <span className="bank-select-option-main">
                      <span className="bank-select-option-title">
                        {bank.shortName}
                        {!enabled ? ' *' : ''}
                      </span>
                      <span className="bank-select-option-sub">
                        {bank.code} · BIN {bank.bin}
                      </span>
                    </span>
                    {isSelected ? <Check size={16} className="bank-select-check" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          )}
          {filtered.some((b) => !b.transferSupported) ? (
            <li className="bank-select-footnote" role="presentation">
              * Not available for VietQR transfers
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export default BankSelect;
