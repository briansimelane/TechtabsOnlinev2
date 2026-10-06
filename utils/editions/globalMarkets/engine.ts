import { Team, TurnDecisions, ProductId, KPI, MarketEvent, HRRole, PeriodRecord, GlobalMarketsRecord } from '../../../types';
import { EditionConfig, MarketConfig } from '../types';
import { PRODUCTS, FINANCE_CONSTANTS, getMarketSize } from '../../../constants';
import { sCurve, MARKET_ANCHORS, WEIGHTS, K_SENSITIVITY } from '../../SimulationEngine';
import { mergeGlobalMarketsDecisions } from './defaults';

export interface SimulationResult {
  newTeamState: Team;
  kpis: KPI;
  periodRecord: PeriodRecord;
}

// Forward pricing by Covered Interest Parity (CIP)
export function calculateForwardRate(
  openSpot: number,
  rateZAR: number,
  rateForeign: number,
  tenorMonths: number
): number {
  const t = tenorMonths / 12;
  return openSpot * ((1 + rateZAR * t) / (1 + rateForeign * t));
}

// Get currency spot rates for a period (1-indexed)
export function getCurrencySpots(
  edition: EditionConfig,
  curr: string,
  period: number
): { openSpot: number; closeSpot: number; avgSpot: number; rateForeign: number; rateZAR: number } {
  const cData = edition.currencies[curr];
  const rateZAR = edition.currencies.ZAR.rate;
  if (!cData || curr === 'ZAR') {
    return { openSpot: 1, closeSpot: 1, avgSpot: 1, rateForeign: rateZAR, rateZAR };
  }

  const rateForeign = cData.rate;
  const baseSpot = cData.spot ?? 1;
  const path = cData.path ?? [baseSpot];

  const openSpot = path[period - 1] ?? baseSpot;
  const closeSpot = path[period] ?? openSpot;
  const avgSpot = (openSpot + closeSpot) / 2;

  return { openSpot, closeSpot, avgSpot, rateForeign, rateZAR };
}

