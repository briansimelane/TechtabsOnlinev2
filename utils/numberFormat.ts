const LOCALE = 'en-US';

export const formatNumber = (value: number, decimals = 0) => {
  if (Number.isNaN(value) || value === null || value === undefined) {
    return '0';
  }

  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatCurrency = (value: number, decimals = 0) => `R ${formatNumber(value, decimals)}`;

export const formatPercent = (value: number, decimals = 2, isFraction = true) => {
  const percent = isFraction ? value * 100 : value;
  return `${formatNumber(percent, decimals)}%`;
};

export const parseNumber = (raw: string) => {
  const normalized = raw.replace(/,/g, '').replace(/\s/g, '');
  if (normalized === '' || normalized === '-') {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};
