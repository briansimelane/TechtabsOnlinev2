import { Team, SimulationClass, MarksConfig, ProductId } from '../types';
import { PRODUCTS, SUPPLIERS, SUPPLIER_METRICS, COMPONENT_COSTS, FINISHED_GOODS_COSTS } from '../constants';

export const INITIAL_FACTORY_CAPACITY = 40000;
/** §5.3 — Excel sums unit volumes with purchase values. */
const INCLUDE_RAW_UNIT_TERMS = true;
/** §5.4 — Excel row 166 off-by-one omits Zen Prod1CompPurchase. We implement it correctly. */
const REPLICATE_EXCEL_ZEN_BUG = false;

export const DEFAULT_MARKS_CONFIG: MarksConfig = {
  baseMarkPass: 10,
  baseMarkFail: 7,
  csatHurdle: 0.75,
  esatHurdle: 0.75,
  activeTeamCountOverride: null,
  additionalMarksScale: 50,
  classAdjustment: 0,
  classAdjustments: {},
  missedSalesBasis: 'latest',
};

export const MARK_KPIS = [
  { key: 'grossProfitPct',  label: 'Gross Profit (%)',        excelRow: 10, format: 'percent'  },
  { key: 'netProfitPct',    label: 'Net Profit (%)',          excelRow: 11, format: 'percent'  },
  { key: 'roe',             label: 'ROE',                     excelRow: 12, format: 'percent'  },
  { key: 'csat',            label: 'Customer Satisfaction',   excelRow: 13, format: 'percent'  },
  { key: 'esat',            label: 'Employee Satisfaction',   excelRow: 14, format: 'percent'  },
  { key: 'accRevenue',      label: 'Acc. Revenue',            excelRow: 15, format: 'currency' },
  { key: 'accInnovation',   label: 'Acc. Product Innovation', excelRow: 16, format: 'currency' },
  { key: 'capacity',        label: 'Total Production Capacity', excelRow: 17, format: 'number' },
  { key: 'quality',         label: 'Quality',                 excelRow: 18, format: 'decimal1' },
] as const;

export type MarkKpiKey = typeof MARK_KPIS[number]['key'];

export interface BaseCriterionDef {
  key: string;
  label: string;
  excelRow: number;
}

export const BASE_CRITERIA: BaseCriterionDef[] = [
  { key: 'positiveNP',   label: 'Has positive NP%',   excelRow: 25 },
  { key: 'positiveCash', label: 'Has positive Cash',  excelRow: 26 },
  { key: 'noMissedSales',label: 'No Missed Sales',    excelRow: 27 },
  { key: 'csatHurdle',   label: 'Customer Satisfaction', excelRow: 28 },
  { key: 'esatHurdle',   label: 'Employee Satisfaction', excelRow: 29 },
];

export interface SupplierQualityBreakdown {
  perSupplier: Record<string, {
    componentUnits: number;
    componentValue: number;
    finishedGoodsUnits: number;
    finishedGoodsValue: number;
    weight: number;
    weightShare: number;   // 0–1
    quality: number;
    contribution: number; // weightShare × quality
  }>;
  totalWeight: number;
  quality: number;      // 0–10
  flagged: boolean;     // true when totalWeight === 0
}

export interface TeamMarksResult {
  teamId: string;
  teamName: string;
  groupNumber: number;              // 1-based position in the scored set
  hasResults: boolean;
  scoringPeriod: number | null;
  values: Record<MarkKpiKey, number>;
  flags: Partial<Record<MarkKpiKey, string>>;   // key -> human-readable reason
  bankBalance: number;
  missedSales: number;
  ranks: Record<MarkKpiKey, number>;
  additionalMarks: Record<MarkKpiKey, number>;
  totalAdditional: number;                        // Excel D42
  baseResults: Record<string, { passed: boolean; mark: number }>;
  totalBase: number;                              // Excel D30
  classAdjustment: number;                        // Excel D43
  total: number;                                  // Excel D44
  qualityBreakdown: SupplierQualityBreakdown;
}

