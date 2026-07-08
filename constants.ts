import { Product, SimulationState, TurnDecisions, HRRole, TrainingLevel, Facilitator, SurveyConfig, PeriodRecord, ProductId } from './types';


export const PRODUCTS: Product[] = [
  { id: 'techbook', name: 'TechBook', segment: 'Entry' },
  { id: 'zroid', name: 'Zroid', segment: 'Mid' },
  { id: 'itab', name: 'iTab', segment: 'Premium' },
];

export const SUPPLIERS = ['Alpha', 'Neepo', 'Zen', 'Cheng'];

export const SUPPLIER_METRICS = {
    Alpha: { quality: 10.0, leadTime: 3.0, service: 8.0, capacity: 4.0, innovation: 8.0, terms: 60, desc: "Premium quality, rigid terms. Difficult to negotiate with." },
    Neepo: { quality: 5.0, leadTime: 10.0, service: 5.0, capacity: 10.0, innovation: 5.0, terms: 30, desc: "Budget option, high capacity. Very flexible on price." },
    Zen: { quality: 6.0, leadTime: 5.0, service: 10.0, capacity: 6.0, innovation: 7.0, terms: 45, desc: "Balanced option. Values long-term relationships." },
    Cheng: { quality: 7.0, leadTime: 6.0, service: 5.0, capacity: 6.0, innovation: 6.0, terms: 45, desc: "Technology focused. Negotiates on technical merit." },
};

export const COMPONENT_COSTS: Record<string, Record<string, number>> = {
    techbook: { Alpha: 1560, Neepo: 1380, Zen: 1200, Cheng: 1160 },
    zroid: { Alpha: 1328, Neepo: 1328, Zen: 1328, Cheng: 1328 },
    itab: { Alpha: 1065, Neepo: 1065, Zen: 1065, Cheng: 1065 },
};

export const FINISHED_GOODS_COSTS: Record<string, Record<string, number>> = {
    techbook: { Alpha: 1660, Neepo: 1480, Zen: 1300, Cheng: 1260 },
    zroid: { Alpha: 1750, Neepo: 1560, Zen: 1860, Cheng: 1860 },
    itab: { Alpha: 1700, Neepo: 1600, Zen: 1800, Cheng: 1850 },
};

// HR Constants
export const HR_CONSTANTS = {
    trainingCosts: {
        None: 0,
        Basic: 2000,
        Moderate: 5000,
        Advanced: 10000
    } as Record<TrainingLevel, number>,
    recruitmentCost: 5000, // Cost to hire one person
    dismissalCost: 2000,   // Cost to fire one person
    workHoursPerMonth: 160,
    // Utilization factors (Units per employee per month roughly)
    productivity: {
        engineers: 200, // Complexity units supported
        technicians: 400,
        semiSkilled: 600,
        adminSales: 500000, // Revenue supported
        customerService: 1500, // Units sold supported
    }
};

// Finance Constants
export const FINANCE_CONSTANTS = {
    interestRate: 0.065, // 6.5%
    wacc: 0.156, // 15.6%
    taxRate: 0.28,
    maxDebtRatio: 0.5, // Used to calc max available debt relative to equity/assets
};

// Helper to initialize allocation for all products/suppliers
const initialProcurement = PRODUCTS.reduce((acc, p) => {
    acc[p.id] = SUPPLIERS.reduce((supAcc, s) => {
        supAcc[s] = { components: 0, finishedGoods: 0 };
        return supAcc;
    }, {} as Record<string, { components: number; finishedGoods: number }>);
    return acc;
}, {} as Record<string, Record<string, { components: number; finishedGoods: number }>>);

// Set some defaults based on previous logic (simplified)
initialProcurement.techbook.Alpha.components = 10000;
initialProcurement.techbook.Neepo.components = 5000;
initialProcurement.techbook.Cheng.finishedGoods = 8500;

