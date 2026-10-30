import { Team, ProductId, HRRole, TrainingLevel, TurnDecisions, ALPOpportunityMarketResult, PeriodALPOpportunities, ZenAuctionState, ZenOpportunityResult, ZenBuyerBreakdown } from '../types';
import { INITIAL_DECISIONS, STORE_COSTS, SUPPLIER_METRICS, FINANCE_CONSTANTS, getMarketSize, getActiveClassIsALP, COMPONENT_COSTS, FINISHED_GOODS_COSTS, ZEN_TRANSFER_COSTS, ZEN_RESERVE_PRICE } from '../constants';
import { computeMarketShareBackModel, getScaledProduction, getDecisionsForTeamPeriod } from './marketShareBackModel';

export function didTeamEnterBotswanaInPeriod(team: Team, period: number): boolean {
  const rec = team.history?.[period] || (team.history as any)?.[String(period)];
  if (rec?.industry?.alpOpportunities?.botswana?.entered !== undefined) {
    return Boolean(rec.industry.alpOpportunities.botswana.entered);
  }
  const dec = getDecisionsForTeamPeriod(team, period);
  if (dec?.marketing?.alpOpportunities?.botswana !== undefined) {
    return Boolean(dec.marketing.alpOpportunities.botswana);
  }
  if (rec?.alpOpportunities?.botswana?.entered !== undefined) {
    return Boolean(rec.alpOpportunities.botswana.entered);
  }
  return false;
}

