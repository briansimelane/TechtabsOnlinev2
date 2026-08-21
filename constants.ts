import { Product, SimulationState, TurnDecisions, HRRole, TrainingLevel, Facilitator, SurveyConfig, PeriodRecord, ProductId, ScenarioVariant } from './types';


export const PRODUCTS: Product[] = [
  { id: 'techbook', name: 'TechBook', segment: 'Entry' },
  { id: 'zroid', name: 'Zroid', segment: 'Mid' },
  { id: 'itab', name: 'iTab', segment: 'Premium' },
];

export const SUPPLIERS = ['Alpha', 'Neepo', 'Zen', 'Cheng'];

export const HR_ROLES: HRRole[] = ['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'];

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
    interestRate: 0.065, // 6.5% long-term debt interest
    overdraftInterestRate: 0.15, // 15% overdraft interest on negative cash balances
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

export function getOverriddenValue(path: string[], period: number, fallback: number): number {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('simulation_config_overrides') : null;
    if (raw) {
      const config = JSON.parse(raw);
      let curr = config;
      for (const p of path) {
        curr = curr?.[p];
      }
      if (curr?.by_year && curr.by_year[period] !== undefined) {
        return Number(curr.by_year[period]);
      }
      if (typeof curr === 'number') {
        return Number(curr);
      }
    }
  } catch (e) {}
  return fallback;
}