export interface ClassMarksResult {
  scoringPeriod: number | null;
  activeTeamCount: number;          // Excel O31 (after override)
  autoTeamCount: number;            // what auto would have been
  isTeamCountOverridden: boolean;
  divisor: number;                  // Excel R31
  maxBase: number;
  maxAdditional: number;
  maxAttainable: number;            // maxBase + maxAdditional
  teams: TeamMarksResult[];
  warnings: string[];               // e.g. period mismatch, <2 teams
}

/** Ascending rank: lowest value gets rank 1, ties share lower rank */
export function rankAscending(value: number, values: number[]): number {
  return 1 + values.filter(v => v < value).length;
}

/** Compute procurement-spend-weighted supplier quality average for a team */
export function computeSupplierQuality(team: Team): SupplierQualityBreakdown {
  const ov = team.draftDecisions?.supplierOverrides;
  const alloc = team.draftDecisions?.procurement?.supplierAllocation;

  const qualityOf = (s: string) =>
    ov?.quality?.[s] ?? SUPPLIER_METRICS[s as keyof typeof SUPPLIER_METRICS]?.quality ?? 5.0;

  const compCostOf = (p: ProductId, s: string) =>
    ov?.componentCosts?.[p]?.[s] ?? COMPONENT_COSTS[p]?.[s] ?? 0;

  const fgCostOf = (p: ProductId, s: string) =>
    ov?.finishedGoodsCosts?.[p]?.[s] ?? FINISHED_GOODS_COSTS[p]?.[s] ?? 0;

  const per: Record<string, {
    componentUnits: number;
    componentValue: number;
    finishedGoodsUnits: number;
    finishedGoodsValue: number;
    weight: number;
    weightShare: number;
    quality: number;
    contribution: number;
  }> = {};

  const productIds = PRODUCTS.map(p => p.id);

  for (const s of SUPPLIERS) {
    let compUnits = 0, compValue = 0, fgUnits = 0, fgValue = 0;

    for (const p of productIds) {
      const a = alloc?.[p]?.[s] ?? { components: 0, finishedGoods: 0 };
      compUnits += a.components;
      compValue += a.components * compCostOf(p, s);
      fgUnits += a.finishedGoods;
      fgValue += a.finishedGoods * fgCostOf(p, s);
    }

    let weight: number;
    if (REPLICATE_EXCEL_ZEN_BUG && s === 'Zen') {
      // Excel row 166 bug omits Zen Prod1CompPurchase and uses Prod1RM price instead
      const zenProd1RM = compCostOf('techbook', 'Zen');
      const compUnitsProd1 = alloc?.['techbook']?.['Zen']?.components ?? 0;
      const compValProd1 = compUnitsProd1 * zenProd1RM;
      weight = INCLUDE_RAW_UNIT_TERMS
        ? compUnitsProd1 + zenProd1RM + (compUnits - compUnitsProd1) + (compValue - compValProd1) + fgUnits + fgValue
        : zenProd1RM + (compValue - compValProd1) + fgValue;
    } else {
      weight = INCLUDE_RAW_UNIT_TERMS
        ? compUnits + compValue + fgUnits + fgValue
        : compValue + fgValue;
    }

    per[s] = {
      componentUnits: compUnits,
      componentValue: compValue,
      finishedGoodsUnits: fgUnits,
      finishedGoodsValue: fgValue,
      weight,
      quality: qualityOf(s),
      weightShare: 0,
      contribution: 0,
    };
  }

  const totalWeight = SUPPLIERS.reduce((t, s) => t + per[s].weight, 0);

  if (totalWeight <= 0) {
    return { perSupplier: per, totalWeight: 0, quality: 0, flagged: true };
  }

  let quality = 0;
  for (const s of SUPPLIERS) {
    per[s].weightShare = per[s].weight / totalWeight;
    per[s].contribution = per[s].weightShare * per[s].quality;
    quality += per[s].contribution;
  }

  return { perSupplier: per, totalWeight, quality, flagged: false };
}

