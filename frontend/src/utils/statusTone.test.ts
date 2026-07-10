import { describe, expect, it } from 'vitest';
import { invoiceTone, payoutTone } from './statusTone';

describe('invoiceTone', () => {
  it('maps PAID to success', () => {
    expect(invoiceTone('PAID')).toBe('success');
  });

  it('maps PARTIALLY_PAID to warning', () => {
    expect(invoiceTone('PARTIALLY_PAID')).toBe('warning');
  });

  it('maps OVERDUE to danger', () => {
    expect(invoiceTone('OVERDUE')).toBe('danger');
  });

  it('maps UNPAID to warning', () => {
    expect(invoiceTone('UNPAID')).toBe('warning');
  });
});

describe('payoutTone', () => {
  it('maps PAID to success', () => {
    expect(payoutTone('PAID')).toBe('success');
  });

  it('maps LOCKED to warning', () => {
    expect(payoutTone('LOCKED')).toBe('warning');
  });
});