export const getMarketSize = (productId: ProductId, period: number): number => {
  const pName = productId === 'techbook' ? 'TechBook' : (productId === 'zroid' ? 'Zroid' : 'iTab');

  // Check custom facilitator configuration overrides first
  try {
    const overridesRaw = typeof window !== 'undefined' ? localStorage.getItem('simulation_config_overrides') : null;
    if (overridesRaw) {
      const overrides = JSON.parse(overridesRaw);
      const customYearly = overrides.market_demand?.[pName]?.yearly_units;
      if (customYearly && customYearly[period] !== undefined) {
        return Number(customYearly[period]);
      }
    }
  } catch (e) {}

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

// Period (ALP year) -> ordered list of scenario variants.
// The first variant in each list is the default when no override selects one.
// Bodies are transcribed VERBATIM from the source scenario documents.
export const SCENARIO_TEMPLATES: Record<number, ScenarioVariant[]> = {
  1: [
    {
      id: 'default',
      label: 'Standard',
      title: 'Year 1 Scenario',
      body: `# Year 1 Scenario

## Updated Market Demand

| | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| TechBook demand | 187 588 | 240 800 | 164 150 |
| Zroid demand | 260 242 | 287 930 | 300 400 |
| iTab demand | 127 559 | 196 907 | 205 100 |
| Product X (similar to iTab) | 0 | 54 500 | 135 500 |

## Updated Customer Preferences

- Zroid preference for stores => 8/10
- TechBook preference for innovation => 8/10

## In the News

- The State-Owned Entity, which was Team 6 in Year 0 – has been liquidated and has ceased all operations. The minister of Trade and Industry has expressed government's interest in creating a new, more higher-end mobile tech company with the view of introducing a new product into the market in future.

- You are allowed one supplier negotiation in Year 1. Teams are also encouraged to collaborate for supplier negotiations. You can negotiate with the supplier via WhatsApp to 082 047 9544 from 13:30 – 15:00.

- The governments of Botswana and Mozambique have shown an interest in creating legislation that will pave a way for companies in our country to enter those markets in Year 2. The anticipated demand for the products in those countries for Year 2 is:

| | Botswana | Mozambique |
| --- | --- | --- |
| TechBook | 50 000 | 20 000 |
| Zroid | 80 000 | 45 000 |
| iTab | 60 000 | 40 000 |

- The South African government has received considerable pressure from the US government to join them in putting tariffs on Chinese imports in the tech industry. Even though it was expected that the US would not continue with these wars – it appears law-makers had other ideas in order to consolidate support of the divided population. Currently, the SA government has considered maintaining US relations over China and want to impose tariffs of 50% on imports of tech products from China. This is not law yet. The EFF has fought strongly against this in parliament and has called upon all civil society to voice their disapproval of such a stance as the poor will suffer the most. They have requested that tech giants in the industry join them in condemning these draconian tendencies from the government and especially highlight the risk to our sovereignty by bowing down to such pressure.

- Global geopolitical tensions have intensified following renewed trade conflicts between major economic blocs, escalating sanctions, and growing protectionism in the technology sector. The United States and the European Union have announced stricter export controls on advanced semiconductors, AI components, and manufacturing equipment, directly impacting global supply chains. China has responded by prioritising domestic production and restricting the export of critical rare earth minerals. As a result, global tech manufacturers are facing component shortages, longer lead times, and sharply rising input costs. Analysts warn that emerging markets, including South Africa, will be disproportionately affected due to their reliance on imported technology and components.

- For South Africa, the situation is compounded by currency volatility, rising logistics costs, and increasing pressure to "choose sides" in the growing global tech divide. Local tech distributors and assemblers are warning of potential price spikes of 20–40% on key products if current trends continue. At the same time, government is under pressure to introduce localisation policies to protect jobs and reduce import dependency. This environment is likely to favour companies that can secure flexible supply agreements, diversify their sourcing strategies, invest in local assembly, or reposition their product offerings, while firms that remain locked into single-source import models may find their margins and market positions under growing strain.`,
    },
  ],
  2: [
    {
      id: 'default',
      label: 'Standard',
      title: 'Year 2 Scenario',
      body: `# Year 2 Scenario

## Updated Market Demand

Based on in-depth customer analysis, a leading consulting company has advised that the customer preferences for the anticipated Product X are identical to that of the iTab and, therefore, the market demand for the iTab has been revised as below:

| | Year 2 | Year 3 |
| --- | --- | --- |
| iTab demand | 251 407 | 340 600 |

## Staff Attrition

Based on the ending employee satisfaction levels, the following number of staff members have been lost by the different teams:

| | Team 1 | Team 2 | Team 3 | Team 4 | Team 5 |
| --- | --- | --- | --- | --- | --- |
| Engineers | 7 | 7 | 10 | 9 | 11 |
| Technicians | 10 | 10 | 11 | 12 | 14 |
| Semi-skilled | 14 | 13 | 14 | 15 | 19 |
| Admin & Sales | 17 | 18 | 24 | 17 | 18 |
| Customer Service | 54 | 57 | 63 | 50 | 47 |

## Supplier Negotiations

Suppliers will be available for negotiations during the decision-making round until 30 minutes before submission deadlines, via WhatsApp with the facilitator.

## In the News

- A very influential shareholder in your company has approached one of your directors separately. This is with an offer of a reward or support for future ambitions if that director ensures that certain things happen within the company. Even though the shareholder trusts your management team, she feels that additional targeted interventions may be required to drive the results required.

- The following opportunities are available in Year 2 in Botswana and Mozambique. All teams will have equal opportunity to enter these markets and will need to indicate upon submission of the simulation if they will enter into any or both markets. You do not need to forecast additional units for the opportunities – they will be acquired via your cheapest supplier. Your pricing in South Africa will be used and the opportunities will be divided equally between all teams that choose to enter the market.

| | Botswana | Mozambique |
| --- | --- | --- |
| TechBook demand | 50 000 | 20 000 |
| Zroid demand | 80 000 | 45 000 |
| iTab demand | 60 000 | 40 000 |
| Entry mode | Alliance | Agent |
| Cost | Operating Agreement: R90 mil (each team that enters the market) | Commission: 4.5% of Sales |

- The Department of Labour has issued a warning to companies that pay salaries that are lower than the minimum allowable levels (salaries in Year 0). This warning is of a penalty that will be levied if companies continue to profit from their employees.`,
    },
  ],
  3: [
    {
      // Reusable master version (no per-team numbers baked in). Recommended default.
      id: 'v2',
      label: 'Standard (reusable)',
      title: 'Year 3 Scenario',
      body: `# Year 3 Scenario

## Updated Market Demand

The country and the region are expected to go through an intense economic contraction in the upcoming year. This has had a significant impact on the expected demand for the products and will see the reserve bank potentially increasing the REPO rate as well. Below are the revised demand figures by analysts:

| | Year 3 |
| --- | --- |
| TechBook demand | 82 500 |
| Zroid demand | 160 000 |
| iTab / Prod X demand | 180 000 |

This has also had an impact in our neighbouring country markets. The Mozambican government has decided to restrict imports of technological products in favour of local producers and suppliers. Therefore, you will not be able to sell in that region in this year.

The Botswana government has received considerable pressure from civil society to stop outflows of money from the country. They have decided to impose a 50% tax on profits of all tech products sold by foreign entities. The following are the anticipated demand figures in Botswana for Year 3.

| | Botswana |
| --- | --- |
| TechBook demand | 20 000 |
| Zroid demand | 50 000 |
| iTab demand | 70 000 |
| Entry mode | Alliance |
| Cost | Operating Agreement: R95 mil (each team that enters the market) – (R50 mil if you were in Botswana in Year 2) and 50% tax on profits |

Please remember: All teams will have equal opportunity to enter this market and just need to indicate upon submission of the simulation if they will enter Botswana. You are not bound by your decision in Year 2. You do not need to forecast additional units for the opportunities – they will be acquired via your cheapest supplier. Your pricing in South Africa will be used and the opportunities will be divided equally between all teams that choose to enter the market.

## Staff Attrition

Based on the ending employee satisfaction levels your staff attrition would have been adjusted.

## Supplier Negotiations

There will be no supplier negotiations allowed this year.

## Updated Customer Preferences

Recent market research indicates that the iTab price sensitivity has moved to 8/10.

## In the News

**Sustainability in question:**

As your tenure as the executives of your company is coming to an end, the majority of shareholders have expressed a significant worry about the sustainability of the organisation in the future. This was clearly expressed by about 60% of them threatening, at the recent AGM, with the withdrawal of their capital if your team does not provide an explanation at the end of this year – how will you ensure the sustainability of the organisation. This can be done as a report and submitted for their consideration when you submit your Year 3 decisions. You can draw from your recent studies at Henley in order to create this report and show your understanding and ease their worries. (Please do assume any information you may need – that has not been provided).

**Strike action at Neepo:**

The Neepo management and the union representing employees have not been able to reach an agreement on salary increases. The employees have demanded a 20% increase while the Neepo management have offered 5%. This stalemate has meant a reduction of production at Neepo. Neepo is still operational, but may have delayed deliveries. Threats of similar demands have been heard from the non-unionised labour force at Alpha. Management at Alpha indicated that they don't believe these are the views of the majority of their employees and view the threat of a strike as improbable.

**Zen up for sale in an open-bid auction:**

The Zen family have decided to sell 100% of Zen as Mr Zen (who controls the company) has not been well for a while – the auction will take place today.

The company will be sold at an OPEN bid auction between 14:45 and 15:00. Only send your bids directly to the class WhatsApp group. Open bid means the highest price received wins the auction when the auction closes at 15:00.

The minimum asking price for the auction is R190m.

Teams can go into joint ventures together and can raise as much money via equity as they require (provided they have a sustainability report) or raise debt (which is limited). The purchase price will only be taken at the end of Year 3. You will own Zen from the announcement of the bid result.

If you own Zen you pay transfer costs for the product as shown below. You can also negotiate with other teams to buy from Zen and make additional profit that way.

### Zen deal details

| Zen | Year 0 | Year 1 | Year 2 | Year 3 (Forecast) |
| --- | --- | --- | --- | --- |
| Past Sales | 174 303 336 | 193 036 177 | 272 511 691 | 358 130 582 |
| NP % | 12.20% | 11.40% | 15.70% | 17.00% |
| Market Share | 25% | 25.20% | 33.10% | 29% |

**Asking Minimum Price: R 190 000 000**

Transfer Costs – Input Costs / Unit (Raw Material):

| Product | Cost |
| --- | --- |
| TechBook | R 540 |
| Zroid | R 664 |
| iTab | R 575 |

Transfer Costs – Input Costs / Unit (Finished Goods):

| Product | Cost |
| --- | --- |
| TechBook | R 624 |
| Zroid | R 893 |
| iTab | R 900 |`,
    },
    {
      // Specific ADMP25-03 cohort version, with that cohort's actual attrition
      // figures and Botswana/Mozambique performance table.
      id: 'v1',
      label: 'ADMP25-03 cohort',
      title: 'Year 3 Scenario',
      body: `# Year 3 Scenario

## Updated Market Demand

The country and the region are expected to go through an intense economic contraction in the upcoming year. This has had a significant impact on the expected demand for the products and will see the reserve bank potentially increasing the REPO rate as well. Below are the revised demand figures by analysts:

| | Year 3 |
| --- | --- |
| TechBook demand | 82 500 |
| Zroid demand | 160 000 |
| iTab / Prod X demand | 180 000 |

This has also had an impact in our neighbouring country markets. The Mozambican government has decided to restrict imports of technological products in favour of local producers and suppliers. Therefore, you will not be able to sell in that region in this year.

The Botswana government has received considerable pressure from civil society to stop outflows of money from the country. They have decided to impose a 50% tax on profits of all tech products sold by foreign entities. The following are the anticipated demand figures in Botswana for Year 3.

| | Botswana |
| --- | --- |
| TechBook demand | 20 000 |
| Zroid demand | 50 000 |
| iTab demand | 70 000 |
| Entry mode | Alliance |
| Cost | Operating Agreement: R95 mil (each team that enters the market) – (R50 mil if you were in Botswana in Year 2) and 50% tax on profits |

Please remember: All teams will have equal opportunity to enter this market and just need to indicate upon submission of the simulation if they will enter Botswana. You are not bound by your decision in Year 2. You do not need to forecast additional units for the opportunities – they will be acquired via your cheapest supplier. Your pricing in South Africa will be used and the opportunities will be divided equally between all teams that choose to enter the market.

### Past performance in Botswana and Mozambique

**Botswana Opportunity** (Number of teams that entered: 2)

| | Team 1 | Team 2 | Team 3 | Team 4 | Team 5 |
| --- | --- | --- | --- | --- | --- |
| Entered? | | | Yes | | Yes |
| TechBook Units | 0 | 0 | 29 835 014 | 0 | 40 103 292 |
| Zroid Units | 0 | 0 | 160 801 024 | 0 | 135 251 199 |
| iTab Units | 0 | 0 | 181 023 817 | 0 | 160 600 024 |
| Cost | 0 | 0 | 90 000 000 | 0 | 90 000 000 |
| NET of Opportunity | 0 | 0 | 281 659 855 | 0 | 245 954 515 |

_(Unit rows above are the opportunity revenue contribution per team as captured in the source workbook. Mozambique had no team entries.)_

## Staff Attrition

Based on the ending employee satisfaction levels, the following number of staff members have been lost by the different teams:

| | Team 1 | Team 2 | Team 3 | Team 4 | Team 5 |
| --- | --- | --- | --- | --- | --- |
| Engineers | 10 | 9 | 13 | 17 | 15 |
| Technicians | 13 | 13 | 18 | 22 | 21 |
| Semi-skilled | 18 | 17 | 21 | 30 | 27 |
| Admin & Sales | 27 | 28 | 29 | 33 | 32 |
| Customer Service | 91 | 96 | 91 | 104 | 101 |

It also appears the shareholder, Mrs Smith, was correct in her worry about the salaries of engineers and the information she received has proved to have been reliable. Additional attrition due to companies not paying what was considered to be a fair wage by the engineers in the industry (i.e. a minimum of R60,000):

| | Team 1 | Team 2 | Team 3 | Team 4 | Team 5 |
| --- | --- | --- | --- | --- | --- |
| Engineers | 2 | 2 | 2 | 0 | 0 |

## Supplier Negotiations

There will be no supplier negotiations allowed this year.

## Updated Customer Preferences

Recent market research indicates that the iTab price sensitivity has moved to 8/10.

## In the News

**Sustainability in question:**

As your tenure as the executives of your company is coming to an end, the majority of shareholders have expressed a significant worry about the sustainability of the organisation in the future. This was clearly expressed by about 60% of them threatening, at the recent AGM, with the withdrawal of their capital if your team does not provide an explanation at the end of this year – how will you ensure the sustainability of the organisation. This can be done as a report and submitted for their consideration when you submit your Year 3 decisions. You can draw from your recent studies at Henley in order to create this report and show your understanding and ease their worries. (Please do assume any information you may need – that has not been provided).

**Strike action at Neepo:**

The Neepo management and the union representing employees have not been able to reach an agreement on salary increases. The employees have demanded a 20% increase while the Neepo management have offered 5%. This stalemate has meant a reduction of production at Neepo. Neepo is still operational, but may have delayed deliveries. Threats of similar demands have been heard from the non-unionised labour force at Alpha. Management at Alpha indicated that they don't believe these are the views of the majority of their employees and view the threat of a strike as improbable.

**Zen up for sale in an open-bid auction:**

The Zen family have decided to sell 100% of Zen as Mr Zen (who controls the company) has not been well for a while – the auction will take place today.

The company will be sold at an OPEN bid auction between 14:30 and 14:45. Only send your bids directly to the class WhatsApp group. Open bid means the highest price received wins the auction when the auction closes at 14:45.

The minimum asking price for the auction is R190m.

Teams can go into joint ventures together and can raise as much money via equity as they require (provided they have a sustainability report) or raise debt (which is limited). The purchase price will only be taken at the end of Year 3. You will own Zen from the announcement of the bid result.

If you own Zen you pay transfer costs for the product as shown below. You can also negotiate with other teams to buy from Zen and make additional profit that way.

### Zen deal details

| Zen | Year 0 | Year 1 | Year 2 | Year 3 (Forecast) |
| --- | --- | --- | --- | --- |
| Past Sales | 174 303 336 | 193 036 177 | 272 511 691 | 358 130 582 |
| NP % | 12.20% | 11.40% | 15.70% | 17.00% |
| Market Share | 25% | 25.20% | 33.10% | 29% |

**Asking Minimum Price: R 190 000 000**

Transfer Costs – Input Costs / Unit (Raw Material):

| Product | Cost |
| --- | --- |
| TechBook | R 540 |
| Zroid | R 664 |
| iTab | R 575 |

Transfer Costs – Input Costs / Unit (Finished Goods):

| Product | Cost |
| --- | --- |
| TechBook | R 624 |
| Zroid | R 893 |
| iTab | R 900 |`,
    },
  ],
};