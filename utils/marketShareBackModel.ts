import { Team, TurnDecisions, ProductId, HRRole } from '../types';
import { PRODUCTS, SUPPLIERS, HR_ROLES, INITIAL_DECISIONS, SUPPLIER_METRICS } from '../constants';
import CONFIG from '../resources/config.json';

const EMPLOYEE_PRODUCTIVITY = (CONFIG as any).employee_productivity || {};
const TRAINING_PROGRAMS = (CONFIG as any).training_programs || {};

// Helper: Calculate population standard deviation over exactly 10 slots
export function stdDevP(values: number[]): number {
  const n = 10; // always 10 slots in Excel backModel
  const padded = [...values];
  while (padded.length < n) {
    padded.push(0);
  }
  
  const mean = padded.reduce((sum, v) => sum + v, 0) / n;
  const variance = padded.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

// Helper: Error function approximation (Abramowitz & Stegun 7.1.26)
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

// Helper: Normal cumulative distribution function
export function normCdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0.5; // fallback
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

// Excel market demand schedule (Excel source of truth from §6)
export function getMarketDemandForPeriod(productId: ProductId, period: number): number {
  const baseDemands: Record<ProductId, number[]> = {
    techbook: [288750, 187588, 240800, 82500],
    zroid: [179888, 260242, 287930, 160000],
    itab: [89750, 127559, 251407, 180000]
  };

  const productBase = baseDemands[productId];
  if (!productBase) return 0;
  
  if (period < productBase.length) {
    return productBase[period];
  }

  const cagr = productId === 'techbook' ? 0.055 : (productId === 'zroid' ? 0.075 : 0.105);
  let val = productBase[productBase.length - 1];
  for (let p = productBase.length; p <= period; p++) {
    val = Math.ceil(val * (1 + cagr));
  }
  return val;
}

// Buying criteria driver weights config (§3)
export function getCriterionRating(criterionId: number, productId: ProductId, period: number): number {
  // 1-based indexing for criterionId matching the spec table
  switch (criterionId) {
    case 1: // Price
      if (productId === 'techbook') return 10;
      if (productId === 'zroid') return 5;
      if (productId === 'itab') return period === 3 ? 8 : 3;
      return 0;
    case 2: // Payment Terms
      if (productId === 'techbook') return 9;
      if (productId === 'zroid') return 3;
      if (productId === 'itab') return 2;
      return 0;
    case 3: // Availability
      if (productId === 'techbook') return 7;
      if (productId === 'zroid') return 6;
      if (productId === 'itab') return 9;
      return 0;
    case 4: // Stores
      if (productId === 'techbook') return 8;
      if (productId === 'zroid') return 8;
      if (productId === 'itab') return 5;
      return 0;
    case 5: // Agents
      if (productId === 'techbook') return 4;
      if (productId === 'zroid') return 7;
      if (productId === 'itab') return 6;
      return 0;
    case 6: // Staff Availability
      if (productId === 'techbook') return 3;
      if (productId === 'zroid') return 4;
      if (productId === 'itab') return 8;
      return 0;
    case 7: // Product Innovation
      if (productId === 'techbook') return 8;
      if (productId === 'zroid') return 8;
      if (productId === 'itab') return 10;
      return 0;
    case 8: // Company Advertising
      if (productId === 'techbook') return 6;
      if (productId === 'zroid') return 9;
      if (productId === 'itab') return 4;
      return 0;
    case 9: // Product Advertising
      if (productId === 'techbook') return 5;
      if (productId === 'zroid') return 10;
      if (productId === 'itab') return 7;
      return 0;
    case 10: // Other
      return 0;
    default:
      return 0;
  }
}

// Calculate scaled production for capacity checks
export function getScaledProduction(team: Team, decisions: TurnDecisions): Record<ProductId, number> {
  const staffToConfigKey: Record<string, string> = {
    engineers: 'Engineers',
    technicians: 'Technicians',
    semiSkilled: 'Semi-Skilled',
    adminSales: 'Admin & Sales',
    customerService: 'Customer Service'
  };

  let staffBasedCapacity = 0;
  Object.keys(team.staffCounts || {}).forEach((r: string) => {
    const count = team.staffCounts[r as HRRole] || 0;
    const configKey = staffToConfigKey[r] || r;
    const baseUnits = EMPLOYEE_PRODUCTIVITY[configKey]?.base_units_per_employee || 0;
    const trainingLevel = decisions.hr?.trainingLevels?.[r as HRRole] || 'None';
    const trainingEffect = TRAINING_PROGRAMS[trainingLevel]?.productivity_effect || 0;
    staffBasedCapacity += Math.floor(count * baseUnits * (1 + trainingEffect));
  });

  const availableCapacity = Math.max(0, Math.min(team.factoryCapacity || 0, staffBasedCapacity));
  const plannedTotalProduction = Object.values(decisions.operations?.production || {}).reduce((a, b) => a + (b || 0), 0);
  const productionScale = plannedTotalProduction > 0 && plannedTotalProduction > availableCapacity ? (availableCapacity / plannedTotalProduction) : 1;

  const scaled: Record<ProductId, number> = {
    techbook: 0,
    zroid: 0,
    itab: 0
  };
  
  PRODUCTS.forEach(p => {
    const planned = decisions.operations?.production?.[p.id] ?? 0;
    scaled[p.id] = Math.floor(planned * productionScale);
  });

  return scaled;
}

// Calculate closing features developed
export function getClosingFeatures(team: Team, decisions: TurnDecisions, productId: ProductId): number {
  const prevFeatures = team.features?.[productId] ?? 0;
  const splitVal = Number(decisions.operations?.rdSplits?.[productId]) || 0;
  const investment = Number(decisions.operations?.rdBudget) * splitVal;
  
  const alloc = decisions.procurement?.supplierAllocation?.[productId] || {};
  let totalAlloc = 0;
  let sumInnov = 0;
  SUPPLIERS.forEach(s => {
    const compVal = Number(alloc[s]?.components) || 0;
    const fgVal = Number(alloc[s]?.finishedGoods) || 0;
    const totalVal = compVal + fgVal;
    if (totalVal > 0) {
      const supplierInnov = SUPPLIER_METRICS[s as keyof typeof SUPPLIER_METRICS]?.innovation || 5.0;
      sumInnov += supplierInnov * totalVal;
      totalAlloc += totalVal;
    }
  });
  const supplierInnovScore = totalAlloc > 0 ? (sumInnov / totalAlloc) : 6.0;
  const baseFeatures = investment / 2000000;
  const featuresDeveloped = baseFeatures * (supplierInnovScore / 6.0);
  const developed = Math.min(10, Math.ceil(featuresDeveloped));
  
  return prevFeatures + developed;
}

export interface CriterionBreakdown {
  id: number;
  name: string;
  rating: number;
  lowerIsBetter: boolean;
  rawByTeam: number[]; // size = sortedTeams.length
  mu: number;
  sigma: number;
  scoreByTeam: number[];
  weightedByTeam: number[];
}

export interface ProductMarketShareResult {
  productId: ProductId;
  period: number;
  activeByTeam: boolean[];
  activeCount: number;
  criteria: CriterionBreakdown[];
  totalScoreByTeam: number[];
  marketShareByTeam: number[];
  marketDemand: number;
  demandUnitsByTeam: number[];
  availableByTeam: number[];
  unitsSoldByTeam: number[];
}

// Main BackModel Market Share calculator
export function computeMarketShareBackModel(
  teams: Team[],
  period: number,
  numberOfTeams = teams.length
): ProductMarketShareResult[] {
  const sortedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));
  
  const criteriaMeta = [
    { id: 1, name: 'Price', lowerIsBetter: true },
    { id: 2, name: 'Payment Terms', lowerIsBetter: false },
    { id: 3, name: 'Availability', lowerIsBetter: false },
    { id: 4, name: 'Stores', lowerIsBetter: false },
    { id: 5, name: 'Agents', lowerIsBetter: false },
    { id: 6, name: 'Staff Availability', lowerIsBetter: false },
    { id: 7, name: 'Product Innovation', lowerIsBetter: false },
    { id: 8, name: 'Company Advertising', lowerIsBetter: false },
    { id: 9, name: 'Product Advertising', lowerIsBetter: false },
    { id: 10, name: 'Other', lowerIsBetter: false }
  ];

  return PRODUCTS.map(p => {
    // 1. Determine active teams for this product
    const activeByTeam = sortedTeams.map((t, idx) => {
      if (idx >= numberOfTeams) return false;
      const dec = t.draftDecisions || INITIAL_DECISIONS;
      const forecastedShare = dec.marketing?.forecastedMarketShare?.[p.id] ?? 0;
      return forecastedShare >= 0.000001;
    });

    const activeCount = activeByTeam.filter(Boolean).length;

    // 2. Collect raw inputs for each criterion
    const criteria: CriterionBreakdown[] = criteriaMeta.map(meta => {
      const rating = getCriterionRating(meta.id, p.id, period);
      
      const rawByTeam = sortedTeams.map((t, idx) => {
        if (!activeByTeam[idx]) return 0;
        const dec = t.draftDecisions || INITIAL_DECISIONS;
        
        switch (meta.id) {
          case 1: // Price
            return dec.marketing?.prices?.[p.id] ?? 0;
          case 2: // Payment Terms
            return dec.finance?.debtorsDays?.[p.id] ?? 0;
          case 3: // Availability
            return (t.factoryCapacity || 0) + (dec.operations?.capacityChange ?? 0);
          case 4: // Stores
            return (t.storeCount || 0) + (dec.marketing?.openCloseStores ?? 0);
          case 5: // Agents
            return dec.marketing?.agentCommission ?? 0;
          case 6: // Staff Availability (CS headcount)
            return Math.max(0, (t.staffCounts?.customerService || 0) + (dec.hr?.hiring?.customerService ?? 0));
          case 7: // Product Innovation (Closing features)
            return getClosingFeatures(t, dec, p.id);
          case 8: // Company Advertising
            return (dec.marketing?.advertisingBudget ?? 0) * (dec.marketing?.generalAdSplit ?? 0);
          case 9: // Product Advertising
            return (dec.marketing?.advertisingBudget ?? 0) * (dec.marketing?.adSplits?.[p.id] ?? 0);
          case 10: // Other
            return 0;
          default:
            return 0;
        }
      });

      // Calculate stats (pad raw values array to length 10 with 0s for STDEVP)
      const rawStdDev = stdDevP(rawByTeam);
      const sigma = rawStdDev * 1 + (rawStdDev === 0 ? 1 : 0); // defaulting sigma to 1 if stddev is 0
      
      // Calculate mu over active teams
      const activeSum = rawByTeam.reduce((sum, v) => sum + v, 0);
      const mu = activeCount === 0 ? 0 : activeSum / activeCount;

      // Compute scores and weighted scores
      const scoreByTeam = rawByTeam.map((raw, idx) => {
        if (!activeByTeam[idx] || raw === 0) return 0;
        
        if (meta.lowerIsBetter) {
          return (1 - normCdf(raw, mu, sigma));
        } else {
          return normCdf(raw, mu, sigma);
        }
      });

      const weightedByTeam = scoreByTeam.map(score => score * rating);

      return {
        id: meta.id,
        name: meta.name,
        rating,
        lowerIsBetter: meta.lowerIsBetter,
        rawByTeam,
        mu,
        sigma,
        scoreByTeam,
        weightedByTeam
      };
    });

    // 3. Total score per team (sum over criteria)
    const totalScoreByTeam = sortedTeams.map((_, tIdx) => {
      if (!activeByTeam[tIdx]) return 0;
      return criteria.reduce((sum, c) => sum + c.weightedByTeam[tIdx], 0);
    });

    // 4. Market Share per team
    const grandTotal = totalScoreByTeam.reduce((sum, s) => sum + s, 0);
    const marketShareByTeam = sortedTeams.map((_, tIdx) => {
      if (!activeByTeam[tIdx] || grandTotal === 0) return 0;
      return totalScoreByTeam[tIdx] / grandTotal;
    });

    // 5. Demand & Units Sold
    const marketDemand = getMarketDemandForPeriod(p.id, period);
    const demandUnitsByTeam = marketShareByTeam.map(share => share * marketDemand);
    
    const availableByTeam = sortedTeams.map((t, idx) => {
      if (!activeByTeam[idx]) return 0;
      const dec = t.draftDecisions || INITIAL_DECISIONS;
      const scaledProd = getScaledProduction(t, dec)[p.id] || 0;
      const purchased = Object.values(dec.procurement?.supplierAllocation?.[p.id] || {}).reduce((s: number, v: any) => s + (v.finishedGoods || 0), 0);
      const opening = t.inventory?.[p.id] ?? 0;
      return opening + scaledProd + purchased;
    });

    const unitsSoldByTeam = demandUnitsByTeam.map((demandVal, idx) => {
      if (!activeByTeam[idx]) return 0;
      return Math.min(demandVal, availableByTeam[idx]);
    });

    return {
      productId: p.id,
      period,
      activeByTeam,
      activeCount,
      criteria,
      totalScoreByTeam,
      marketShareByTeam,
      marketDemand,
      demandUnitsByTeam,
      availableByTeam,
      unitsSoldByTeam
    };
  });
}