export function processTurnGlobalMarkets(
  team: Team,
  rawDecisions: TurnDecisions,
  events: MarketEvent[] = [],
  edition: EditionConfig
): SimulationResult {
  const decisions = mergeGlobalMarketsDecisions(rawDecisions);
  const period = team.currentPeriod;

  // 1. Process Events
  let materialCostModifier = 1.0;
  let demandModifier = 1.0;
  events.forEach(e => {
    if (e.effect === 'MATERIAL_COST_HIKE') materialCostModifier += e.magnitude;
    if (e.effect === 'DEMAND_BOOM') demandModifier += e.magnitude;
  });

  // 2. Capacity & Production
  const staffToUnits: Record<HRRole, number> = {
    engineers: 200,
    technicians: 400,
    semiSkilled: 600,
    adminSales: 500000,
    customerService: 1500
  };

  const trainingFactorByLevel: Record<string, number> = {
    'None': 0.0,
    'Basic': 0.05,
    'Moderate': 0.10,
    'Advanced': 0.15
  };

  let staffBasedCapacity = 0;
  (Object.keys(team.staffCounts) as HRRole[]).forEach(r => {
    const count = team.staffCounts[r] || 0;
    const baseUnits = staffToUnits[r] || 0;
    const trainLevel = decisions.hr.trainingLevels[r] || 'None';
    const trainingEffect = trainingFactorByLevel[trainLevel] ?? 0;
    if (r === 'technicians' || r === 'semiSkilled') {
      staffBasedCapacity += Math.floor(count * baseUnits * (1 + trainingEffect));
    }
  });

  const availableCapacity = Math.max(0, Math.min(team.factoryCapacity, staffBasedCapacity));
  const plannedTotalProduction = Object.values(decisions.operations.production).reduce((a, b) => a + (b || 0), 0);
  const productionScale = plannedTotalProduction > 0 && plannedTotalProduction > availableCapacity ? (availableCapacity / plannedTotalProduction) : 1;

  const scaledProduction: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
  PRODUCTS.forEach(p => {
    scaledProduction[p.id] = Math.floor((decisions.operations.production[p.id] || 0) * productionScale);
  });

  // 3. Finished Goods Purchases
  const finishedGoodsPurchased: Record<ProductId, number> = {
    techbook: decisions.operations.reqFinishedGoods?.techbook || 0,
    zroid: decisions.operations.reqFinishedGoods?.zroid || 0,
    itab: decisions.operations.reqFinishedGoods?.itab || 0
  };

  // Available units per product
  const productAvailable: Record<ProductId, number> = {
    techbook: (team.inventory.techbook || 0) + scaledProduction.techbook + finishedGoodsPurchased.techbook,
    zroid: (team.inventory.zroid || 0) + scaledProduction.zroid + finishedGoodsPurchased.zroid,
    itab: (team.inventory.itab || 0) + scaledProduction.itab + finishedGoodsPurchased.itab
  };

  // 4. Entry Costs & Fixed Assets Capitalization
  let totalEntryCostCharged = 0;
  const activeMarkets = edition.markets.filter(m => {
    if (m.isHome) return true;
    return decisions.markets?.[m.id]?.active ?? false;
  });

  // Check if entry cost was charged previously
  activeMarkets.forEach(m => {
    if (m.isHome || m.entryCost <= 0) return;
    let previouslyActive = false;
    if (team.history) {
      Object.values(team.history).forEach(h => {
        if (h.gm?.byMarket?.[m.id]) {
          previouslyActive = true;
        }
      });
    }
    if (!previouslyActive) {
      const channel = decisions.markets?.[m.id]?.channel || (m.channelOptions.includes('DISTRIBUTOR') ? 'DISTRIBUTOR' : 'OWN');
      const actualEntryCost = (channel === 'DISTRIBUTOR' && m.distributorEntryCost != null)
        ? m.distributorEntryCost
        : (channel === 'DISTRIBUTOR' ? Math.round(m.entryCost * 0.4) : m.entryCost);
      totalEntryCostCharged += actualEntryCost;
    }
  });

  // 5. Multi-Market S-Curve Demand Calculation
  const marketSharesByMarket: Record<string, Record<ProductId, number>> = {};
  const demandByMarket: Record<string, Record<ProductId, number>> = {};
  const scoresByMarket: Record<string, Record<ProductId, number>> = {};

  activeMarkets.forEach(m => {
    marketSharesByMarket[m.id] = { techbook: 0, zroid: 0, itab: 0 };
    demandByMarket[m.id] = { techbook: 0, zroid: 0, itab: 0 };
    scoresByMarket[m.id] = { techbook: 0.5, zroid: 0.5, itab: 0.5 };

    const spots = getCurrencySpots(edition, m.currency, period);
    const mDec = decisions.markets?.[m.id];

    PRODUCTS.forEach(p => {
      const pKey = p.id;
      const localPrice = mDec?.prices?.[pKey] ?? (m.isHome ? decisions.marketing.prices[pKey] : 0);
      const priceZAREquivalent = m.currency === 'ZAR' ? localPrice : localPrice * spots.avgSpot;

      const priceAnchor = (MARKET_ANCHORS.price[pKey] || 3000) * m.priceIndex;
      const priceScore = sCurve(priceZAREquivalent, priceAnchor, false);

      const debtorDays = mDec?.debtorDays?.[pKey] ?? (m.isHome ? (decisions.finance.debtorsDays[pKey] || 30) : m.debtorDaysDefault);
      const termsScore = sCurve(debtorDays, MARKET_ANCHORS.paymentTerms, true);

      const features = (team.features?.[pKey] || 0) + (decisions.operations.rdSplits?.[pKey] || 0);
      const innovScore = sCurve(features, MARKET_ANCHORS.innovation, true);

      const prodAdBudget = decisions.marketing.advertisingBudget * (decisions.marketing.adSplits[pKey] || 0.25);
      const genAdBudget = decisions.marketing.advertisingBudget * (decisions.marketing.generalAdSplit || 0.25) / 3;
      const adScore = sCurve(prodAdBudget + genAdBudget, MARKET_ANCHORS.adSpend, true);

      const storesScore = sCurve(team.storeCount, MARKET_ANCHORS.stores, true);
      const agentsScore = sCurve(decisions.marketing.agentCommission, MARKET_ANCHORS.agents, true);
      const staffScore = sCurve(1.0, MARKET_ANCHORS.staff, true);

      const w = WEIGHTS[pKey] || { price: 3, terms: 1, innov: 2, ad: 2, stores: 1, agents: 1, staff: 1 };
      const totalW = w.price + w.terms + w.innov + w.ad + w.stores + w.agents + w.staff;
      const rawScore = (
        w.price * priceScore +
        w.terms * termsScore +
        w.innov * innovScore +
        w.ad * adScore +
        w.stores * storesScore +
        w.agents * agentsScore +
        w.staff * staffScore
      ) / totalW;

      scoresByMarket[m.id][pKey] = rawScore;
      const earnedShare = Math.min(0.50, Math.max(0.01, (0.16 * rawScore) / 0.5));
      marketSharesByMarket[m.id][pKey] = earnedShare;

      // Market size
      let marketSize = 0;
      if (m.isHome) {
        marketSize = getMarketSize(pKey, period);
      } else if (m.demandUnits) {
        const cagr = m.demandCagr || 0;
        marketSize = Math.round(m.demandUnits[pKey] * Math.pow(1 + cagr, period - 1));
      }
      marketSize = Math.round(marketSize * demandModifier);

      demandByMarket[m.id][pKey] = Math.round(earnedShare * marketSize);
    });
  });

  // 6. Unit Cost & Scarce Unit Allocation by Local Margin
  // Baseline unit costs: TechBook: 1800, Zroid: 2400, iTab: 3200
  const baseUnitCost: Record<ProductId, number> = {
    techbook: 1800 * materialCostModifier,
    zroid: 2400 * materialCostModifier,
    itab: 3200 * materialCostModifier
  };

  const unitsSoldByMarket: Record<string, Record<ProductId, number>> = {};
  const unfilledDemandByMarket: Record<string, Record<ProductId, number>> = {};
  activeMarkets.forEach(m => {
    unitsSoldByMarket[m.id] = { techbook: 0, zroid: 0, itab: 0 };
    unfilledDemandByMarket[m.id] = { techbook: 0, zroid: 0, itab: 0 };
  });

  PRODUCTS.forEach(p => {
    const pKey = p.id;
    let available = productAvailable[pKey] || 0;

    // Calculate gross margin per unit for each active market
    const marketMargins = activeMarkets.map(m => {
      const spots = getCurrencySpots(edition, m.currency, period);
      const mDec = decisions.markets?.[m.id];
      const localPrice = mDec?.prices?.[pKey] ?? (m.isHome ? decisions.marketing.prices[pKey] : 0);
      const grossPriceZAR = m.currency === 'ZAR' ? localPrice : localPrice * spots.avgSpot;
      const channel = mDec?.channel || 'DISTRIBUTOR';
      const distMargin = channel === 'DISTRIBUTOR' ? (m.distributorMargin || 0) : 0;
      const netRevZAR = grossPriceZAR * (1 - distMargin);
      const duty = m.importDuty || 0;
      const unitCostWithDuty = baseUnitCost[pKey] * (1 + duty);
      const unitMargin = netRevZAR - unitCostWithDuty;

      return {
        marketId: m.id,
        demanded: demandByMarket[m.id][pKey] || 0,
        unitMargin
      };
    });

    // Sort descending by unitMargin
    marketMargins.sort((a, b) => b.unitMargin - a.unitMargin);

    marketMargins.forEach(mm => {
      const fillable = Math.min(available, mm.demanded);
      unitsSoldByMarket[mm.marketId][pKey] = fillable;
      unfilledDemandByMarket[mm.marketId][pKey] = mm.demanded - fillable;
      available -= fillable;
    });
  });

  // 7. Multi-Market Revenue, COGS, and Currencies
  const revenueLocalByMarket: Record<string, number> = {};
  const revenueZARByMarket: Record<string, number> = {};
  const grossProfitZARByMarket: Record<string, number> = {};
  const cogsZARByMarket: Record<string, number> = {};

  let totalRevenueZAR = 0;
  let totalCOGSZAR = 0;
  const revenueByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
  const cogsByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
  const unitsSoldTotal: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };

  activeMarkets.forEach(m => {
    const spots = getCurrencySpots(edition, m.currency, period);
    const mDec = decisions.markets?.[m.id];
    let mRevLocal = 0;
    let mRevZAR = 0;
    let mCogsZAR = 0;

    PRODUCTS.forEach(p => {
      const pKey = p.id;
      const sold = unitsSoldByMarket[m.id][pKey] || 0;
      unitsSoldTotal[pKey] += sold;

      const localPrice = mDec?.prices?.[pKey] ?? (m.isHome ? decisions.marketing.prices[pKey] : 0);
      const lineRevLocal = sold * localPrice;
      mRevLocal += lineRevLocal;

      const channel = mDec?.channel || 'DISTRIBUTOR';
      const distMargin = channel === 'DISTRIBUTOR' ? (m.distributorMargin || 0) : 0;
      const netLineRevLocal = lineRevLocal * (1 - distMargin);
      const lineRevZAR = m.currency === 'ZAR' ? netLineRevLocal : netLineRevLocal * spots.avgSpot;
      mRevZAR += lineRevZAR;
      revenueByProduct[pKey] += lineRevZAR;

      const duty = m.importDuty || 0;
      const lineCogsZAR = sold * baseUnitCost[pKey] * (1 + duty);
      mCogsZAR += lineCogsZAR;
      cogsByProduct[pKey] += lineCogsZAR;
    });

    revenueLocalByMarket[m.id] = mRevLocal;
    revenueZARByMarket[m.id] = mRevZAR;
    cogsZARByMarket[m.id] = mCogsZAR;
    grossProfitZARByMarket[m.id] = mRevZAR - mCogsZAR;

    totalRevenueZAR += mRevZAR;
    totalCOGSZAR += mCogsZAR;
  });

  // 8. Exposures and Hedging Calculation
  // USD costs: Zen and Cheng purchases
  // Total components & FG from Zen and Cheng in ZAR at baseline USD spot 18.50
  const usdBaseSpot = edition.currencies.USD.spot ?? 18.50;
  const usdSpots = getCurrencySpots(edition, 'USD', period);

  // Estimate USD purchases
  let zenChengRandCost = 0;
  // TechBook: Zen 1200, Cheng 1160 comps, FG Cheng 1260
  // Zroid: Zen 1328 comps, Cheng 1328 comps, FG Zen 1860, Cheng 1860
  // iTab: Zen 1065 comps, FG Zen 1800, Cheng 1850
  const techbookZenChengUnits = (scaledProduction.techbook * 0.4) + (finishedGoodsPurchased.techbook * 0.6);
  const zroidZenChengUnits = (scaledProduction.zroid * 0.5) + (finishedGoodsPurchased.zroid * 0.7);
  const itabZenChengUnits = (scaledProduction.itab * 0.5) + (finishedGoodsPurchased.itab * 0.8);
  zenChengRandCost = (techbookZenChengUnits * 1250) + (zroidZenChengUnits * 1550) + (itabZenChengUnits * 1600);

  const usdCostsForeign = zenChengRandCost / usdBaseSpot;
  const ngnRevenueForeign = revenueLocalByMarket['ng'] || 0;
  const kesRevenueForeign = revenueLocalByMarket['ke'] || 0;

  const fundingCurr = decisions.treasury?.fundingCurrency || 'ZAR';
  const usdDebtForeign = fundingCurr === 'USD' ? (team.longTermDebt / usdBaseSpot) : 0;

  const exposuresData: GlobalMarketsRecord['exposures'] = {};

  const exposureList: Array<{ id: string; curr: string; isPayable: boolean; amount: number }> = [
    { id: 'USD_COSTS', curr: 'USD', isPayable: true, amount: usdCostsForeign },
    { id: 'NGN_REVENUE', curr: 'NGN', isPayable: false, amount: ngnRevenueForeign },
    { id: 'KES_REVENUE', curr: 'KES', isPayable: false, amount: kesRevenueForeign },
    { id: 'USD_DEBT', curr: 'USD', isPayable: true, amount: usdDebtForeign }
  ];

  let totalHedgeCostOrGainPayables = 0;
  let totalHedgeCostOrGainReceivables = 0;
  let totalOverhedgeGainLoss = 0;

  exposureList.forEach(exp => {
    const spots = getCurrencySpots(edition, exp.curr, period);
    const hedgeDec = decisions.treasury?.hedges?.[exp.id];
    let coverPct = hedgeDec?.coverPct ?? 0;
    let tenorMonths = hedgeDec?.tenorMonths ?? 12;

    // Reject 12m for KES_REVENUE if configured max is 6m
    if (exp.id === 'KES_REVENUE' && tenorMonths > 6) {
      tenorMonths = 6;
    }

    const forwardRate = calculateForwardRate(spots.openSpot, spots.rateZAR, spots.rateForeign, tenorMonths);
    const coveredAmount = (exp.amount * coverPct) / 100;
    const avgSpot = spots.avgSpot;

    // Counterfactual: 0% hedged at avgSpot
    const counterfactual = exp.amount * avgSpot;

    // Sign convention per §5.3:
    // for a payable (USD_COSTS, USD_DEBT) a positive (forwardRate - avgSpot) is a cost
    // for a receivable (NGN_REVENUE, KES_REVENUE) a positive (forwardRate - avgSpot) is a gain
    const diff = forwardRate - avgSpot;
    let hedgeCostOrGain = 0;
    if (exp.isPayable) {
      hedgeCostOrGain = coveredAmount * diff; // positive = cost
      totalHedgeCostOrGainPayables += hedgeCostOrGain;
    } else {
      hedgeCostOrGain = coveredAmount * diff; // positive = gain (or negative = loss/locked devaluation)
      totalHedgeCostOrGainReceivables += hedgeCostOrGain;
    }

    // Over-hedging excess calculation
    let overHedged = 0;
    if (coveredAmount > exp.amount) {
      overHedged = coveredAmount - exp.amount;
      const excessImpact = overHedged * diff;
      totalOverhedgeGainLoss += excessImpact;
    }

    exposuresData[exp.id] = {
      exposureForeign: exp.amount,
      coverPct,
      forwardRate,
      avgSpot,
      hedgeCostOrGain,
      counterfactual,
      overHedged
    };
  });

  // Adjust COGS and Revenue for hedging
  // USD costs hedge cost/gain adjusts COGS: if forwardRate > avgSpot, you paid hedge cost
  // If no hedge (coverPct = 0), the movement from baseline 18.50 to avgSpot lands in COGS:
  // Base rand cost was at 18.50. Realized cost = usdCostsForeign * avgSpot (or forward).
  const usdCogsAdjustment = usdCostsForeign * (usdSpots.avgSpot - usdBaseSpot) + (exposuresData['USD_COSTS']?.hedgeCostOrGain || 0);
  totalCOGSZAR += usdCogsAdjustment;

  // NGN and KES hedging adjustment:
  const ngnHedgeAdj = exposuresData['NGN_REVENUE']?.hedgeCostOrGain || 0;
  const kesHedgeAdj = exposuresData['KES_REVENUE']?.hedgeCostOrGain || 0;
  totalRevenueZAR += (ngnHedgeAdj + kesHedgeAdj);

  // 9. Opex & Staff
  const storeRunCost = team.storeCount * 250000;
  const storeTransCost = Math.abs(decisions.marketing.openCloseStores) * 500000;
  const agentComm = totalRevenueZAR * decisions.marketing.agentCommission;
  const marketingSpend = decisions.marketing.advertisingBudget;
  const rdSpend = decisions.operations.rdBudget;

  const defaultSalaries: Record<HRRole, number> = {
    engineers: 45000,
    technicians: 20000,
    semiSkilled: 15000,
    adminSales: 15000,
    customerService: 10000
  };

  let payroll = 0;
  let training = 0;
  (Object.keys(team.staffCounts) as HRRole[]).forEach(r => {
    const count = team.staffCounts[r] || 0;
    const sal = decisions.hr.salaries[r] ?? defaultSalaries[r];
    payroll += count * sal * 12;
    const tLevel = decisions.hr.trainingLevels[r] || 'None';
    const tCost = tLevel === 'Basic' ? 2000 : tLevel === 'Moderate' ? 5000 : tLevel === 'Advanced' ? 10000 : 0;
    training += count * tCost;
  });

  const otherOpex = 5000000;
  const totalOpex = marketingSpend + storeRunCost + storeTransCost + agentComm + payroll + training + rdSpend + otherOpex;

  // 10. EBITDA & Depreciation
  const grossProfit = totalRevenueZAR - totalCOGSZAR;
  const ebitda = grossProfit - totalOpex;
  const depreciation = Math.round(team.factoryCapacity * 150);
  const ebit = ebitda - depreciation;

  // 11. Funding, Credit Grade & Interest (§6)
  const prevRec = team.history?.[period - 1] || team.history?.[String(period - 1)];
  const prevNetDebt = prevRec ? ((prevRec.balanceSheet?.longTermDebt || 0) + Math.max(0, -(prevRec.balanceSheet?.cash || 0))) : 0;
  const prevEbitda = prevRec?.ebitda || 1;
  const prevLeverage = prevEbitda > 0 ? (prevNetDebt / prevEbitda) : 99;

  const prevActualNP = prevRec?.netProfit || 0;
  const prevPlannedNP = prevRec?.gm?.scorecard?.planVariance !== undefined ? (team.draftDecisions?.treasury?.plannedNetProfit || 0) : 0;
  const prevPlanVariance = prevPlannedNP !== 0 ? Math.abs(prevActualNP - prevPlannedNP) / Math.abs(prevPlannedNP) : 0.20;

  let creditGrade = 'B';
  if (period === 1) {
    creditGrade = 'B';
  } else {
    for (const g of edition.funding.creditGrades) {
      if (prevLeverage <= g.maxLeverage && prevPlanVariance <= g.maxPlanVariance) {
        creditGrade = g.id;
        break;
      }
    }
  }

  const gradeMargin = edition.funding.creditGrades.find(g => g.id === creditGrade)?.margin ?? 0.020;
  const baseRate = edition.funding.rates[fundingCurr] ?? 0.115;
  const rateBasis = decisions.treasury?.rateBasis || 'FIXED';
  const basisAdjustment = rateBasis === 'FIXED' ? edition.funding.fixedPremium : (edition.funding.floatingPath[period - 1] ?? 0);

  // Check previous covenant breach
  const prevBreached = (prevRec?.gm?.covenants?.breached?.length || 0) > 0;
  const covenantPenalty = prevBreached ? edition.covenants.breachPenaltyMargin : 0;

  const longTermDebtRate = baseRate + gradeMargin + basisAdjustment + covenantPenalty;

  // USD Debt Revaluation
  let fxRevaluation = 0;
  let closingDebt = team.longTermDebt + decisions.finance.debtChange;

  if (fundingCurr === 'USD') {
    const debtUSD_open = team.longTermDebt / usdSpots.openSpot;
    const debtChangeUSD = decisions.finance.debtChange / usdSpots.openSpot;
    const debtUSD_close = debtUSD_open + debtChangeUSD;
    closingDebt = debtUSD_close * usdSpots.closeSpot;
    fxRevaluation = debtUSD_close * (usdSpots.closeSpot - usdSpots.openSpot);
  }

  const debtInterest = closingDebt * longTermDebtRate;
  const overdraftInterest = team.cashBalance < 0 ? Math.abs(team.cashBalance) * FINANCE_CONSTANTS.overdraftInterestRate : 0;
  const totalInterest = debtInterest + overdraftInterest;

  // EBT, Tax, Net Profit
  // Unrealised FX revaluation loss increases expense, so subtracts from EBT
  const ebt = ebit - totalInterest - fxRevaluation;
  const tax = ebt > 0 ? ebt * FINANCE_CONSTANTS.taxRate : 0;
  const netProfit = ebt - tax;

  // 12. Balance Sheet & Cash Flow
  const newPPE = Math.max(0, (team.history?.[0]?.balanceSheet?.fixedAssets || 120000000) + totalEntryCostCharged - (depreciation * period));
  const newInventoryValue = Math.round(
    (productAvailable.techbook - (unitsSoldTotal.techbook || 0)) * baseUnitCost.techbook +
    (productAvailable.zroid - (unitsSoldTotal.zroid || 0)) * baseUnitCost.zroid +
    (productAvailable.itab - (unitsSoldTotal.itab || 0)) * baseUnitCost.itab
  );

  const avgDebtorDays = (activeMarkets.reduce((sum, m) => sum + (decisions.markets?.[m.id]?.debtorDays?.techbook || m.debtorDaysDefault), 0) / activeMarkets.length) || 45;
  const newReceivables = Math.round((totalRevenueZAR * avgDebtorDays) / 365);
  const newCreditors = Math.round((totalCOGSZAR * 45) / 365);

  const operatingCashFlow = ebitda - (totalInterest) - tax - (newReceivables - (prevRec?.balanceSheet?.receivables || newReceivables * 0.8));
  const investingCashFlow = -totalEntryCostCharged;
  const financingCashFlow = decisions.finance.debtChange + decisions.finance.equityChange - (prevBreached ? 0 : decisions.finance.dividends);
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
  const closingCash = team.cashBalance + netCashFlow;

  const closingEquity = (team.shareholdersEquity || 341050070) + netProfit - (prevBreached ? 0 : decisions.finance.dividends);

  // 13. Covenants Testing (§7)
  const netDebt = closingDebt + Math.max(0, -closingCash);
  const netDebtToEbitda = ebitda > 0 ? (netDebt / ebitda) : (netDebt > 0 ? 99 : 0);
  const interestCover = totalInterest > 0 ? ((ebt + totalInterest) / totalInterest) : 99;

  const breached: string[] = [];
  if (netDebtToEbitda > edition.covenants.netDebtToEbitda.max) {
    breached.push('netDebtToEbitda');
  }
  if (interestCover < edition.covenants.interestCover.min) {
    breached.push('interestCover');
  }

  // 14. Value Creation & Economic Profit per Market (§9)
  const byMarketData: GlobalMarketsRecord['byMarket'] = {};
  let totalEconomicProfit = 0;

  activeMarkets.forEach(m => {
    const revLocal = revenueLocalByMarket[m.id] || 0;
    const revZAR = revenueZARByMarket[m.id] || 0;
    const gpZAR = grossProfitZARByMarket[m.id] || 0;
    const marketWacc = FINANCE_CONSTANTS.wacc + m.countryRiskPremium;

    // Invested capital: entry cost + working capital
    const mDec = decisions.markets?.[m.id];
    const channel = mDec?.channel || (m.channelOptions.includes('DISTRIBUTOR') ? 'DISTRIBUTOR' : 'OWN');
    const effectiveEntryCost = (channel === 'DISTRIBUTOR' && m.distributorEntryCost != null)
      ? m.distributorEntryCost
      : (channel === 'DISTRIBUTOR' ? Math.round(m.entryCost * 0.4) : m.entryCost);
    const marketFixedAssets = m.isHome ? newPPE * 0.7 : (effectiveEntryCost * Math.max(0, 1 - 0.10 * (period - 1)));
    const marketReceivables = Math.round((revZAR * m.debtorDaysDefault) / 365);
    const marketInv = Math.round((newInventoryValue * (revZAR / Math.max(1, totalRevenueZAR))));
    const marketInvestedCapital = Math.max(1000000, marketFixedAssets + marketReceivables + marketInv);

    const marketEbit = gpZAR - (totalOpex * (revZAR / Math.max(1, totalRevenueZAR)));
    const marketNOPAT = marketEbit * (1 - FINANCE_CONSTANTS.taxRate);
    const capitalCharge = marketInvestedCapital * marketWacc;
    const economicProfit = marketNOPAT - capitalCharge;
    totalEconomicProfit += economicProfit;

    const trappedCash = m.repatriationPct < 1.0 ? revZAR * (1 - m.repatriationPct) : 0;

    byMarketData[m.id] = {
      revenueLocal: revLocal,
      revenueZAR: revZAR,
      unitsSold: { ...unitsSoldByMarket[m.id] },
      unfilledDemand: { ...unfilledDemandByMarket[m.id] },
      grossProfitZAR: gpZAR,
      investedCapital: marketInvestedCapital,
      wacc: marketWacc,
      economicProfit,
      trappedCash
    };
  });

  // 15. Scorecard (§9.2)
  const cashConversion = Math.max(-1, Math.min(2, ebitda > 0 ? (operatingCashFlow / ebitda) : 0));
  const plannedNetProfit = decisions.treasury?.plannedNetProfit ?? 0;
  const planVariance = plannedNetProfit !== 0
    ? Math.max(0, 1 - Math.abs(netProfit - plannedNetProfit) / Math.max(Math.abs(plannedNetProfit), 1))
    : 0;

  const gmRecord: GlobalMarketsRecord = {
    byMarket: byMarketData,
    exposures: exposuresData,
    funding: {
      currency: fundingCurr,
      rate: longTermDebtRate,
      creditGrade,
      fxRevaluation
    },
    covenants: {
      netDebtToEbitda,
      interestCover,
      breached
    },
    scorecard: {
      economicProfit: totalEconomicProfit,
      cashConversion,
      planVariance,
      plannedNetProfit
    }
  };

  // 16. CSAT and ESAT (calibrated multi-market customer & employee satisfaction engine)
  const prevPeriodRecord = prevRec;
  const prevESAT = prevPeriodRecord?.kpis?.employeeSatisfaction ?? 0.70;

  const DEFAULT_SALARIES: Record<HRRole, number> = {
    engineers: 45000,
    technicians: 20000,
    semiSkilled: 15000,
    adminSales: 15000,
    customerService: 10000
  };
  const oldSalaries = prevPeriodRecord?.salaries ?? DEFAULT_SALARIES;

  let totalStaffCount = 0;
  let sumSalaryChange = 0;
  let sumTrainingFactor = 0;
  let sumUtilization = 0;

  const prodWorkload = staffBasedCapacity > 0 ? (plannedTotalProduction / staffBasedCapacity) : (plannedTotalProduction > 0 ? 2.0 : 1.0);
  const requiredEngineers = Math.ceil(decisions.operations.rdBudget / 200000 + Math.abs(decisions.operations.capacityChange) / 1000) || 1;
  const requiredAdmin = Math.ceil(totalRevenueZAR / 10000000) || 10;

  let totalSalesUnits = 0;
  activeMarkets.forEach(m => {
    PRODUCTS.forEach(p => {
      totalSalesUnits += unitsSoldByMarket[m.id]?.[p.id] || 0;
    });
  });
  const requiredCS = Math.ceil(totalSalesUnits / 1000) || 20;

  const utilizationByRole: Record<HRRole, number> = {
    engineers: team.staffCounts.engineers > 0 ? (requiredEngineers / team.staffCounts.engineers) : 1.0,
    technicians: prodWorkload,
    semiSkilled: prodWorkload,
    adminSales: team.staffCounts.adminSales > 0 ? (requiredAdmin / team.staffCounts.adminSales) : 1.0,
    customerService: team.staffCounts.customerService > 0 ? (requiredCS / team.staffCounts.customerService) : 1.0
  };

  (Object.keys(team.staffCounts) as HRRole[]).forEach(r => {
    const count = team.staffCounts[r] || 0;
    if (count <= 0) return;

    totalStaffCount += count;

    const oldSal = oldSalaries[r] ?? DEFAULT_SALARIES[r];
    const newSal = decisions.hr.salaries[r] ?? oldSal;
    const change = oldSal > 0 ? (newSal - oldSal) / oldSal : 0;
    sumSalaryChange += change * count;

    const trainLevel = decisions.hr.trainingLevels[r] || 'None';
    const tf = trainingFactorByLevel[trainLevel] ?? 0.0;
    sumTrainingFactor += tf * count;

    const ut = utilizationByRole[r] ?? 1.0;
    sumUtilization += ut * count;
  });

  const weightedSalaryChange = totalStaffCount > 0 ? Math.max(-0.20, Math.min(0.50, sumSalaryChange / totalStaffCount)) : 0;
  const weightedTrainingFactor = totalStaffCount > 0 ? (sumTrainingFactor / totalStaffCount) : 0;
  const weightedUtilization = totalStaffCount > 0 ? (sumUtilization / totalStaffCount) : 1.0;

  const salaryEffect = weightedSalaryChange >= 0 ? 0.20 * weightedSalaryChange : 0.40 * weightedSalaryChange;
  const utilizationEffect = weightedUtilization > 1.0 ? 0.25 * (weightedUtilization - 1.0) : 0.0;
  const utilizationBonus = weightedUtilization < 1.0 ? 0.15 * (1.0 - weightedUtilization) : 0.0;

  const targetESAT = 0.72 + salaryEffect + (0.50 * weightedTrainingFactor) - utilizationEffect + utilizationBonus;
  const calculatedESAT = prevESAT * 0.60 + targetESAT * 0.40;

  const esatChangeVal = calculatedESAT - prevESAT;
  const limitedESAT = prevESAT + Math.max(-0.08, Math.min(0.08, esatChangeVal));
  const finalESAT = Math.min(0.95, Math.max(0.10, limitedESAT));

  // Customer Satisfaction (CSAT) across active markets
  let totalSalesUnitsForCSAT = 0;
  let sumProductCSAT = 0;
  activeMarkets.forEach(m => {
    PRODUCTS.forEach(p => {
      const sold = unitsSoldByMarket[m.id]?.[p.id] || 0;
      const score = scoresByMarket[m.id]?.[p.id] ?? 0.5;
      sumProductCSAT += score * sold;
      totalSalesUnitsForCSAT += sold;
    });
  });
  const weightedCustomerScore = totalSalesUnitsForCSAT > 0 ? (sumProductCSAT / totalSalesUnitsForCSAT) : 0.5;
  const prevCSAT = prevPeriodRecord?.kpis?.customerSatisfaction ?? 0.70;

  let totalSalesDemand = 0;
  let sumStockoutPenalty = 0;
  activeMarkets.forEach(m => {
    PRODUCTS.forEach(p => {
      const dem = demandByMarket[m.id]?.[p.id] || 0;
      const sold = unitsSoldByMarket[m.id]?.[p.id] || 0;
      const stockoutRatio = dem > 0 ? (sold / dem) : 1.0;
      const penalty = stockoutRatio < 1.0 ? 0.02 + 0.10 * (1.0 - stockoutRatio) : 0.0;
      sumStockoutPenalty += penalty * dem;
      totalSalesDemand += dem;
    });
  });
  const avgStockoutPenalty = totalSalesDemand > 0 ? (sumStockoutPenalty / totalSalesDemand) : 0.0;

  const csAgentRatio = requiredCS > 0 ? (team.staffCounts.customerService / requiredCS) : 1.0;
  const csAgentEffect = csAgentRatio >= 1.0 ? Math.min(0.06, 0.02 + 0.03 * (csAgentRatio - 1.0)) : -0.10 * (1.0 - csAgentRatio);

  const targetCSAT = 0.54 + 0.44 * weightedCustomerScore + csAgentEffect;
  const calculatedCSAT = prevCSAT * 0.60 + targetCSAT * 0.40;

  const csatChangeVal = calculatedCSAT - prevCSAT;
  const limitedCSAT = prevCSAT + Math.max(-0.09, Math.min(0.09, csatChangeVal));
  const finalCSAT = Math.min(0.95, Math.max(0.10, limitedCSAT - avgStockoutPenalty));

  const newKPIs: KPI = {
    revenue: totalRevenueZAR,
    netProfit,
    marketShare: {
      techbook: marketSharesByMarket['za']?.techbook || 0.125,
      zroid: marketSharesByMarket['za']?.zroid || 0.125,
      itab: marketSharesByMarket['za']?.itab || 0.125
    },
    customerSatisfaction: finalCSAT,
    employeeSatisfaction: finalESAT
  };

  const periodRecord: PeriodRecord = {
    period,
    revenue: { total: totalRevenueZAR, byProduct: revenueByProduct },
    cogs: { total: totalCOGSZAR, byProduct: cogsByProduct },
    grossProfit: {
      total: grossProfit,
      byProduct: {
        techbook: revenueByProduct.techbook - cogsByProduct.techbook,
        zroid: revenueByProduct.zroid - cogsByProduct.zroid,
        itab: revenueByProduct.itab - cogsByProduct.itab
      }
    },
    opex: {
      marketing: marketingSpend,
      store: storeRunCost + storeTransCost,
      agents: agentComm,
      payroll,
      training,
      rd: rdSpend,
      other: otherOpex,
      total: totalOpex
    },
    ebitda,
    depreciation,
    interest: totalInterest,
    ebt,
    tax,
    netProfit,
    balanceSheet: {
      cash: closingCash,
      receivables: newReceivables,
      inventory: newInventoryValue,
      fixedAssets: newPPE,
      totalAssets: closingCash + newReceivables + newInventoryValue + newPPE,
      equity: closingEquity,
      longTermDebt: closingDebt,
      currentLiabilities: newCreditors,
      totalLiabilitiesAndEquity: closingEquity + closingDebt + newCreditors
    },
    cashFlow: {
      operating: operatingCashFlow,
      investing: investingCashFlow,
      financing: financingCashFlow,
      net: netCashFlow
    },
    debtorDays: {
      techbook: decisions.finance.debtorsDays.techbook || 30,
      zroid: decisions.finance.debtorsDays.zroid || 30,
      itab: decisions.finance.debtorsDays.itab || 30
    },
    creditorDays: 45,
    interestCoverage: interestCover,
    kpis: newKPIs,
    prices: decisions.marketing.prices,
    salaries: decisions.hr.salaries,
    features: team.features,
    staffCounts: { ...team.staffCounts },
    market: {
      marketSize: {
        techbook: getMarketSize('techbook', period),
        zroid: getMarketSize('zroid', period),
        itab: getMarketSize('itab', period)
      },
      forecastUnits: {
        techbook: Math.round(((decisions.marketing.forecastedMarketShare?.techbook || 0) / 100) * getMarketSize('techbook', period)),
        zroid: Math.round(((decisions.marketing.forecastedMarketShare?.zroid || 0) / 100) * getMarketSize('zroid', period)),
        itab: Math.round(((decisions.marketing.forecastedMarketShare?.itab || 0) / 100) * getMarketSize('itab', period))
      },
      demandUnits: {
        techbook: demandByMarket['za']?.techbook || 0,
        zroid: demandByMarket['za']?.zroid || 0,
        itab: demandByMarket['za']?.itab || 0
      },
      actualUnits: {
        techbook: unitsSoldTotal.techbook || 0,
        zroid: unitsSoldTotal.zroid || 0,
        itab: unitsSoldTotal.itab || 0
      },
      availableUnits: {
        techbook: productAvailable.techbook || 0,
        zroid: productAvailable.zroid || 0,
        itab: productAvailable.itab || 0
      },
      actualShare: {
        techbook: marketSharesByMarket['za']?.techbook || 0,
        zroid: marketSharesByMarket['za']?.zroid || 0,
        itab: marketSharesByMarket['za']?.itab || 0
      },
      valueScore: {
        techbook: scoresByMarket['za']?.techbook || 0.5,
        zroid: scoresByMarket['za']?.zroid || 0.5,
        itab: scoresByMarket['za']?.itab || 0.5
      },
      valueScoreExPrice: {
        techbook: scoresByMarket['za']?.techbook || 0.5,
        zroid: scoresByMarket['za']?.zroid || 0.5,
        itab: scoresByMarket['za']?.itab || 0.5
      }
    },
    gm: gmRecord
  };

  const newTeamState: Team = {
    ...team,
    currentPeriod: period + 1,
    cashBalance: closingCash,
    longTermDebt: closingDebt,
    shareholdersEquity: closingEquity,
    inventory: {
      techbook: Math.max(0, productAvailable.techbook - (unitsSoldTotal.techbook || 0)),
      zroid: Math.max(0, productAvailable.zroid - (unitsSoldTotal.zroid || 0)),
      itab: Math.max(0, productAvailable.itab - (unitsSoldTotal.itab || 0))
    }
  };

  return {
    newTeamState,
    kpis: newKPIs,
    periodRecord
  };
}
