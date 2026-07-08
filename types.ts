
export type Role = 'ADMIN' | 'FACILITATOR' | 'STUDENT';

export type ProductId = 'techbook' | 'zroid' | 'itab';

export type HRRole = 'engineers' | 'technicians' | 'semiSkilled' | 'adminSales' | 'customerService';

export type TrainingLevel = 'None' | 'Basic' | 'Moderate' | 'Advanced';

export interface Product {
  id: ProductId;
  name: string;
  segment: 'Entry' | 'Mid' | 'Premium';
}

export interface PeriodRecord {
  period: number;
  revenue: { total: number; byProduct: Record<ProductId, number> };
  cogs: { total: number; byProduct: Record<ProductId, number> };
  grossProfit: { total: number; byProduct: Record<ProductId, number> };
  opex: {
    marketing: number;
    store: number;
    agents: number;
    payroll: number;
    training: number;
    rd: number;
    other: number;
    total: number;
  };
  ebitda: number;
  depreciation: number;
  interest: number;
  ebt: number;
  tax: number;
  netProfit: number;
  balanceSheet: {
    cash: number;
    receivables: number;
    inventory: number;
    fixedAssets: number;
    totalAssets: number;
    equity: number;
    longTermDebt: number;
    currentLiabilities: number;
    totalLiabilitiesAndEquity: number;
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
    net: number;
  };
  debtorDays: Record<ProductId, number>;
  creditorDays: number;
  interestCoverage: number;
  kpis: KPI;
  prices?: Record<ProductId, number>;
  salaries?: Record<HRRole, number>;
  features?: Record<ProductId, number>;
}

export interface Team {
  id: string;
  name: string;
  ceoName?: string;
  ceoPin?: string;
  draftDecisions?: TurnDecisions;
  universeId: string;
  currentPeriod: number;
  cashBalance: number;
  storeCount: number;
  factoryCapacity: number;
  inventory: Record<ProductId, number>;
  staffCounts: Record<HRRole, number>;
  longTermDebt: number;
  shareholdersEquity: number;
  isComputer?: boolean; // To distinguish AI teams
  history?: Record<number, PeriodRecord>; // period -> PeriodRecord
  features?: Record<ProductId, number>;
  status?: string;
  updatedAt?: any;
  reopenRequested?: boolean;
}


export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  effect: 'MATERIAL_COST_HIKE' | 'DEMAND_BOOM' | 'LABOR_STRIKE' | 'TECH_BREAKTHROUGH';
  magnitude: number; // e.g., 0.20 for 20%
  activePeriod: number;
}

export interface SimulationClass {
  id: string;
  name: string;
  facilitatorCode: string;
  currentPeriod: number;
  teams: Team[];
  teamCodes: Record<string, string>; // TeamId -> AccessCode
  createdAt: string;
  // Period -> SupplierId -> Instruction
  negotiationOverrides?: Record<number, Record<string, string>>;
  activeEvents?: MarketEvent[];
  surveyConfig?: SurveyConfig;
  surveyResponses?: SurveyResponse[];
  showSurvey?: boolean;
  showMarketReportsYear1?: boolean;
}


export interface Facilitator {
  id: string;
  name: string;
  email: string;
  organization: string;
  status: 'Active' | 'Inactive';
  joinedDate: string;
  licenseType: 'Standard' | 'Enterprise' | 'Trial';
  accessCode?: string;
}

export interface Administrator {
  id: string;
  name: string;
  email: string;
  accessCode: string;
  joinedDate: string;
}

// Decision Types
export interface MarketingDecisions {
  forecastedMarketShare: Record<ProductId, number>; // Percentage 0-100
  prices: Record<ProductId, number>;
  advertisingBudget: number;
  adSplits: Record<ProductId, number>; // Percentage 0-1
  generalAdSplit: number; // Percentage 0-1
  openCloseStores: number; // +/- integer
  agentCommission: number; // Percentage 0-1
}

export interface OperationsDecisions {
  production: Record<ProductId, number>;
  reqFinishedGoods: Record<ProductId, number>;
  capacityChange: number; // Positive to build, negative to sell (if allowed)
  rdBudget: number;
  rdSplits: Record<ProductId, number>;
}

export interface HRDecisions {
  hiring: Record<HRRole, number>; // Positive to recruit, negative to dismiss
  salaries: Record<HRRole, number>; // Monthly salary per employee
  trainingLevels: Record<HRRole, TrainingLevel>;
}

export interface ProcurementDecisions {
  // Product -> Supplier -> Type -> Units
  supplierAllocation: Record<ProductId, Record<string, { components: number; finishedGoods: number }>>;
}

export interface FinanceDecisions {
  dividends: number;
  debtChange: number; // Positive to raise, negative to pay
  equityChange: number; // Positive to raise, negative to retire
  debtorsDays: Record<ProductId, number>;
}

export interface NegotiationMessage {
  role: 'user' | 'model';
  text: string;
}

export interface NegotiationDecision {
  selectedSupplierId: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'AGREED' | 'FAILED';
  agreedDiscount: number; // Percentage (e.g., 0.05)
  agreedPaymentTerms: number; // Days
  transcript: NegotiationMessage[];
  roundCount?: number;
  maxRounds?: number;
  sessionScores?: {
    preparation: number;
    interests: number;
    trading: number;
    concessions: number;
    professionalism: number;
  };
  debriefFeedback?: string;
  contractPeriods?: number;
  extras?: string[];
}

export interface TurnDecisions {
  marketing: MarketingDecisions;
  operations: OperationsDecisions;
  hr: HRDecisions;
  procurement: ProcurementDecisions;
  finance: FinanceDecisions;
  negotiation: NegotiationDecision;
}

// Reporting Types
export interface KPI {
  revenue: number;
  netProfit: number;
  marketShare: Record<ProductId, number>;
  customerSatisfaction: number;
  employeeSatisfaction: number;
}

export interface SimulationState {
  isAuthenticated: boolean;
  currentRole: Role;
  originalRole?: Role;
  currentClassId: string | null;
  currentTeam: Team;
  decisions: TurnDecisions;
  lastPeriodKPIs: KPI;
  // Global State for Facilitator/Admin
  classes: SimulationClass[];
  facilitators: Facilitator[];
  administrators?: Administrator[];
}

// Survey Types
export interface SurveyQuestion {
  id: string;
  number: number;
  text: string;
  type: 'likert' | 'text';
  sectionId: string;
  weight: number;      // weight of this question in its section (default 1)
  isReverse: boolean;  // whether to reverse score (5 - score + 1)
  isActive: boolean;   // facilitator can disable a question
}

export interface SurveySection {
  id: string;
  name: string;
  description?: string;
  weight: number;      // weight of this section in DDI (default 1)
}

export interface SurveyConfig {
  sections: SurveySection[];
  questions: SurveyQuestion[];
  scoringMethod: 'simple_average' | 'weighted_average';
}

export interface SurveyResponse {
  userId: string;
  teamId: string;
  teamName: string;
  period: number;
  timestamp: string;
  answers: Record<string, number | string>; // questionId -> answer
}

