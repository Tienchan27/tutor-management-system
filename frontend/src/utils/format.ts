const vndFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatVnd(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) {
    return '0 VND';
  }
  return `${vndFormatter.format(Math.round(amount))} VND`;
}

export function formatYearMonth(value: string): string {
  const [year, month] = value.split('-');
  if (!year || !month) {
    return value;
  }
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}
