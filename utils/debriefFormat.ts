import { formatCurrency, formatNumber, formatPercent } from './numberFormat';

export function formatDebriefCurrency(val: number, compact: boolean = false, includeSymbol: boolean = true): string {
  const prefix = includeSymbol ? 'R ' : '';
  if (compact) {
    const abs = Math.abs(val);
    if (abs >= 1_000_000_000) return `${prefix}${(val / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${prefix}${(val / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${prefix}${(val / 1_000).toFixed(0)}k`;
  }
  const formatted = formatCurrency(val, 0);
  return includeSymbol ? formatted : formatted.replace(/^R\s?/, '');
}

export function formatDebriefPercent(val: number, decimals: number = 1): string {
  if (Math.abs(val) <= 1.0 && val !== 0) {
    return formatPercent(val, decimals, true);
  }
  return `${val.toFixed(decimals)}%`;
}

export function formatDebriefUnits(val: number): string {
  return formatNumber(val, 0);
}
