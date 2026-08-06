import { PeriodRecord, PeriodMarketRecord, ProductId } from '../types';

export function ensurePeriodMarketRecord(record: PeriodRecord): PeriodRecord {
  if (record.market) {
    return record;
  }

  const products: ProductId[] = ['techbook', 'zroid', 'itab'];
  const prices = record.prices || { techbook: 2400, zroid: 3200, itab: 4200 };
  const actualShare = record.kpis?.marketShare || { techbook: 0.125, zroid: 0.125, itab: 0.125 };

  const derivedActualUnits: Record<ProductId, number> = {
    techbook: 0,
    zroid: 0,
    itab: 0
  };

  products.forEach(p => {
    const rev = record.revenue?.byProduct?.[p] || 0;
    const price = prices[p] || 1;
    derivedActualUnits[p] = Math.round(rev / price);
  });

  const backfilledMarket: PeriodMarketRecord = {
    marketSize: { techbook: 288750, zroid: 179888, itab: 89750 },
    forecastUnits: { techbook: 0, zroid: 0, itab: 0 },
    demandUnits: { techbook: 0, zroid: 0, itab: 0 },
    actualUnits: derivedActualUnits,
    availableUnits: derivedActualUnits,
    actualShare: actualShare,
    valueScore: { techbook: 0, zroid: 0, itab: 0 },
    valueScoreExPrice: { techbook: 0, zroid: 0, itab: 0 }
  };

  return {
    ...record,
    market: backfilledMarket,
    staffCounts: record.staffCounts || { engineers: 50, technicians: 150, semiSkilled: 200, adminSales: 40, customerService: 20 },
    requiredCS: record.requiredCS || Math.ceil(Object.values(derivedActualUnits).reduce((a, b) => a + b, 0) / 1000)
  };
}