initialProcurement.zroid.Alpha.components = 8500;
initialProcurement.zroid.Neepo.components = 5000;
initialProcurement.zroid.Cheng.components = 2000;
initialProcurement.zroid.Cheng.finishedGoods = 20000;

initialProcurement.itab.Alpha.components = 5000;
initialProcurement.itab.Zen.components = 5000;
initialProcurement.itab.Cheng.finishedGoods = 12500;

export const INITIAL_DECISIONS: TurnDecisions = {
  marketing: {
    forecastedMarketShare: { techbook: 16.7, zroid: 16.7, itab: 16.7 },
    prices: { techbook: 3000, zroid: 4800, itab: 6500 },
    advertisingBudget: 25000000,
    adSplits: { techbook: 0.25, zroid: 0.25, itab: 0.25 },
    generalAdSplit: 0.25,
    openCloseStores: 0,
    agentCommission: 0.015,
  },
  operations: {
    production: { techbook: 15000, zroid: 15000, itab: 10000 },
    reqFinishedGoods: { techbook: 8500, zroid: 20000, itab: 12500 }, // Updated to match start of year 1 defaults
    capacityChange: 0,
    rdBudget: 15055857,
    rdSplits: { techbook: 0.25, zroid: 0.25, itab: 0.50 },
  },
  hr: {
    hiring: {
        engineers: 0,
        technicians: 0,
        semiSkilled: 0,
        adminSales: 0,
        customerService: 0
    },
    salaries: {
        engineers: 55000,
        technicians: 38000,
        semiSkilled: 30000,
        adminSales: 20000,
        customerService: 9250
    },
    trainingLevels: {
        engineers: 'Basic',
        technicians: 'Basic',
        semiSkilled: 'Basic',
        adminSales: 'Basic',
        customerService: 'Basic'
    }
  },
  procurement: {
    supplierAllocation: initialProcurement,
  },
  finance: {
    dividends: 0,
    debtChange: 0,
    equityChange: 0,
    debtorsDays: { techbook: 0, zroid: 0, itab: 0 }
  },
  negotiation: {
    selectedSupplierId: null,
    status: 'NOT_STARTED',
    agreedDiscount: 0,
    agreedPaymentTerms: 0,
    transcript: [],
    roundCount: 0,
    maxRounds: 10,
    sessionScores: {
      preparation: 0,
      interests: 0,
      trading: 0,
      concessions: 0,
      professionalism: 0
    },
    debriefFeedback: '',
    contractPeriods: 1,
    extras: []
  }
};

const MOCK_FACILITATORS: Facilitator[] = [
  { id: '1', name: 'John Doe', email: 'john@university.edu', organization: 'State University', status: 'Active', joinedDate: '2023-09-15', licenseType: 'Enterprise' },
  { id: '2', name: 'Sarah Smith', email: 'sarah@business-school.com', organization: 'Global Business School', status: 'Active', joinedDate: '2023-10-01', licenseType: 'Standard' },
  { id: '3', name: 'Mike Johnson', email: 'mike@techtabs.com', organization: 'Techtabs Internal', status: 'Inactive', joinedDate: '2023-01-10', licenseType: 'Trial' },
];

