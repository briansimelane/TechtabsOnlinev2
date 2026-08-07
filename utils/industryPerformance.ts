import { Team, ProductId, HRRole, TrainingLevel, TurnDecisions } from '../types';
import { INITIAL_DECISIONS, STORE_COSTS, SUPPLIER_METRICS, FINANCE_CONSTANTS, getMarketSize, COMPONENT_COSTS, FINISHED_GOODS_COSTS } from '../constants';
import { computeMarketShareBackModel, getScaledProduction } from './marketShareBackModel';

export function getSupplierComponentCost(productId: ProductId, supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  const baseCost = overrides?.componentCosts?.[productId]?.[supplier] ?? COMPONENT_COSTS[productId]?.[supplier] ?? (productId === 'techbook' ? 450 : (productId === 'zroid' ? 400 : 350));
  const discount = overrides?.discounts?.[supplier] ?? (dec?.negotiation?.status === 'AGREED' && dec?.negotiation?.selectedSupplierId === supplier ? dec.negotiation.agreedDiscount : 0);
  return Math.round(baseCost * (1 - discount));
}

export function getSupplierFinishedGoodsCost(productId: ProductId, supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  const baseCost = overrides?.finishedGoodsCosts?.[productId]?.[supplier] ?? FINISHED_GOODS_COSTS[productId]?.[supplier] ?? (productId === 'techbook' ? 1400 : (productId === 'zroid' ? 1200 : 1000));
  const discount = overrides?.discounts?.[supplier] ?? (dec?.negotiation?.status === 'AGREED' && dec?.negotiation?.selectedSupplierId === supplier ? dec.negotiation.agreedDiscount : 0);
  return Math.round(baseCost * (1 - discount));
}

export function getSupplierPaymentTerms(supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  return overrides?.paymentTerms?.[supplier] ?? (dec?.negotiation?.status === 'AGREED' && dec?.negotiation?.selectedSupplierId === supplier ? dec.negotiation.agreedPaymentTerms : (SUPPLIER_METRICS as any)[supplier]?.terms ?? 30);
}

export function getSupplierQuality(supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  return overrides?.quality?.[supplier] ?? (SUPPLIER_METRICS as any)[supplier]?.quality ?? 7;
}

export function getSupplierInnovation(supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  return overrides?.innovation?.[supplier] ?? (SUPPLIER_METRICS as any)[supplier]?.innovation ?? 6;
}

export function getSupplierLeadTime(supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  return overrides?.leadTime?.[supplier] ?? (SUPPLIER_METRICS as any)[supplier]?.leadTime ?? 5;
}

export function getSupplierService(supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  return overrides?.service?.[supplier] ?? (SUPPLIER_METRICS as any)[supplier]?.service ?? 7;
}

export function getSupplierCapacity(supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  return overrides?.capacity?.[supplier] ?? (SUPPLIER_METRICS as any)[supplier]?.capacity ?? 6;
}

export function getSupplierDeliveryReliability(supplier: string, dec?: TurnDecisions): number {
  const overrides = dec?.supplierOverrides;
  return overrides?.deliveryReliability?.[supplier] ?? 0.95;
}

export interface TeamIndustryPerformance {
  teamId: string;
  teamName: string;

  // Revenue & COGS
  revenueByProduct: Record<ProductId, number>;
  totalRevenue: number;
  cogsByProduct: Record<ProductId, number>;
  totalCogs: number;
  grossProfit: number;
  gpMargin: number;                    // % — grossProfit / totalRevenue * 100

  // Operating expenses — the exact seven Industry Performance rows
  opex: {
    marketing: number;                 // "Advertising & Marketing"
    store: number;                     // "Store Costs"
    payroll: number;                   // "Payroll (Salaries)"
    rd: number;                        // "R & D (Innovation)"
    agents: number;                    // "Agent Commissions"
    training: number;                  // "Staff Development (Training)"
    other: number;                     // "Other Operational Expenses"
    total: number;                     // "Total Operating Expenses"
  };

