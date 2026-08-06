import { formatCurrency, formatNumber, formatPercent } from './numberFormat';

export function formatDebriefCurrency(val: number, compact: boolean = false): string {
  if (compact) {
    const abs = Math.abs(val);
    if (abs >= 1_000_000_000) return `R ${(val / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `R ${(val / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `R ${(val / 1_000).toFixed(0)}k`;
  }
  return formatCurrency(val, 0);
}

export function formatDebriefPercent(val: number, decimals: number = 1): string {
  // If val is decimal (e.g. 0.25), multiply by 100 or format correctly
  if (Math.abs(val) <= 1.0 && val !== 0) {
    return formatPercent(val, decimals, true);
  }
  return `${val.toFixed(decimals)}%`;
}

export function formatDebriefUnits(val: number): string {
  return formatNumber(val, 0);
}
