import { ProductId } from '../../types';

export interface MarketConfig {
  id: string;
  name: string;
  currency: string;
  isHome?: boolean;
  demandSource?: string;
  demandUnits?: Record<ProductId, number>;
  demandCagr?: number;
  priceIndex: number;
  debtorDaysDefault: number;
  entryCost: number;
  distributorEntryCost?: number;
  channelOptions: ('OWN' | 'DISTRIBUTOR')[];
  distributorMargin?: number;
  importDuty?: number;
  countryRiskPremium: number;
  repatriationPct: number;
  repatriationLagPeriods?: number;
  maxHedgeTenor?: number;
}

export interface CurrencyConfig {
  spot?: number;
  rate: number;
  path?: number[];
}

export interface CreditGradeConfig {
  id: string;
  maxLeverage: number;
  maxPlanVariance: number;
  margin: number;
}

export interface FundingConfig {
  rates: Record<string, number>;
  fixedPremium: number;
  floatingPath: number[];
  creditGrades: CreditGradeConfig[];
}

export interface CovenantConfig {
  netDebtToEbitda: { max: number };
  interestCover: { min: number };
  breachPenaltyMargin: number;
  breachBlocksDividends: boolean;
}

export interface ScorecardConfig {
  measures: string[];
  weights: Record<string, number>;
  gates: {
    minCSAT: number;
    minESAT: number;
    noUncuredCovenantBreach: boolean;
    noExcessOverdraft: boolean;
  };
}

export interface EditionEventConfig {
  title: string;
  body: string;
  reveal: string;
}

export interface EditionConfig {
  id: string;
  label: string;
  flags: {
    multiMarket: boolean;
    treasury: boolean;
    covenants: boolean;
    marketDesk: boolean;
    valueScorecard: boolean;
  };
  baseCurrency: string;
  markets: MarketConfig[];
  currencies: Record<string, CurrencyConfig>;
  suppliers: Record<string, { currency: string }>;
  funding: FundingConfig;
  covenants: CovenantConfig;
  scorecard: ScorecardConfig;
  events: Record<string, EditionEventConfig>;
}