export const YEAR_0_RECORD: PeriodRecord = {
  period: 0,
  revenue: {
    total: 289138300,
    byProduct: { techbook: 108282000, zroid: 107932800, itab: 72923500 }
  },
  cogs: {
    total: 123170388,
    byProduct: { techbook: 57998802, zroid: 44113220, itab: 21058366 }
  },
  grossProfit: {
    total: 165967912,
    byProduct: { techbook: 50283198, zroid: 63819580, itab: 51865134 }
  },
  opex: {
    marketing: 25051494,
    store: 40082390,
    agents: 2255279,
    payroll: 19696818,
    training: 2958080,
    rd: 15055857,
    other: 15800800,
    total: 120900718
  },
  ebitda: 45067194,
  depreciation: 1535965,
  interest: 0,
  ebt: 43531229,
  tax: 12188743,
  netProfit: 31342486,
  balanceSheet: {
    cash: 147305847,
    receivables: 18547918,
    inventory: 112334926,
    fixedAssets: 299459535,
    totalAssets: 577648226,
    equity: 341050070,
    longTermDebt: 0,
    currentLiabilities: 236598156,
    totalLiabilitiesAndEquity: 577648226
  },
  cashFlow: {
    operating: 55989632,
    investing: -15000000,
    financing: 0,
    net: 40989632
  },
  debtorDays: { techbook: 30, zroid: 45, itab: 30 },
  creditorDays: 45,
  interestCoverage: 114.5,
  kpis: {
    revenue: 289138300,
    netProfit: 31342486,
    marketShare: { techbook: 0.125, zroid: 0.125, itab: 0.125 },
    customerSatisfaction: 0.70,
    employeeSatisfaction: 0.70
  },
  prices: { techbook: 3000, zroid: 4800, itab: 6500 },
  salaries: {
    engineers: 45000,
    technicians: 20000,
    semiSkilled: 15000,
    adminSales: 15000,
    customerService: 10000
  },
  features: { techbook: 0, zroid: 0, itab: 0 }
};

export const INITIAL_STATE: SimulationState = {
  isAuthenticated: false,
  currentRole: 'STUDENT',
  originalRole: 'STUDENT',
  currentClassId: null,
  currentTeam: {
    id: 'team_01',
    name: 'Techtabs Ltd',
    ceoName: 'CEO Name',
    universeId: 'uni_001',
    currentPeriod: 1,
    cashBalance: 147305847,
    storeCount: 8,
    factoryCapacity: 40000,
    inventory: { techbook: 8533, zroid: 9200, itab: 0 },
    staffCounts: {
        engineers: 22,
        technicians: 28,
        semiSkilled: 37,
        adminSales: 29,
        customerService: 58
    },
    longTermDebt: 0,
    shareholdersEquity: 341050070,
    history: {
      0: YEAR_0_RECORD
    },
    features: { techbook: 0, zroid: 0, itab: 0 }
  },
  decisions: INITIAL_DECISIONS,
  lastPeriodKPIs: YEAR_0_RECORD.kpis,
  classes: [],
  facilitators: MOCK_FACILITATORS
};

export const STORE_COSTS = {
    opening: 9353900,
    closing: 2438320,
    running: 5614005
};

export const OPERATIONS_CONSTANTS = {
    capexUnitCost: 1500, // Estimated cost to build 1 unit of capacity
};

export const MARKET_SIZES: Record<string, number> = {
    techbook: 187588,
    zroid: 260242,
    itab: 127559
};

export const PRODUCT_DEMAND_SCHEDULE: Record<ProductId, Record<number, number>> = {
  techbook: {
    0: 288750, // Year 0 (from user request)
    1: 187588, // Year 1 (from config.json)
    2: 197905, // Year 2
    3: 208790, // Year 3
    4: 220274  // Year 4
  },
  zroid: {
    0: 179888, // Year 0 (from user request)
    1: 260242, // Year 1 (from config.json)
    2: 279760, // Year 2
    3: 300742, // Year 3
    4: 323298  // Year 4
  },
  itab: {
    0: 89750,  // Year 0 (from user request)
    1: 127559, // Year 1 (from config.json)
    2: 140953, // Year 2
    3: 155753, // Year 3
    4: 172107  // Year 4
  }
};

export const getMarketSize = (productId: ProductId, period: number): number => {
  const schedule = PRODUCT_DEMAND_SCHEDULE[productId];
  if (schedule && schedule[period] !== undefined) {
    return schedule[period];
  }
  return MARKET_SIZES[productId] || 0;
};

export const LAST_YEAR_DATA = {
    marketShare: { techbook: 12.5, zroid: 12.5, itab: 12.5 },
    unitsSold: { techbook: 36094, zroid: 22486, itab: 11219 }
};