  ebitda: number;
  depreciation: number;
  financeCharges: number;
  ebt: number;
  taxation: number;
  netProfit: number;
  npMargin: number;                    // %
  equity: number;                      // from getTeamBalance
  roe: number;                         // %

  // Units — the Demand & Inventory Units Breakdown rows
  units: Record<ProductId, {
    marketSize: number;                // getMarketSize(pId, period)
    forecast: number;                  // "Demand Forecasted (Units)"
    demand: number;                    // "Demand Earned (Units)"
    available: number;                 // "Available Units (Stock)"
    actual: number;                    // "Actual Units Sold"
  }>;

  // Market Data
  totalScore: Record<ProductId, number>;   // "Total Scores" row
  marketShare: Record<ProductId, number>;  // "Market Share Earned" row, 0–1
  price: Record<ProductId, number>;

  // Staff — for Employee Utilisation
  staffCounts: Record<HRRole, number>;     // opening + hiring decision
  trainingLevels: Record<HRRole, TrainingLevel>;
  unitsProduced: number;                   // scaled production, all products
  unitsSold: number;                       // all products
}

export function computeIndustryPerformance(
  teams: Team[],
  period: number
): TeamIndustryPerformance[] {
  const activeTeams = teams
    .filter(t => !t.isArchived)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (activeTeams.length === 0) {
    return [];
  }

  const backModelResults = computeMarketShareBackModel(activeTeams, period);

  return activeTeams.map((t, tIdx) => {
    const dec = t.draftDecisions || INITIAL_DECISIONS;

    // Calculate Revenue & COGS based on backModel simulation results
    let techbookRev = 0, zroidRev = 0, itabRev = 0;
    let techbookCogsVal = 0, zroidCogsVal = 0, itabCogsVal = 0;

    // Direct Labor Cost per unit calculation
    const totalProdUnits = (dec.operations?.production?.techbook || 0) + (dec.operations?.production?.zroid || 0) + (dec.operations?.production?.itab || 0);
    const techCount = (t.staffCounts?.technicians || 150) + (dec.hr?.hiring?.technicians || 0);
    const semiCount = (t.staffCounts?.semiSkilled || 200) + (dec.hr?.hiring?.semiSkilled || 0);
    const techSalary = dec.hr?.salaries?.technicians || 38000;
    const semiSalary = dec.hr?.salaries?.semiSkilled || 30000;
    const totalProdStaffCost = (techCount * techSalary + semiCount * semiSalary) * 8;
    const laborCostPerUnit = totalProdUnits > 0 ? (totalProdStaffCost / totalProdUnits) : 350;

    const pKeys: ProductId[] = ['techbook', 'zroid', 'itab'];
    pKeys.forEach(pId => {
      const res = backModelResults.find(r => r.productId === pId);
      const unitsSold = res ? (res.unitsSoldByTeam[tIdx] || 0) : 0;
      const price = dec.marketing?.prices?.[pId] ?? 0;
      const rev = unitsSold * price;

      // Procurement Component Cost
      let componentCost = pId === 'techbook' ? 1200 : (pId === 'zroid' ? 1400 : 1000);
      const alloc = dec.procurement?.supplierAllocation?.[pId];
      if (alloc) {
        let compSum = 0;
        let compCount = 0;
        Object.entries(alloc).forEach(([supId, val]: [string, any]) => {
          if (val && val.components > 0) {
            const supPrice = getSupplierComponentCost(pId, supId, dec);
            compSum += supPrice * val.components;
            compCount += val.components;
          }
        });
        if (compCount > 0) {
          componentCost = compSum / compCount;
        }
      }

      const unitCogs = componentCost + laborCostPerUnit;
      const cogs = unitsSold * unitCogs;

      if (pId === 'techbook') { techbookRev = rev; techbookCogsVal = cogs; }
      else if (pId === 'zroid') { zroidRev = rev; zroidCogsVal = cogs; }
      else { itabRev = rev; itabCogsVal = cogs; }
    });

    const totalRev = techbookRev + zroidRev + itabRev;
    const totalCogs = techbookCogsVal + zroidCogsVal + itabCogsVal;
    const grossProfit = totalRev - totalCogs;
    const gpMargin = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;

    // 1. Dynamic Marketing & Advertising Spend
    const adMkt = dec.marketing?.advertisingBudget ?? 12500000;

    // 2. Dynamic Store Costs (Running + Opening/Closing)
    const openCloseStores = dec.marketing?.openCloseStores ?? 0;
    const finalStoreCount = Math.max(0, (t.storeCount || 5) + openCloseStores);
    const storeRunCost = finalStoreCount * STORE_COSTS.running;
    const storeTransCost = openCloseStores > 0 
      ? openCloseStores * STORE_COSTS.opening 
      : (openCloseStores < 0 ? Math.abs(openCloseStores) * STORE_COSTS.closing : 0);
    const storeCost = storeRunCost + storeTransCost;

    // 3. Dynamic Agent Commission (52% channel sales * commission rate decimal)
    const agentSales = totalRev * 0.52;
    const agentCommRate = dec.marketing?.agentCommission ?? 0;
    const agentComm = Math.round(agentSales * agentCommRate);

    // 4. Dynamic HR Payroll & Training
    let opexPayroll = 0;
    let opexTraining = 0;
    const hrRoles: HRRole[] = ['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'];
    const baseStaffCounts: Record<HRRole, number> = { engineers: 50, technicians: 150, semiSkilled: 200, adminSales: 40, customerService: 20 };
    const baseSalaries: Record<HRRole, number> = { engineers: 55000, technicians: 38000, semiSkilled: 30000, adminSales: 20000, customerService: 9250 };
    const trainingCosts: Record<string, number> = { None: 0, Basic: 5000, Advanced: 15000, Specialized: 30000 };

    const staffCountsMap: Record<HRRole, number> = { engineers: 0, technicians: 0, semiSkilled: 0, adminSales: 0, customerService: 0 };
    const trainingLevelsMap: Record<HRRole, TrainingLevel> = { engineers: 'None', technicians: 'None', semiSkilled: 'None', adminSales: 'None', customerService: 'None' };

    hrRoles.forEach(r => {
      const count = (t.staffCounts?.[r] ?? baseStaffCounts[r] ?? 0) + (dec.hr?.hiring?.[r] ?? 0);
      const monthlySalary = dec.hr?.salaries?.[r] ?? baseSalaries[r] ?? 0;
      const trainingLevel = dec.hr?.trainingLevels?.[r] ?? 'None';
      const trCostPer = trainingCosts[trainingLevel] || 0;

      staffCountsMap[r] = count;
      trainingLevelsMap[r] = trainingLevel;

      opexTraining += count * trCostPer;

      if (r !== 'technicians' && r !== 'semiSkilled') {
        opexPayroll += count * monthlySalary * 8;
      }
    });

    // 5. Dynamic R&D / Innovation Budget
    const rdCost = (dec.operations as any)?.innovationBudget ?? dec.operations?.rdBudget ?? 4000000;

    // 6. Dynamic Other Operational Expenses
    const sumOtherExpenses = adMkt + storeCost + agentComm + opexPayroll + opexTraining + rdCost;
    const otherOpex = Math.round(sumOtherExpenses * 0.0797);

    const totalOpEx = sumOtherExpenses + otherOpex;

    const ebitda = grossProfit - totalOpEx;
    const depr = 1535965;
    const forecastedLongTermDebt = Math.max(0, (t.longTermDebt || 50000000) + (dec.finance?.debtChange || 0));
    const startCash = t.cashBalance || 0;
    const overdraftInterest = startCash < 0 ? Math.round(Math.abs(startCash) * (FINANCE_CONSTANTS?.overdraftInterestRate || 0.15)) : 0;
    const debtInterest = forecastedLongTermDebt > 0 ? Math.round(forecastedLongTermDebt * (FINANCE_CONSTANTS?.interestRate || 0.065)) : 0;
    const finCharges = debtInterest + overdraftInterest;
    const ebt = ebitda - depr - finCharges;
    const taxation = ebt > 0 ? Math.round(ebt * (FINANCE_CONSTANTS?.taxRate || 0.28)) : 0;
    const netProfit = ebt - taxation;
    const npMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

    // Balance Sheet Equity & ROE
    const openEq = t.shareholdersEquity || 286564937;
    const equityChange = dec.finance?.equityChange || 0;
    const dividends = dec.finance?.dividends || 0;
    const equity = openEq + equityChange - dividends + netProfit;
    const roe = equity > 0 ? (netProfit / equity) * 100 : 0;

    // Units breakdown
    const unitsMap: Record<ProductId, { marketSize: number; forecast: number; demand: number; available: number; actual: number }> = {
      techbook: { marketSize: 0, forecast: 0, demand: 0, available: 0, actual: 0 },
      zroid: { marketSize: 0, forecast: 0, demand: 0, available: 0, actual: 0 },
      itab: { marketSize: 0, forecast: 0, demand: 0, available: 0, actual: 0 }
    };

    const totalScoreMap: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    const marketShareMap: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    const priceMap: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };

    pKeys.forEach(pId => {
      const mSize = getMarketSize(pId, period);
      const forecastShare = dec.marketing?.forecastedMarketShare?.[pId] ?? 0;
      const forecastUnits = Math.round((mSize * forecastShare) / 100);

      const res = backModelResults.find(r => r.productId === pId);
      const demandUnits = res ? Math.round(res.demandUnitsByTeam[tIdx] || 0) : 0;
      const availableUnits = res ? Math.round(res.availableByTeam[tIdx] || 0) : 0;
      const actualUnits = res ? Math.round(res.unitsSoldByTeam[tIdx] || 0) : 0;

      unitsMap[pId] = {
        marketSize: mSize,
        forecast: forecastUnits,
        demand: demandUnits,
        available: availableUnits,
        actual: actualUnits
      };

      totalScoreMap[pId] = res ? (res.totalScoreByTeam[tIdx] || 0) : 0;
      marketShareMap[pId] = res ? (res.marketShareByTeam[tIdx] || 0) : 0;
      priceMap[pId] = dec.marketing?.prices?.[pId] ?? 0;
    });

    const scaledProd = getScaledProduction(t, dec);
    const unitsProduced = (scaledProd.techbook || 0) + (scaledProd.zroid || 0) + (scaledProd.itab || 0);
    const unitsSold = unitsMap.techbook.actual + unitsMap.zroid.actual + unitsMap.itab.actual;

    return {
      teamId: t.id,
      teamName: t.name,
      revenueByProduct: {
        techbook: techbookRev,
        zroid: zroidRev,
        itab: itabRev
      },
      totalRevenue: totalRev,
      cogsByProduct: {
        techbook: techbookCogsVal,
        zroid: zroidCogsVal,
        itab: itabCogsVal
      },
      totalCogs,
      grossProfit,
      gpMargin,
      opex: {
        marketing: adMkt,
        store: storeCost,
        payroll: opexPayroll,
        rd: rdCost,
        agents: agentComm,
        training: opexTraining,
        other: otherOpex,
        total: totalOpEx
      },
      ebitda,
      depreciation: depr,
      financeCharges: finCharges,
      ebt,
      taxation,
      netProfit,
      npMargin,
      equity,
      roe,
      units: unitsMap,
      totalScore: totalScoreMap,
      marketShare: marketShareMap,
      price: priceMap,
      staffCounts: staffCountsMap,
      trainingLevels: trainingLevelsMap,
      unitsProduced,
      unitsSold
    };
  });
}
