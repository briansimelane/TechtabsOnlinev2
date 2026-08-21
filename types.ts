
export type Role = 'ADMIN' | 'FACILITATOR' | 'STUDENT';

export type ProductId = 'techbook' | 'zroid' | 'itab';

export type HRRole = 'engineers' | 'technicians' | 'semiSkilled' | 'adminSales' | 'customerService';

export type TrainingLevel = 'None' | 'Basic' | 'Moderate' | 'Advanced';

export interface Product {
  id: ProductId;
  name: string;
  segment: 'Entry' | 'Mid' | 'Premium';
}

export interface PeriodMarketRecord {
  marketSize: Record<ProductId, number>; // total market units for the year
  forecastUnits: Record<ProductId, number>; // forecastedMarketShare% × marketSize
  demandUnits: Record<ProductId, number>; // share earned × marketSize
  actualUnits: Record<ProductId, number>; // min(demand, available)
  availableUnits: Record<ProductId, number>;
  actualShare: Record<ProductId, number>; // 0–1, realised
  valueScore: Record<ProductId, number>;
  valueScoreExPrice: Record<ProductId, number>;
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
  market?: PeriodMarketRecord;
  staffCounts?: Record<HRRole, number>;
  requiredCS?: number;
  industry?: any;
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
  isArchived?: boolean;
  archivedAt?: string;
}


export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  effect: 'MATERIAL_COST_HIKE' | 'DEMAND_BOOM' | 'LABOR_STRIKE' | 'TECH_BREAKTHROUGH';
  magnitude: number; // e.g., 0.20 for 20%
  activePeriod: number;
}

// ── ALP: informational per-class event (NOT an engine MarketEvent) ──
export interface ClassEvent {
  id: string;            // `cevt_${Date.now()}`
  title: string;
  body: string;          // plain text / light markdown
  period: number;        // period/year it applies to; 0 = applies to all periods
  visibleToStudents: boolean;
  pinned?: boolean;
  createdAt: string;     // ISO
  updatedAt?: string;    // ISO
}

// ── ALP: one selectable variant of a period's scenario ──
export interface ScenarioVariant {
  id: string;            // e.g. 'default', 'v2'
  label: string;         // e.g. 'Standard', 'Revised (v2)'
  title: string;
  body: string;          // markdown / plain narrative text
}

// ── ALP: a facilitator's per-class override for one period's scenario ──
export interface ClassScenarioOverride {
  period: number;
  activeVariantId?: string;  // which template variant is shown (falls back to first)
  title?: string;            // full custom title (used only if body is set)
  body?: string;             // full custom body — takes precedence over any variant
  hidden?: boolean;          // hide the scenario from students for this period
  updatedAt?: string;        // ISO
}

export interface SimulationClass {
  id: string;
  name: string;
  facilitatorCode: string;
  currentPeriod: number;
  teams: Team[];
  teamCodes: Record<string, string>; // TeamId -> AccessCode
  createdAt: string;
  createdByEmail?: string;
  creatorUid?: string;
  // Period -> SupplierId -> Instruction
  negotiationOverrides?: Record<number, Record<string, string>>;
  activeEvents?: MarketEvent[];
  surveyConfig?: SurveyConfig;
  surveyResponses?: SurveyResponse[];
  showSurvey?: boolean;
  showMarketReportsYear1?: boolean;
  marksConfig?: MarksConfig;
  isArchived?: boolean;
  archivedAt?: string;
  isActionLearningProject?: boolean;
  classEvents?: ClassEvent[];
  scenarioOverrides?: Record<number, ClassScenarioOverride>;
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

export interface TeamSupplierOverride {
  componentCosts?: Partial<Record<ProductId, Record<string, number>>>;
  finishedGoodsCosts?: Partial<Record<ProductId, Record<string, number>>>;
  paymentTerms?: Record<string, number>;
  discounts?: Record<string, number>;
  quality?: Record<string, number>;
  deliveryReliability?: Record<string, number>;
  leadTime?: Record<string, number>;
  service?: Record<string, number>;
  capacity?: Record<string, number>;
  innovation?: Record<string, number>;
  status?: Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'AGREED' | 'FAILED'>;
}

export interface TurnDecisions {
  marketing: MarketingDecisions;
  operations: OperationsDecisions;
  hr: HRDecisions;
  procurement: ProcurementDecisions;
  finance: FinanceDecisions;
  negotiation: NegotiationDecision;
  supplierOverrides?: TeamSupplierOverride;
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

export type MissedSalesBasis = 'latest' | 'cumulative';

export interface MarksConfig {
  /** Mark awarded when a base-mark hurdle is met. Excel: the 10 in IF(...,10,7). */
  baseMarkPass: number;              // default 10
  /** Mark awarded when a base-mark hurdle is missed. Excel: the 7 in IF(...,10,7). */
  baseMarkFail: number;              // default 7
  /** Customer Satisfaction hurdle as a fraction 0–1. Excel L28: >=0.75 */
  csatHurdle: number;                // default 0.75
  /** Employee Satisfaction hurdle as a fraction 0–1. Excel L29: >=0.75 */
  esatHurdle: number;                // default 0.75
  /** Excel O31. null = auto (count of scored teams). Divisor = (n*9)+9 → R31. */
  activeTeamCountOverride: number | null;   // default null
  /** Excel: the 50 in ROUNDDOWN(50*L33,0). Advanced. */
  additionalMarksScale: number;      // default 50
  /** Class-wide adjustment applied to all teams (Excel row 43). */
  classAdjustment: number;           // default 0
  /** Excel row 43. teamId -> marks. Absent key = 0. */
  classAdjustments: Record<string, number>; // default {}
  missedSalesBasis: MissedSalesBasis;       // default 'latest'
  updatedAt?: string;
}

