import { MarketDecision, TreasuryDecisions, TurnDecisions } from '../../../types';

export const DEFAULT_MARKETS_DECISIONS: Record<string, MarketDecision> = {
  za: {
    active: true,
    channel: 'OWN',
    prices: { techbook: 3000, zroid: 4800, itab: 6500 },
    debtorDays: { techbook: 45, zroid: 45, itab: 45 }
  },
  ng: {
    active: false,
    channel: 'DISTRIBUTOR',
    prices: { techbook: 220000, zroid: 350000, itab: 480000 },
    debtorDays: { techbook: 75, zroid: 75, itab: 75 }
  },
  ke: {
    active: false,
    channel: 'DISTRIBUTOR',
    prices: { techbook: 20000, zroid: 32000, itab: 43000 },
    debtorDays: { techbook: 40, zroid: 40, itab: 40 }
  }
};

export const DEFAULT_TREASURY_DECISIONS: TreasuryDecisions = {
  hedges: {
    USD_COSTS: { coverPct: 0, tenorMonths: 12 },
    NGN_REVENUE: { coverPct: 0, tenorMonths: 12 },
    KES_REVENUE: { coverPct: 0, tenorMonths: 6 },
    USD_DEBT: { coverPct: 0, tenorMonths: 12 }
  },
  fundingCurrency: 'ZAR',
  rateBasis: 'FIXED',
  fixedPct: 100,
  plannedNetProfit: 0
};

export function mergeGlobalMarketsDecisions(dec: TurnDecisions): TurnDecisions {
  const marketingPrices = dec.marketing?.prices || DEFAULT_MARKETS_DECISIONS.za.prices;
  const financeDebtorsDays = dec.finance?.debtorsDays || DEFAULT_MARKETS_DECISIONS.za.debtorDays;

  return {
    ...dec,
    markets: dec.markets ? {
      za: {
        ...DEFAULT_MARKETS_DECISIONS.za,
        ...dec.markets.za,
        prices: { ...marketingPrices, ...(dec.markets.za?.prices || {}) },
        debtorDays: { ...financeDebtorsDays, ...(dec.markets.za?.debtorDays || {}) }
      },
      ng: dec.markets.ng ? { ...dec.markets.ng } : { ...DEFAULT_MARKETS_DECISIONS.ng },
      ke: dec.markets.ke ? { ...dec.markets.ke } : { ...DEFAULT_MARKETS_DECISIONS.ke }
    } : {
      za: {
        ...DEFAULT_MARKETS_DECISIONS.za,
        prices: { ...marketingPrices },
        debtorDays: { ...financeDebtorsDays }
      },
      ng: { ...DEFAULT_MARKETS_DECISIONS.ng },
      ke: { ...DEFAULT_MARKETS_DECISIONS.ke }
    },
    treasury: dec.treasury ? {
      ...DEFAULT_TREASURY_DECISIONS,
      ...dec.treasury,
      hedges: {
        ...DEFAULT_TREASURY_DECISIONS.hedges,
        ...(dec.treasury.hedges || {})
      }
    } : { ...DEFAULT_TREASURY_DECISIONS }
  };
}