function getLatestPeriod(team: Team): number | null {
  if (!team.history) return null;
  const keys = Object.keys(team.history)
    .map(Number)
    .filter(k => !isNaN(k) && k >= 1);
  if (keys.length === 0) return null;
  return Math.max(...keys);
}

function computeMissedSales(team: Team, period: number, basis: 'latest' | 'cumulative'): { val: number; flagged: boolean } {
  if (!team.history) return { val: 0, flagged: true };
  const periodsToScan = basis === 'cumulative'
    ? Object.keys(team.history).map(Number).filter(k => k >= 1 && k <= period)
    : [period];

  let totalMissed = 0;
  let flagged = false;

  for (const p of periodsToScan) {
    const rec = team.history[p];
    if (!rec || !rec.market || !rec.market.demandUnits || !rec.market.actualUnits) {
      flagged = true;
      continue;
    }
    for (const prod of PRODUCTS) {
      const id = prod.id;
      const demand = rec.market.demandUnits[id] ?? 0;
      const actual = rec.market.actualUnits[id] ?? 0;
      totalMissed += Math.max(0, demand - actual);
    }
  }

  return { val: totalMissed, flagged };
}

export function computeClassMarks(
  rawTeams: Team[],
  rawConfig?: MarksConfig,
): ClassMarksResult {
  const config: MarksConfig = {
    ...DEFAULT_MARKS_CONFIG,
    ...(rawConfig ?? {}),
  };

  const scoredTeams = (rawTeams || []).filter(t => !t.isArchived && !t.isComputer);
  const warnings: string[] = [];

  // Identify periods
  const teamPeriods: { team: Team; period: number | null }[] = scoredTeams.map(team => ({
    team,
    period: getLatestPeriod(team),
  }));

  const teamsWithResults = teamPeriods.filter(tp => tp.period !== null);
  const autoTeamCount = teamsWithResults.length;

  let classScoringPeriod: number | null = null;
  if (teamsWithResults.length > 0) {
    const periods = teamsWithResults.map(tp => tp.period as number);
    classScoringPeriod = Math.min(...periods);
    const laggingTeams = teamsWithResults.filter(tp => (tp.period as number) > classScoringPeriod!);
    if (laggingTeams.length > 0) {
      warnings.push(`Teams have different completed periods. Scoring at Period ${classScoringPeriod}.`);
    }
  }

  if (scoredTeams.length < 2) {
    warnings.push("Fewer than 2 active scored teams available in class.");
  }

  const isTeamCountOverridden = config.activeTeamCountOverride !== null && config.activeTeamCountOverride !== undefined;
  const activeTeamCount = config.activeTeamCountOverride ?? (autoTeamCount > 0 ? autoTeamCount : 1);
  const divisor = (activeTeamCount * 9) + 9;
  const maxBase = 5 * config.baseMarkPass;
  const maxAdditional = config.additionalMarksScale;
  const maxAttainable = maxBase + maxAdditional;

  // Step 1: Extract values for each team
  const intermediateTeams: {
    team: Team;
    groupNumber: number;
    hasResults: boolean;
    period: number | null;
    values: Record<MarkKpiKey, number>;
    flags: Partial<Record<MarkKpiKey, string>>;
    bankBalance: number;
    missedSales: number;
    qualityBreakdown: SupplierQualityBreakdown;
  }[] = [];

  let groupCounter = 1;

  for (const { team, period } of teamPeriods) {
    const groupNumber = groupCounter++;
    const qualityBreakdown = computeSupplierQuality(team);

    if (period === null || !team.history || !team.history[period]) {
      intermediateTeams.push({
        team,
        groupNumber,
        hasResults: false,
        period: null,
        values: {
          grossProfitPct: 0, netProfitPct: 0, roe: 0, csat: 0, esat: 0,
          accRevenue: 0, accInnovation: 0, capacity: 0, quality: 0,
        },
        flags: {},
        bankBalance: 0,
        missedSales: 0,
        qualityBreakdown,
      });
      continue;
    }

    const h = team.history[period];
    const flags: Partial<Record<MarkKpiKey, string>> = {};

    const revTotal = h.revenue?.total ?? 0;
    const grossProfitTotal = h.grossProfit?.total ?? 0;
    const netProfit = h.netProfit ?? 0;
    const equity = h.balanceSheet?.equity ?? 0;

    let grossProfitPct = 0;
    if (revTotal === 0) {
      flags.grossProfitPct = "Revenue is zero";
    } else {
      grossProfitPct = grossProfitTotal / revTotal;
    }

    let netProfitPct = 0;
    if (revTotal === 0) {
      flags.netProfitPct = "Revenue is zero";
    } else {
      netProfitPct = netProfit / revTotal;
    }

    let roe = 0;
    if (equity === 0) {
      flags.roe = "Equity is zero";
    } else {
      roe = netProfit / equity;
    }

    const csat = h.kpis?.customerSatisfaction ?? 0;
    const esat = h.kpis?.employeeSatisfaction ?? 0;

    // Cumulative calculations across p = 1..period
    let accRevenue = 0;
    let accInnovation = 0;

    for (let p = 1; p <= period; p++) {
      const hp = team.history[p];
      if (hp) {
        accRevenue += hp.revenue?.total ?? 0;
        accInnovation += hp.opex?.rd ?? 0;
      }
    }

    // Total Production Capacity (opening + decision)
    const currentCap = team.factoryCapacity ?? INITIAL_FACTORY_CAPACITY;
    const capacity = currentCap;

    const quality = qualityBreakdown.quality;
    if (qualityBreakdown.flagged) {
      flags.quality = "No procurement allocation recorded";
    }

    const bankBalance = h.balanceSheet?.cash ?? 0;
    const msRes = computeMissedSales(team, period, config.missedSalesBasis);
    const missedSales = msRes.val;

    intermediateTeams.push({
      team,
      groupNumber,
      hasResults: true,
      period,
      values: {
        grossProfitPct,
        netProfitPct,
        roe,
        csat,
        esat,
        accRevenue,
        accInnovation,
        capacity,
        quality,
      },
      flags,
      bankBalance,
      missedSales,
      qualityBreakdown,
    });
  }

  // Step 2: Extract values array for scored teams with results for ranking
  const scoredWithResults = intermediateTeams.filter(t => t.hasResults);

  const kpiValuesMap: Record<MarkKpiKey, number[]> = {
    grossProfitPct: scoredWithResults.map(t => t.values.grossProfitPct),
    netProfitPct: scoredWithResults.map(t => t.values.netProfitPct),
    roe: scoredWithResults.map(t => t.values.roe),
    csat: scoredWithResults.map(t => t.values.csat),
    esat: scoredWithResults.map(t => t.values.esat),
    accRevenue: scoredWithResults.map(t => t.values.accRevenue),
    accInnovation: scoredWithResults.map(t => t.values.accInnovation),
    capacity: scoredWithResults.map(t => t.values.capacity),
    quality: scoredWithResults.map(t => t.values.quality),
  };

  // Step 3: Compute ranks, base marks, additional marks, and total for each team
  const finalTeams: TeamMarksResult[] = intermediateTeams.map(t => {
    const ranks: Record<MarkKpiKey, number> = {
      grossProfitPct: 0, netProfitPct: 0, roe: 0, csat: 0, esat: 0,
      accRevenue: 0, accInnovation: 0, capacity: 0, quality: 0,
    };

    const additionalMarks: Record<MarkKpiKey, number> = {
      grossProfitPct: 0, netProfitPct: 0, roe: 0, csat: 0, esat: 0,
      accRevenue: 0, accInnovation: 0, capacity: 0, quality: 0,
    };

    let totalAdditional = 0;

    if (t.hasResults) {
      for (const kpi of MARK_KPIS) {
        const key = kpi.key;
        const val = t.values[key];
        const rank = rankAscending(val, kpiValuesMap[key]);
        ranks[key] = rank;

        const addMark = Math.trunc((config.additionalMarksScale * rank) / divisor);
        additionalMarks[key] = addMark;
        totalAdditional += addMark;
      }
    }

    // Base marks calculation
    const baseResults: Record<string, { passed: boolean; mark: number }> = {};
    let totalBase = 0;

    if (t.hasResults) {
      // 1. Positive NP%
      const pass1 = t.values.netProfitPct > 0;
      const mark1 = pass1 ? config.baseMarkPass : config.baseMarkFail;
      baseResults.positiveNP = { passed: pass1, mark: mark1 };
      totalBase += mark1;

      // 2. Positive Cash
      const pass2 = t.bankBalance > 0;
      const mark2 = pass2 ? config.baseMarkPass : config.baseMarkFail;
      baseResults.positiveCash = { passed: pass2, mark: mark2 };
      totalBase += mark2;

      // 3. No Missed Sales
      const pass3 = !(t.missedSales > 0);
      const mark3 = pass3 ? config.baseMarkPass : config.baseMarkFail;
      baseResults.noMissedSales = { passed: pass3, mark: mark3 };
      totalBase += mark3;

      // 4. CSAT Hurdle
      const pass4 = t.values.csat >= config.csatHurdle;
      const mark4 = pass4 ? config.baseMarkPass : config.baseMarkFail;
      baseResults.csatHurdle = { passed: pass4, mark: mark4 };
      totalBase += mark4;

      // 5. ESAT Hurdle
      const pass5 = t.values.esat >= config.esatHurdle;
      const mark5 = pass5 ? config.baseMarkPass : config.baseMarkFail;
      baseResults.esatHurdle = { passed: pass5, mark: mark5 };
      totalBase += mark5;
    } else {
      for (const crit of BASE_CRITERIA) {
        baseResults[crit.key] = { passed: false, mark: 0 };
      }
    }

    const classAdjustment = (config.classAdjustment !== undefined && config.classAdjustment !== null)
      ? config.classAdjustment
      : (config.classAdjustments?.[t.team.id] ?? 0);
    const total = totalBase + totalAdditional + classAdjustment;

    return {
      teamId: t.team.id,
      teamName: t.team.name,
      groupNumber: t.groupNumber,
      hasResults: t.hasResults,
      scoringPeriod: t.period,
      values: t.values,
      flags: t.flags,
      bankBalance: t.bankBalance,
      missedSales: t.missedSales,
      ranks,
      additionalMarks,
      totalAdditional,
      baseResults,
      totalBase,
      classAdjustment,
      total,
      qualityBreakdown: t.qualityBreakdown,
    };
  });

  return {
    scoringPeriod: classScoringPeriod,
    activeTeamCount,
    autoTeamCount,
    isTeamCountOverridden,
    divisor,
    maxBase,
    maxAdditional,
    maxAttainable,
    teams: finalTeams,
    warnings,
  };
}

/** Golden Fixture Validation (§11 Acceptance Test) */
export function runGoldenFixtureTests(): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check tie ranking
  const ranksTest = [15055857, 15055857, 35000000, 26000000, 20000000];
  if (rankAscending(15055857, ranksTest) !== 1) {
    errors.push(`Rank test failed: expected rank 1 for tie value 15055857, got ${rankAscending(15055857, ranksTest)}`);
  }
  if (rankAscending(35000000, ranksTest) !== 5) {
    errors.push(`Rank test failed: expected rank 5 for 35000000, got ${rankAscending(35000000, ranksTest)}`);
  }

  // Truncation check
  const div54 = 54;
  const addMarkTest = Math.trunc((50 * 5) / div54);
  if (addMarkTest !== 4) {
    errors.push(`Truncation test failed: expected 4, got ${addMarkTest}`);
  }

  return { success: errors.length === 0, errors };
}