export function didTeamEnterMozambiqueInPeriod(team: Team, period: number): boolean {
  if (period !== 2) return false;
  const rec = team.history?.[period] || (team.history as any)?.[String(period)];
  if (rec?.industry?.alpOpportunities?.mozambique?.entered !== undefined) {
    return Boolean(rec.industry.alpOpportunities.mozambique.entered);
  }
  const dec = getDecisionsForTeamPeriod(team, period);
  if (dec?.marketing?.alpOpportunities?.mozambique !== undefined) {
    return Boolean(dec.marketing.alpOpportunities.mozambique);
  }
  if (rec?.alpOpportunities?.mozambique?.entered !== undefined) {
    return Boolean(rec.alpOpportunities.mozambique.entered);
  }
  return false;
}

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
  otherIncome?: number;
  alpOpportunities?: PeriodALPOpportunities;
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
  period: number,
  zenAuction?: ZenAuctionState
): TeamIndustryPerformance[] {
  const activeTeams = teams
    .filter(t => !t.isArchived)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (activeTeams.length === 0) {
    return [];
  }

  const backModelResults = computeMarketShareBackModel(activeTeams, period);
  const rawBotswanaEnteringCount = (period === 2 || period === 3)
    ? activeTeams.filter(tm => didTeamEnterBotswanaInPeriod(tm, period)).length
    : 0;
  const rawMozambiqueEnteringCount = period === 2
    ? activeTeams.filter(tm => didTeamEnterMozambiqueInPeriod(tm, 2)).length
    : 0;

  // Pre-calculate Year 3 Zen B2B Sales & Profit across all non-owner teams (ALP Year 3)
  let zenOwnerSplits: Record<string, number> = {};
  let zenWinningBidAmount = ZEN_RESERVE_PRICE;
  let hasZenAward = false;

  if (period === 3) {
    if (zenAuction?.isAwarded && zenAuction.jvSplits && Object.keys(zenAuction.jvSplits).length > 0) {
      zenOwnerSplits = { ...zenAuction.jvSplits };
      zenWinningBidAmount = zenAuction.winningAmount || ZEN_RESERVE_PRICE;
      hasZenAward = true;
    } else if (zenAuction?.isAwarded && zenAuction.winningTeamId) {
      zenOwnerSplits = { [zenAuction.winningTeamId]: 100 };
      zenWinningBidAmount = zenAuction.winningAmount || ZEN_RESERVE_PRICE;
      hasZenAward = true;
    } else {
      // Fallback: check if any team has historical zen opportunity recorded for period 3
      activeTeams.forEach(tm => {
        const histZen = tm.history?.[3]?.alpOpportunities?.zen || (tm.history as any)?.['3']?.alpOpportunities?.zen;
        if (histZen && histZen.isOwner && histZen.ownershipPct > 0) {
          zenOwnerSplits[tm.id] = histZen.ownershipPct;
          if (histZen.winningBidAmount) zenWinningBidAmount = histZen.winningBidAmount;
          hasZenAward = true;
        }
      });
    }
  }

  let totalExternalUnitsSold = 0;
  let totalExternalSalesRevenue = 0;
  let totalExternalTransferCost = 0;
  let totalZenB2BProfit = 0;
  const zenBuyerBreakdown: Record<string, ZenBuyerBreakdown> = {};

  if (period === 3 && hasZenAward) {
    const pIds: ProductId[] = ['techbook', 'zroid', 'itab'];
    const activeTransferCosts = zenAuction?.transferCosts || ZEN_TRANSFER_COSTS;
    activeTeams.forEach(buyerTeam => {
      const isBuyerOwner = (zenOwnerSplits[buyerTeam.id] || 0) > 0;
      const buyerDec = getDecisionsForTeamPeriod(buyerTeam, 3);
      let teamUnits = 0;
      let teamRev = 0;
      let teamTransfer = 0;
      let teamProfit = 0;

      pIds.forEach(pId => {
        const zenAlloc = buyerDec.procurement?.supplierAllocation?.[pId]?.Zen;
        const compUnits = Number(zenAlloc?.components) || 0;
        const fgUnits = Number(zenAlloc?.finishedGoods) || 0;
        if (compUnits <= 0 && fgUnits <= 0) return;

        const compTransfer = activeTransferCosts[pId]?.components ?? ZEN_TRANSFER_COSTS[pId].components;
        const fgTransfer = activeTransferCosts[pId]?.finishedGoods ?? ZEN_TRANSFER_COSTS[pId].finishedGoods;

        const compPrice = isBuyerOwner ? compTransfer : getSupplierComponentCost(pId, 'Zen', buyerDec);
        const fgPrice = isBuyerOwner ? fgTransfer : getSupplierFinishedGoodsCost(pId, 'Zen', buyerDec);

        const rev = compUnits * compPrice + fgUnits * fgPrice;
        const tCost = compUnits * compTransfer + fgUnits * fgTransfer;
        const prof = isBuyerOwner ? 0 : (rev - tCost);

        teamUnits += compUnits + fgUnits;
        teamRev += rev;
        teamTransfer += tCost;
        teamProfit += prof;
      });

      zenBuyerBreakdown[buyerTeam.id] = {
        teamId: buyerTeam.id,
        teamName: buyerTeam.name,
        units: teamUnits,
        revenue: teamRev,
        transferCost: teamTransfer,
        profit: teamProfit,
      };

      if (!isBuyerOwner) {
        totalExternalUnitsSold += teamUnits;
        totalExternalSalesRevenue += teamRev;
        totalExternalTransferCost += teamTransfer;
        totalZenB2BProfit += teamProfit;
      }
    });
  }

  return activeTeams.map((t, tIdx) => {
    const dec = getDecisionsForTeamPeriod(t, period);

    // Calculate Revenue & COGS based on backModel simulation results
    let techbookRev = 0, zroidRev = 0, itabRev = 0;
    let techbookCogsVal = 0, zroidCogsVal = 0, itabCogsVal = 0;
    const unitCogsByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };

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
      unitCogsByProduct[pId] = unitCogs;
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
    const baseStaffCounts: Record<HRRole, number> = { engineers: 22, technicians: 28, semiSkilled: 37, adminSales: 29, customerService: 58 };
    const baseSalaries: Record<HRRole, number> = { engineers: 55000, technicians: 38000, semiSkilled: 30000, adminSales: 20000, customerService: 9250 };
    const trainingCosts: Record<string, number> = { None: 0, Basic: 5000, Advanced: 15000, Specialized: 30000 };

    const staffCountsMap: Record<HRRole, number> = { engineers: 0, technicians: 0, semiSkilled: 0, adminSales: 0, customerService: 0 };
    const trainingLevelsMap: Record<HRRole, TrainingLevel> = { engineers: 'None', technicians: 'None', semiSkilled: 'None', adminSales: 'None', customerService: 'None' };
    const closedPeriodStaff = period < (t.currentPeriod || 1) ? t.history?.[period]?.staffCounts : undefined;

    hrRoles.forEach(r => {
      const count = (typeof closedPeriodStaff?.[r] === 'number' && Number.isFinite(closedPeriodStaff[r]))
        ? closedPeriodStaff[r]
        : (t.staffCounts?.[r] ?? baseStaffCounts[r] ?? 0) + (dec.hr?.hiring?.[r] ?? 0);
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

    // 7. ALP Regional Market Opportunities (Botswana & Mozambique in Year 2; Botswana & Zen Acquisition in Year 3)
    const isALPActive = getActiveClassIsALP() || rawBotswanaEnteringCount > 0 || rawMozambiqueEnteringCount > 0 || hasZenAward || Boolean(t.history?.[period]?.alpOpportunities);
    let alpOpportunities: PeriodALPOpportunities | undefined;
    let otherIncome = 0;

    if (isALPActive && (period === 2 || period === 3)) {
      const enteredBotswana = didTeamEnterBotswanaInPeriod(t, period);
      const enteredBotswanaPrevYear = period === 3 ? didTeamEnterBotswanaInPeriod(t, 2) : false;
      const botswanaCount = activeTeams.length > 1
        ? rawBotswanaEnteringCount
        : (t.history?.[period]?.alpOpportunities?.botswana?.enteringTeamsCount ?? rawBotswanaEnteringCount);

      const botswanaDemand: Record<ProductId, number> = period === 2
        ? { techbook: 50000, zroid: 80000, itab: 60000 }
        : { techbook: 20000, zroid: 50000, itab: 70000 };

      const bwAllocatedUnits: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
      const bwProductContribution: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
      let bwRevenue = 0;
      let bwGrossProfit = 0;

      if (enteredBotswana && botswanaCount > 0) {
        pKeys.forEach(pId => {
          const allocUnits = botswanaDemand[pId] / botswanaCount;
          bwAllocatedUnits[pId] = allocUnits;
          const price = dec.marketing?.prices?.[pId] ?? 0;
          const prodRev = price * allocUnits;
          const prodGpMargin = price > 0 ? (price - unitCogsByProduct[pId]) / price : 0;
          const contrib = Math.round(prodRev * prodGpMargin);
          bwProductContribution[pId] = contrib;
          bwRevenue += Math.round(prodRev);
          bwGrossProfit += contrib;
        });
      }

      const bwOperatingCost = (enteredBotswana && botswanaCount > 0)
        ? (period === 2 ? 90000000 : (enteredBotswanaPrevYear ? 50000000 : 95000000))
        : 0;
      const bwPreTaxProfit = bwGrossProfit - bwOperatingCost;
      const bwTax = (period === 3 && enteredBotswana && botswanaCount > 0 && bwPreTaxProfit > 0)
        ? Math.round(bwPreTaxProfit * 0.50)
        : 0;
      const bwTotalCost = bwOperatingCost + bwTax;
      const bwNet = (enteredBotswana && botswanaCount > 0) ? (bwGrossProfit - bwTotalCost) : 0;

      const botswanaResult: ALPOpportunityMarketResult = {
        entered: enteredBotswana,
        enteringTeamsCount: botswanaCount,
        enteredInPreviousYear: period === 3 ? enteredBotswanaPrevYear : undefined,
        allocatedUnits: bwAllocatedUnits,
        productContribution: bwProductContribution,
        totalRevenue: bwRevenue,
        totalGrossProfit: bwGrossProfit,
        operatingCost: bwOperatingCost,
        tax: bwTax,
        totalCost: bwTotalCost,
        netOfOpportunity: bwNet,
      };

      let mozambiqueResult: ALPOpportunityMarketResult | undefined;
      if (period === 2) {
        const enteredMozambique = didTeamEnterMozambiqueInPeriod(t, 2);
        const mozambiqueCount = activeTeams.length > 1
          ? rawMozambiqueEnteringCount
          : (t.history?.[2]?.alpOpportunities?.mozambique?.enteringTeamsCount ?? rawMozambiqueEnteringCount);
        const mozambiqueDemand: Record<ProductId, number> = { techbook: 20000, zroid: 45000, itab: 40000 };
        const mzAllocatedUnits: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
        const mzProductContribution: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
        let mzRevenue = 0;
        let mzGrossProfit = 0;

        if (enteredMozambique && mozambiqueCount > 0) {
          pKeys.forEach(pId => {
            const allocUnits = mozambiqueDemand[pId] / mozambiqueCount;
            mzAllocatedUnits[pId] = allocUnits;
            const price = dec.marketing?.prices?.[pId] ?? 0;
            const prodRev = price * allocUnits;
            const prodGpMargin = price > 0 ? (price - unitCogsByProduct[pId]) / price : 0;
            const contrib = Math.round(prodRev * prodGpMargin);
            mzProductContribution[pId] = contrib;
            mzRevenue += Math.round(prodRev);
            mzGrossProfit += contrib;
          });
        }

        const mzOperatingCost = (enteredMozambique && mozambiqueCount > 0)
          ? Math.round(mzRevenue * 0.045)
          : 0;
        const mzTotalCost = mzOperatingCost;
        const mzNet = (enteredMozambique && mozambiqueCount > 0) ? (mzGrossProfit - mzTotalCost) : 0;

        mozambiqueResult = {
          entered: enteredMozambique,
          enteringTeamsCount: mozambiqueCount,
          allocatedUnits: mzAllocatedUnits,
          productContribution: mzProductContribution,
          totalRevenue: mzRevenue,
          totalGrossProfit: mzGrossProfit,
          operatingCost: mzOperatingCost,
          tax: 0,
          totalCost: mzTotalCost,
          netOfOpportunity: mzNet,
        };
      }

      let zenResult: ZenOpportunityResult | undefined;
      if (period === 3 && hasZenAward) {
        const ownershipPct = zenOwnerSplits[t.id] || 0;
        const isOwner = ownershipPct > 0;
        const purchasePriceShare = Math.round(zenWinningBidAmount * (ownershipPct / 100));
        const zenNet = isOwner ? Math.round(totalZenB2BProfit * (ownershipPct / 100)) : 0;
        zenResult = {
          isOwner,
          ownershipPct,
          winningBidAmount: zenWinningBidAmount,
          purchasePriceShare,
          totalExternalUnitsSold,
          totalExternalSalesRevenue,
          totalExternalTransferCost,
          totalZenB2BProfit,
          netOfOpportunity: zenNet,
          buyerBreakdown: zenBuyerBreakdown,
        };
      }

      otherIncome = botswanaResult.netOfOpportunity + (mozambiqueResult?.netOfOpportunity ?? 0) + (zenResult?.netOfOpportunity ?? 0);
      alpOpportunities = {
        botswana: botswanaResult,
        ...(mozambiqueResult ? { mozambique: mozambiqueResult } : {}),
        ...(zenResult ? { zen: zenResult } : {}),
        totalNetOtherIncome: otherIncome,
      };
    }

    const netProfit = ebt - taxation + otherIncome;
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
      marketShareMap[pId] = mSize > 0 ? (actualUnits / mSize) : (res ? (res.marketShareByTeam[tIdx] || 0) : 0);
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
      ...(alpOpportunities ? { otherIncome, alpOpportunities } : {}),
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