export const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  scoringMethod: 'simple_average',
  sections: [
    { id: 'sec_structure', name: 'Decision Structure & Progress', weight: 1 },
    { id: 'sec_pressure', name: 'Focus Under Pressure', weight: 1 },
    { id: 'sec_alignment', name: 'Alignment & Collective Commitment', weight: 1 },
    { id: 'sec_expertise', name: 'Direction & Expertise Activation', weight: 1 },
    { id: 'sec_reflection', name: 'Open Reflection', weight: 0 }
  ],
  questions: [
    // Section 1: Decision Structure & Progress
    { id: 'q1', number: 1, text: 'When new information emerged mid-simulation, our team was able to incorporate it and keep moving without losing significant time.', type: 'likert', sectionId: 'sec_structure', weight: 1, isReverse: false, isActive: true },
    { id: 'q2', number: 2, text: 'Our team adjusted the pace of decision-making appropriately — moving faster when time was critical and slowing down when the situation required more thought.', type: 'likert', sectionId: 'sec_structure', weight: 1, isReverse: false, isActive: true },
    { id: 'q3', number: 3, text: 'Before working through decisions, our team established a clear approach or sequence for how we would proceed.', type: 'likert', sectionId: 'sec_structure', weight: 1, isReverse: false, isActive: true },
    
    // Section 2: Focus Under Pressure
    { id: 'q4', number: 4, text: "Under time pressure, the team's instinct was to slow down and prioritise before acting.", type: 'likert', sectionId: 'sec_pressure', weight: 1, isReverse: false, isActive: true },
    { id: 'q5', number: 5, text: 'Decisions were made after the team had a sufficient shared understanding of the situation.', type: 'likert', sectionId: 'sec_pressure', weight: 1, isReverse: false, isActive: true },
    { id: 'q6', number: 6, text: 'When something went wrong or did not go to plan, the team regrouped and found a way forward without significant disruption.', type: 'likert', sectionId: 'sec_pressure', weight: 1, isReverse: false, isActive: true },
    
    // Section 3: Alignment & Collective Commitment
    { id: 'q7', number: 7, text: 'Once a decision was made, the team moved into execution — adjusting and refining as needed, rather than reopening the original call.', type: 'likert', sectionId: 'sec_alignment', weight: 1, isReverse: false, isActive: true },
    { id: 'q8', number: 8, text: 'Input from quieter or less senior members visibly shaped the direction of our decisions.', type: 'likert', sectionId: 'sec_alignment', weight: 1, isReverse: false, isActive: true },
    { id: 'q9', number: 9, text: 'Team members checked that others were aligned before moving to the next decision.', type: 'likert', sectionId: 'sec_alignment', weight: 1, isReverse: false, isActive: true },
    
    // Section 4: Direction & Expertise Activation
    { id: 'q10', number: 10, text: 'When a decision required specific expertise, the person with that knowledge took the lead — regardless of their formal role.', type: 'likert', sectionId: 'sec_expertise', weight: 1, isReverse: false, isActive: true },
    { id: 'q11', number: 11, text: 'When our discussion drifted or ran over, someone in the team named it and redirected the group.', type: 'likert', sectionId: 'sec_expertise', weight: 1, isReverse: false, isActive: true },
    { id: 'q12', number: 12, text: 'Team members who spoke less frequently were actively invited to contribute during discussions.', type: 'likert', sectionId: 'sec_expertise', weight: 1, isReverse: false, isActive: true },
    
    // Section 5: Open Reflection
    { id: 'q13', number: 13, text: 'What one thing did your team do particularly well in how it made decisions today?', type: 'text', sectionId: 'sec_reflection', weight: 0, isReverse: false, isActive: true },
    { id: 'q14', number: 14, text: 'If you ran this simulation again tomorrow, what one change in how your team operates would most improve your result?', type: 'text', sectionId: 'sec_reflection', weight: 0, isReverse: false, isActive: true }
  ]
};