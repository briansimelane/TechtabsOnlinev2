import React, { useState, useMemo } from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { PRODUCTS, MARKET_SIZES, STORE_COSTS, HR_CONSTANTS, FINANCE_CONSTANTS, COMPONENT_COSTS, FINISHED_GOODS_COSTS, SUPPLIERS, LAST_YEAR_DATA, YEAR_0_RECORD, getMarketSize } from '../constants';
import { ProductId, HRRole, PeriodRecord } from '../types';
import { FileText, PieChart as PieChartIcon, TrendingUp, DollarSign, Activity, BarChart as BarChartIcon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  ComposedChart, Line, Cell
} from 'recharts';
import { formatCurrency, formatNumber, formatPercent } from '../utils/numberFormat';
import { computeIndustryPerformance } from '../utils/industryPerformance';
import { processTurn } from '../utils/SimulationEngine';
import { getDecisionsForTeamPeriod, computeTeamPeriodBalanceSheet } from '../utils/marketShareBackModel';

// --- Types & Interfaces for Reports ---
type ReportTab = 'summary' | 'income' | 'balance' | 'cashflow';

const FinancialReports: React.FC = () => {
  const { decisions, currentTeam, lastPeriodKPIs, classes, currentClassId } = useSimulation();
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');

  const currentClass = classes.find(c => c.id === currentClassId);
  const realTeams = useMemo(() => {
    return currentClass?.teams ? currentClass.teams.filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id)) : [];
  }, [currentClass]);

  const actuals = useMemo(() => {
    const prevPeriod = Math.max(0, currentTeam.currentPeriod - 1);
    const rawRec = currentTeam.history?.[prevPeriod] || currentTeam.history?.[String(prevPeriod)];

    // Direct tie-back to Industry Performance snapshot
    let ind = rawRec?.industry;
    if (!ind && prevPeriod >= 1 && realTeams.length > 0) {
      try {
        const perfList = computeIndustryPerformance(realTeams, prevPeriod);
        ind = perfList.find(p => p.teamId === currentTeam.id);
      } catch (e) {
        console.warn("Could not compute prior industry performance fallback:", e);
      }
    }

    const bs = computeTeamPeriodBalanceSheet(currentTeam, prevPeriod);

    const prevRevenue = ind?.totalRevenue ?? rawRec?.revenue?.total ?? YEAR_0_RECORD.revenue.total;
    const prevCogs = ind?.totalCogs ?? rawRec?.cogs?.total ?? YEAR_0_RECORD.cogs.total;
    const prevGrossProfit = ind?.grossProfit ?? rawRec?.grossProfit?.total ?? YEAR_0_RECORD.grossProfit.total;
    const prevEbitda = ind?.ebitda ?? rawRec?.ebitda ?? YEAR_0_RECORD.ebitda;
    const prevDepr = ind?.depreciation ?? rawRec?.depreciation ?? YEAR_0_RECORD.depreciation;
    const prevInterest = ind?.financeCharges ?? ind?.interest ?? rawRec?.interest ?? YEAR_0_RECORD.interest;
    const prevEbt = ind?.ebt ?? rawRec?.ebt ?? YEAR_0_RECORD.ebt;
    const prevTax = ind?.taxation ?? rawRec?.tax ?? YEAR_0_RECORD.tax;
    const prevNetProfit = ind?.netProfit ?? bs.netProfit;

    const prevOpex = {
      marketing: ind?.opex?.marketing ?? rawRec?.opex?.marketing ?? YEAR_0_RECORD.opex.marketing,
      store: ind?.opex?.store ?? rawRec?.opex?.store ?? YEAR_0_RECORD.opex.store,
      agents: ind?.opex?.agents ?? rawRec?.opex?.agents ?? YEAR_0_RECORD.opex.agents,
      payroll: ind?.opex?.payroll ?? rawRec?.opex?.payroll ?? YEAR_0_RECORD.opex.payroll,
      training: ind?.opex?.training ?? rawRec?.opex?.training ?? YEAR_0_RECORD.opex.training,
      rd: ind?.opex?.rd ?? rawRec?.opex?.rd ?? YEAR_0_RECORD.opex.rd,
      other: ind?.opex?.other ?? rawRec?.opex?.other ?? YEAR_0_RECORD.opex.other,
      total: ind?.opex?.total ?? ind?.totalOpex ?? rawRec?.opex?.total ?? YEAR_0_RECORD.opex.total
    };

    return {
      period: prevPeriod,
      revenue: {
        total: prevRevenue,
        byProduct: ind?.revenueByProduct || rawRec?.revenue?.byProduct || YEAR_0_RECORD.revenue.byProduct
      },
      cogs: {
        total: prevCogs,
        byProduct: ind?.cogsByProduct || rawRec?.cogs?.byProduct || YEAR_0_RECORD.cogs.byProduct
      },
      grossProfit: {
        total: prevGrossProfit,
        byProduct: ind?.gpByProduct || rawRec?.grossProfit?.byProduct || YEAR_0_RECORD.grossProfit.byProduct
      },
      ebitda: prevEbitda,
      depreciation: prevDepr,
      interest: prevInterest,
      ebt: prevEbt,
      tax: prevTax,
      netProfit: prevNetProfit,
      opex: prevOpex,
      balanceSheet: {
        cash: bs.cash,
        receivables: bs.receivables,
        inventory: bs.inventory,
        fixedAssets: bs.fixedAssets,
        totalAssets: bs.totalAssets,
        equity: ind?.equity ?? bs.equity,
        openingEquity: bs.openingEquity,
        netProfit: prevNetProfit,
        longTermDebt: bs.longTermDebt,
        currentLiabilities: bs.currentLiabilities,
        totalLiabilities: bs.longTermDebt + bs.currentLiabilities,
        totalLiabilitiesAndEquity: bs.totalLiabilitiesAndEquity
      }
    };
  }, [currentTeam, realTeams]);

  const prevActuals = useMemo(() => {
    const prevPrevPeriod = currentTeam.currentPeriod - 2;
    if (prevPrevPeriod >= 0 && currentTeam.history?.[prevPrevPeriod]) {
      return currentTeam.history[prevPrevPeriod];
    }
    // Fallback for Year 0's prior period (Year -1 opening balances)
    return {
      period: -1,
      revenue: { total: 0, byProduct: { techbook: 0, zroid: 0, itab: 0 } },
      cogs: { total: 0, byProduct: { techbook: 0, zroid: 0, itab: 0 } },
      grossProfit: { total: 0, byProduct: { techbook: 0, zroid: 0, itab: 0 } },
      opex: { marketing: 0, store: 0, agents: 0, payroll: 0, training: 0, rd: 0, other: 0, total: 0 },
      ebitda: 0,
      depreciation: 0,
      interest: 0,
      ebt: 0,
      tax: 0,
      netProfit: 0,
      balanceSheet: {
        cash: 106316215,
        receivables: 47500000,
        inventory: 112334926,
        fixedAssets: 285995500,
        totalAssets: 551974711,
        equity: 309707584,
        longTermDebt: 0,
        currentLiabilities: 242439057,
        totalLiabilitiesAndEquity: 551974711
      },
      cashFlow: { operating: 0, investing: 0, financing: 0, net: 0 },
      debtorDays: { techbook: 30, zroid: 30, itab: 30 },
      creditorDays: 30,
      interestCoverage: 0,
      kpis: {
        revenue: 0,
        netProfit: 0,
        marketShare: { techbook: 0, zroid: 0, itab: 0 },
        customerSatisfaction: 0,
        employeeSatisfaction: 0
      }
    } as PeriodRecord;
  }, [currentTeam]);

  // Variance helpers
  const calculateVar = (forecastVal: number, actualVal: number) => {
      if (actualVal === 0) return forecastVal > 0 ? '+100%' : '0%';
      const pct = ((forecastVal - actualVal) / actualVal) * 100;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
  };
  const getVarColor = (forecastVal: number, actualVal: number, isExpense = false) => {
      if (forecastVal === actualVal) return 'text-slate-500';
      const isHigher = forecastVal > actualVal;
      const isGood = isExpense ? !isHigher : isHigher;
      return isGood ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold';
  };

  // --- Calculations (Forecast Logic) ---

  const forecast = useMemo(() => {
    const currentPeriod = currentTeam.currentPeriod;

    // Helper to get available inventory for sale
    const getAvailableInventory = (productId: ProductId) => {
      const opening = currentTeam.inventory[productId] || 0;
      const production = decisions.operations.production[productId] || 0;
      const purchased = Object.values(decisions.procurement.supplierAllocation[productId] || {}).reduce(
        (sum: number, alloc: any) => sum + (alloc.finishedGoods || 0),
        0
      );
      return opening + production + purchased;
    };

    // 1. Revenue & COGS
    const revenueByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    let totalRevenue = 0;
    
    // Production Staff Costs (Technicians & Semi-skilled)
    let productionPayroll = 0;
    const techCount = (currentTeam.staffCounts?.technicians || 0) + (decisions.hr.hiring.technicians || 0);
    const techSalary = decisions.hr.salaries.technicians || 0;
    productionPayroll += techCount * techSalary * 8;

    const semiCount = (currentTeam.staffCounts?.semiSkilled || 0) + (decisions.hr.hiring.semiSkilled || 0);
    const semiSalary = decisions.hr.salaries.semiSkilled || 0;
    productionPayroll += semiCount * semiSalary * 8;

    const totalProdUnitsPlanned = (decisions.operations.production.techbook || 0) + 
                                  (decisions.operations.production.zroid || 0) + 
                                  (decisions.operations.production.itab || 0);

    const laborCostPerUnit = totalProdUnitsPlanned > 0 ? (productionPayroll / totalProdUnitsPlanned) : 350;

    const cogsByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    let totalCogs = 0;

    PRODUCTS.forEach(p => {
      const price = decisions.marketing.prices[p.id] || 0;
      const share = (decisions.marketing.forecastedMarketShare[p.id] || 0) / 100;
      const totalMarketSize = getMarketSize(p.id, currentPeriod);
      const demandUnits = Math.round(totalMarketSize * share);
      const availableUnits = getAvailableInventory(p.id);
      const salesUnits = Math.min(demandUnits, availableUnits);

      const prodRev = salesUnits * price;
      revenueByProduct[p.id] = prodRev;
      totalRevenue += prodRev;

      // Calculate component cost based on procurement allocation
      let componentCost = p.id === 'techbook' ? 1200 : (p.id === 'zroid' ? 1400 : 1000);
      const alloc = decisions.procurement.supplierAllocation[p.id] || {};
      let totalAllocComponents = 0;
      let totalAllocCost = 0;

      Object.entries(alloc).forEach(([supId, val]: [string, any]) => {
        if (val && val.components > 0) {
          const supMetric = (SUPPLIERS as any)[supId];
          const supPrice = supMetric?.unitPrices?.[p.id] ?? componentCost;
          totalAllocCost += supPrice * val.components;
          totalAllocComponents += val.components;
        }
      });

      if (totalAllocComponents > 0) {
        componentCost = totalAllocCost / totalAllocComponents;
      }

      const unitCogs = componentCost + laborCostPerUnit;
      const prodCogs = salesUnits * unitCogs;
      cogsByProduct[p.id] = prodCogs;
      totalCogs += prodCogs;
    });

    const grossProfitTotal = totalRevenue - totalCogs;
    const grossProfitByProduct: Record<ProductId, number> = {
      techbook: revenueByProduct.techbook - cogsByProduct.techbook,
      zroid: revenueByProduct.zroid - cogsByProduct.zroid,
      itab: revenueByProduct.itab - cogsByProduct.itab,
    };

    // 2. Opex
    const marketingOpex = decisions.marketing.advertisingBudget || 0;

    const openingStores = currentTeam.storeCount || 0;
    const netStoreChange = decisions.marketing.openCloseStores || 0;
    const totalStores = Math.max(0, openingStores + netStoreChange);
    const storeRunCost = totalStores * STORE_COSTS.running;
    const storeTransCost = netStoreChange > 0 
      ? netStoreChange * STORE_COSTS.opening 
      : (netStoreChange < 0 ? Math.abs(netStoreChange) * STORE_COSTS.closing : 0);
    const storeOpex = storeRunCost + storeTransCost;

    const agentCommissionOpex = Math.round(totalRevenue * 0.52 * (decisions.marketing.agentCommission || 0));

    // Non-production payroll (Engineers, Admin, CS)
    let nonProdPayroll = 0;

    const engCount = (currentTeam.staffCounts?.engineers || 0) + (decisions.hr.hiring.engineers || 0);
    nonProdPayroll += engCount * (decisions.hr.salaries.engineers || 0) * 8;

    const adminCount = (currentTeam.staffCounts?.adminSales || 0) + (decisions.hr.hiring.adminSales || 0);
    nonProdPayroll += adminCount * (decisions.hr.salaries.adminSales || 0) * 8;

    const csCount = (currentTeam.staffCounts?.customerService || 0) + (decisions.hr.hiring.customerService || 0);
    nonProdPayroll += csCount * (decisions.hr.salaries.customerService || 0) * 8;

    const trainingCosts: Record<string, number> = { None: 0, Basic: 5000, Advanced: 15000, Specialized: 30000 };
    let trainingOpex = 0;
    (['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'] as const).forEach(r => {
      const count = (currentTeam.staffCounts?.[r] || 0) + (decisions.hr.hiring?.[r] || 0);
      const level = decisions.hr?.trainingLevels?.[r] || 'None';
      trainingOpex += count * (trainingCosts[level] || 0);
    });
    const rdOpex = decisions.operations.rdBudget || 0;

    const subtotalOpex = marketingOpex + storeOpex + agentCommissionOpex + nonProdPayroll + trainingOpex + rdOpex;
    const otherOpex = subtotalOpex * 0.0797;
    const totalOpex = subtotalOpex + otherOpex;

    const opexBreakdown = {
      marketing: marketingOpex,
      store: storeOpex,
      agents: agentCommissionOpex,
      payroll: nonProdPayroll,
      training: trainingOpex,
      rd: rdOpex,
      other: otherOpex,
      total: totalOpex
    };

    const ebitda = grossProfitTotal - totalOpex;

    // Depreciation
    const currentFixedAssets = actuals.balanceSheet.fixedAssets;
    const capacityExpansionCost = Math.max(0, decisions.operations.capacityChange) * 15000;
    const storeOpeningCapEx = Math.max(0, decisions.marketing.openCloseStores) * STORE_COSTS.opening;
    const totalCapEx = capacityExpansionCost + storeOpeningCapEx;
    const newFixedAssetsBase = currentFixedAssets + totalCapEx;
    const depreciation = newFixedAssetsBase * 0.05;
    const fixedAssets = newFixedAssetsBase - depreciation;

    // Debt & Interest
    const currentDebt = actuals.balanceSheet.longTermDebt;
    const debtChange = decisions.finance.debtChange || 0;
    const longTermDebt = Math.max(0, currentDebt + debtChange);
    const interest = longTermDebt * FINANCE_CONSTANTS.interestRate;

    const ebt = ebitda - depreciation - interest;
    const tax = ebt > 0 ? ebt * FINANCE_CONSTANTS.taxRate : 0;
    const netProfit = ebt - tax;

    // Balance Sheet Items
    const openingEquity = actuals.balanceSheet.equity;
    const equityChange = decisions.finance.equityChange || 0;
    const endingEquity = openingEquity + equityChange + netProfit;

    let receivables = 0;
    PRODUCTS.forEach(p => {
      const pRev = revenueByProduct[p.id];
      const pDays = decisions.finance.debtorsDays[p.id] || 30;
      receivables += pRev * (pDays / 365);
    });

    let totalRawComponentsCount = 0;
    PRODUCTS.forEach(p => {
      const plannedProd = decisions.operations.production[p.id] || 0;
      const alloc = decisions.procurement.supplierAllocation[p.id] || {};
      Object.values(alloc).forEach((val: any) => {
        if (val && val.components > 0) {
          totalRawComponentsCount += val.components;
        }
      });
    });
    const estimatedRawMaterialsVal = totalRawComponentsCount * 1200;

    let totalFGCount = 0;
    PRODUCTS.forEach(p => {
      const alloc = decisions.procurement.supplierAllocation[p.id] || {};
      Object.values(alloc).forEach((val: any) => {
        if (val && val.finishedGoods > 0) {
          totalFGCount += val.finishedGoods;
        }
      });
    });
    const estimatedFGVal = totalFGCount * 2500;
    const inventoryValue = estimatedRawMaterialsVal + estimatedFGVal;

    const totalAssets = fixedAssets + receivables + inventoryValue; 
    const currentLiabilities = Math.max(0, totalAssets - (endingEquity + longTermDebt));

    // Cash Flow & Ending Cash
    const operatingCashFlow = netProfit + depreciation;
    const investingCashFlow = -totalCapEx;
    const financingCashFlow = debtChange + equityChange;
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

    const openingCash = actuals.balanceSheet.cash;
    const endingCash = openingCash + netCashFlow;

    return {
        revenue: {
            total: totalRevenue,
            byProduct: revenueByProduct
        },
        cogs: {
            total: totalCogs,
            byProduct: cogsByProduct
        },
        grossProfit: {
            total: grossProfitTotal,
            byProduct: grossProfitByProduct
        },
        opex: opexBreakdown,
        ebitda,
        depreciation,
        interest,
        ebt,
        tax,
        netProfit,
        balanceSheet: {
            cash: endingCash,
            receivables,
            inventory: inventoryValue,
            fixedAssets,
            totalAssets,
            equity: endingEquity,
            longTermDebt,
            currentLiabilities,
            totalLiabilitiesAndEquity: endingEquity + longTermDebt + currentLiabilities
        },
        cashFlow: {
            operating: operatingCashFlow,
            investing: investingCashFlow,
            financing: financingCashFlow,
            net: netCashFlow
        }
    };
  }, [decisions, currentTeam, actuals]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500 mt-1">Comprehensive financial analysis and decision summary (Actuals tied to Industry Performance).</p>
        </div>
        
        {/* Tabs */}
        <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
            {[
                { id: 'summary', label: 'Decisions Summary', icon: FileText },
                { id: 'income', label: 'Income Statement', icon: DollarSign },
                { id: 'balance', label: 'Balance Sheet', icon: PieChartIcon },
                { id: 'cashflow', label: 'Cash Flow', icon: Activity },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ReportTab)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab.id 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
          
          {/* 1. DECISIONS SUMMARY */}
          {activeTab === 'summary' && (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 
                 {/* Team Details */}
                 <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                     <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Team & Period Details</div>
                     <div className="p-4 space-y-3 text-sm">
                         <div className="flex justify-between border-b border-slate-100 pb-2">
                             <span className="text-slate-600">Current Period:</span>
                             <span className="font-bold">Year {currentTeam.currentPeriod}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-100 pb-2">
                             <span className="text-slate-600">Team Name:</span>
                             <span className="font-bold">{currentTeam.name}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-100 pb-2">
                             <span className="text-slate-600">Cash Balance:</span>
                             <span className="font-mono text-emerald-600 font-bold">R {currentTeam.cashBalance.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-slate-600">Store Count:</span>
                             <span className="font-bold">{currentTeam.storeCount}</span>
                         </div>
                     </div>
                 </div>

                 {/* Marketing */}
                 <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                     <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Marketing Decisions</div>
                     <div className="p-4 space-y-3 text-sm">
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Prices</p>
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="flex justify-between py-1">
                                     <span className="text-slate-600">{p.name}</span>
                                     <span className="font-mono">R {decisions.marketing.prices[p.id]?.toLocaleString() || 0}</span>
                                 </div>
                             ))}
                         </div>
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Forecasted Share</p>
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="flex justify-between py-1">
                                     <span className="text-slate-600">{p.name}</span>
                                     <span className="font-mono">{formatPercent(decisions.marketing.forecastedMarketShare[p.id] || 0, 2)}</span>
                                 </div>
                             ))}
                         </div>
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Advertising</p>
                             <div className="flex justify-between py-1">
                                 <span className="text-slate-600">Budget</span>
                                 <span className="font-mono">R {decisions.marketing.advertisingBudget.toLocaleString()}</span>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Operations */}
                 <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                     <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Operations Decisions</div>
                     <div className="p-4 space-y-3 text-sm">
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Production Units</p>
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="flex justify-between py-1">
                                     <span className="text-slate-600">{p.name}</span>
                                     <span className="font-mono">{decisions.operations.production[p.id]?.toLocaleString() || 0}</span>
                                 </div>
                             ))}
                         </div>
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Purchase Units (FG)</p>
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="flex justify-between py-1">
                                     <span className="text-slate-600">{p.name}</span>
                                     <span className="font-mono">{decisions.operations.reqFinishedGoods[p.id]?.toLocaleString() || 0}</span>
                                 </div>
                             ))}
                         </div>
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Expansion</p>
                             <div className="flex justify-between py-1">
                                 <span className="text-slate-600">Capacity Change</span>
                                 <span className="font-mono">{decisions.operations.capacityChange.toLocaleString()}</span>
                             </div>
                         </div>
                         <div>
                              <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">R & D</p>
                              <div className="flex justify-between py-1">
                                  <span className="text-slate-600">Budget</span>
                                  <span className="font-mono">R {decisions.operations.rdBudget.toLocaleString()}</span>
                              </div>
                              {PRODUCTS.map(p => (
                                  <div key={p.id} className="flex justify-between py-1 pl-2 text-xs">
                                      <span className="text-slate-500">Split: {p.name}</span>
                                      <span className="font-mono">{formatPercent(decisions.operations.rdSplits[p.id] || 0, 2)}</span>
                                  </div>
                              ))}
                          </div>
                     </div>
                 </div>

                 {/* HR */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Human Resources Decisions</div>
                       <div className="p-4 overflow-x-auto">
                           <table className="w-full text-xs sm:text-sm whitespace-nowrap">
                              <thead>
                                  <tr className="text-xs text-slate-500 border-b border-slate-100">
                                      <th className="text-left pb-1">Role</th>
                                      <th className="text-right pb-1 font-semibold">Recruit</th>
                                      <th className="text-right pb-1 font-semibold">Salary</th>
                                      <th className="text-right pb-1 font-semibold pl-3">Training</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {(['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'] as HRRole[]).map(r => (
                                      <tr key={r}>
                                          <td className="py-1 text-slate-700 capitalize">{r.replace(/([A-Z])/g, ' $1').trim()}</td>
                                          <td className="py-1 text-right font-mono">{decisions.hr.hiring[r]}</td>
                                          <td className="py-1 text-right font-mono">R {decisions.hr.salaries[r].toLocaleString()}</td>
                                          <td className="py-1 text-right font-mono pl-3">{decisions.hr.trainingLevels[r] || 'None'}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* Finance */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Finance Decisions</div>
                      <div className="p-4 space-y-3 text-sm">
                          {PRODUCTS.map(p => (
                              <div key={p.id} className="flex justify-between border-b border-slate-100 pb-2">
                                  <span className="text-slate-600">Debtors Days ({p.name})</span>
                                  <span className="font-bold">{decisions.finance.debtorsDays[p.id] || 0} Days</span>
                              </div>
                          ))}
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                              <span className="text-slate-600">Debt Change</span>
                              <span className="font-mono">R {decisions.finance.debtChange.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-600">Equity Change</span>
                              <span className="font-mono">R {decisions.finance.equityChange.toLocaleString()}</span>
                          </div>
                      </div>
                  </div>

                  {/* Procurement */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Procurement Decisions</div>
                      <div className="p-4 space-y-3 text-sm">
                          {PRODUCTS.map(p => {
                              const alloc = decisions.procurement.supplierAllocation[p.id] || {};
                              const allocEntries = Object.entries(alloc) as [string, { components: number; finishedGoods: number }][];
                              const hasAllocations = allocEntries.some(([_, val]) => val.components > 0 || val.finishedGoods > 0);
                              
                              return (
                                  <div key={p.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                      <p className="font-bold text-slate-800 mb-1">{p.name}</p>
                                      {hasAllocations ? (
                                          <div className="space-y-1 pl-2">
                                              {allocEntries.map(([supKey, val]) => {
                                                  if (val.components <= 0 && val.finishedGoods <= 0) return null;
                                                  return (
                                                      <div key={supKey} className="flex justify-between text-xs">
                                                          <span className="text-slate-600 capitalize">{supKey}</span>
                                                          <span className="font-mono">
                                                              {val.components > 0 && `${val.components.toLocaleString()} Comp`}
                                                              {val.components > 0 && val.finishedGoods > 0 && " | "}
                                                              {val.finishedGoods > 0 && `${val.finishedGoods.toLocaleString()} FG`}
                                                          </span>
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      ) : (
                                          <p className="text-xs text-slate-400 pl-2 italic">No allocations</p>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>

             </div>
          )}

          {/* 2. INCOME STATEMENT */}
          {activeTab === 'income' && (
              <div>
                  
                  {/* Table */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 sm:p-6">
                           <h3 className="text-lg font-bold text-slate-800 mb-4">Income Statement Forecast</h3>
                           <div className="overflow-x-auto">
                               <table className="w-full text-xs sm:text-sm whitespace-nowrap">
                               <thead>
                                   <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                       <th className="py-3 px-4 text-left">Item</th>
                                       <th className="py-3 px-4 text-right">Forecast Year {currentTeam.currentPeriod}</th>
                                       <th className="py-3 px-4 text-right">Actual Year {currentTeam.currentPeriod - 1}</th>
                                       <th className="py-3 px-4 text-right w-20">Var %</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                   {/* Revenue */}
                                   <tr className="font-bold bg-slate-50/50">
                                       <td className="py-2 px-4">Total Revenue</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(forecast.revenue.total)}</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(actuals.revenue.total)}</td>
                                       <td className={`py-2 px-4 text-right ${getVarColor(forecast.revenue.total, actuals.revenue.total)}`}>
                                           {calculateVar(forecast.revenue.total, actuals.revenue.total)}
                                       </td>
                                   </tr>
                                   {PRODUCTS.map(p => (
                                       <tr key={`rev-${p.id}`}>
                                           <td className="py-1 px-8 text-slate-500">- {p.name} Revenue</td>
                                           <td className="py-1 px-4 text-right">{formatCurrency(forecast.revenue.byProduct[p.id])}</td>
                                           <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.revenue.byProduct[p.id])}</td>
                                           <td className="py-1 px-4 text-right text-slate-400">{calculateVar(forecast.revenue.byProduct[p.id], actuals.revenue.byProduct[p.id])}</td>
                                       </tr>
                                   ))}
                                   
                                   {/* COGS */}
                                   <tr className="font-bold bg-slate-50/50 border-t border-slate-200">
                                       <td className="py-2 px-4">Total COGS</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(forecast.cogs.total)}</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(actuals.cogs.total)}</td>
                                       <td className={`py-2 px-4 text-right ${getVarColor(forecast.cogs.total, actuals.cogs.total, true)}`}>
                                           {calculateVar(forecast.cogs.total, actuals.cogs.total)}
                                       </td>
                                   </tr>
                                   {PRODUCTS.map(p => (
                                       <tr key={`cogs-${p.id}`}>
                                           <td className="py-1 px-8 text-slate-500">- {p.name} COGS</td>
                                           <td className="py-1 px-4 text-right">{formatCurrency(forecast.cogs.byProduct[p.id])}</td>
                                           <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.cogs.byProduct[p.id])}</td>
                                           <td className="py-1 px-4 text-right text-slate-400">{calculateVar(forecast.cogs.byProduct[p.id], actuals.cogs.byProduct[p.id])}</td>
                                       </tr>
                                   ))}

                                   {/* Gross Profit */}
                                   <tr className="font-bold bg-blue-50/30 text-blue-900 border-t border-b border-blue-100">
                                       <td className="py-2.5 px-4">Gross Profit</td>
                                       <td className="py-2.5 px-4 text-right">{formatCurrency(forecast.grossProfit.total)}</td>
                                       <td className="py-2.5 px-4 text-right">{formatCurrency(actuals.grossProfit.total)}</td>
                                       <td className={`py-2.5 px-4 text-right ${getVarColor(forecast.grossProfit.total, actuals.grossProfit.total)}`}>
                                           {calculateVar(forecast.grossProfit.total, actuals.grossProfit.total)}
                                       </td>
                                   </tr>

                                   {/* Opex Header */}
                                   <tr className="font-bold bg-slate-50/50">
                                       <td className="py-2 px-4" colSpan={4}>Operating Expenses</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-600">Marketing & Advertising</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.opex.marketing)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.opex.marketing)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.opex.marketing, actuals.opex.marketing, true)}`}>{calculateVar(forecast.opex.marketing, actuals.opex.marketing)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-600">Store Lease & Recurrent</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.opex.store)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.opex.store)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.opex.store, actuals.opex.store, true)}`}>{calculateVar(forecast.opex.store, actuals.opex.store)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-600">Sales Agent Commission</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.opex.agents)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.opex.agents)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.opex.agents, actuals.opex.agents, true)}`}>{calculateVar(forecast.opex.agents, actuals.opex.agents)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-600">Non-Prod Staff Payroll</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.opex.payroll)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.opex.payroll)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.opex.payroll, actuals.opex.payroll, true)}`}>{calculateVar(forecast.opex.payroll, actuals.opex.payroll)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-600">Staff Development & Training</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.opex.training)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.opex.training)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.opex.training, actuals.opex.training, true)}`}>{calculateVar(forecast.opex.training, actuals.opex.training)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-600">R & D Investment</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.opex.rd)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.opex.rd)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.opex.rd, actuals.opex.rd, true)}`}>{calculateVar(forecast.opex.rd, actuals.opex.rd)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-600">Other Overhead (Admin/Util)</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.opex.other)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.opex.other)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.opex.other, actuals.opex.other, true)}`}>{calculateVar(forecast.opex.other, actuals.opex.other)}</td>
                                   </tr>
                                   
                                   <tr className="font-bold bg-slate-50 border-t border-slate-200">
                                       <td className="py-2 px-4">Total Operating Expenses</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(forecast.opex.total)}</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(actuals.opex.total)}</td>
                                       <td className={`py-2 px-4 text-right ${getVarColor(forecast.opex.total, actuals.opex.total, true)}`}>{calculateVar(forecast.opex.total, actuals.opex.total)}</td>
                                   </tr>

                                   {/* EBITDA */}
                                   <tr className="font-bold">
                                       <td className="py-2 px-4">EBITDA</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(forecast.ebitda)}</td>
                                       <td className="py-2 px-4 text-right">{formatCurrency(actuals.ebitda)}</td>
                                       <td className={`py-2 px-4 text-right ${getVarColor(forecast.ebitda, actuals.ebitda)}`}>{calculateVar(forecast.ebitda, actuals.ebitda)}</td>
                                   </tr>

                                   {/* Depreciation & Interest */}
                                   <tr>
                                       <td className="py-1 px-8 text-slate-500">Less: Depreciation</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.depreciation)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.depreciation)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.depreciation, actuals.depreciation, true)}`}>{calculateVar(forecast.depreciation, actuals.depreciation)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-500">Less: Interest Expense</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.interest)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.interest)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.interest, actuals.interest, true)}`}>{calculateVar(forecast.interest, actuals.interest)}</td>
                                   </tr>

                                   {/* EBT & Tax */}
                                   <tr className="font-bold border-t border-slate-100">
                                       <td className="py-1.5 px-4">Earnings Before Tax (EBT)</td>
                                       <td className="py-1.5 px-4 text-right">{formatCurrency(forecast.ebt)}</td>
                                       <td className="py-1.5 px-4 text-right">{formatCurrency(actuals.ebt)}</td>
                                       <td className={`py-1.5 px-4 text-right ${getVarColor(forecast.ebt, actuals.ebt)}`}>{calculateVar(forecast.ebt, actuals.ebt)}</td>
                                   </tr>
                                   <tr>
                                       <td className="py-1 px-8 text-slate-500">Less: Taxation (28%)</td>
                                       <td className="py-1 px-4 text-right">{formatCurrency(forecast.tax)}</td>
                                       <td className="py-1 px-4 text-right text-slate-400">{formatCurrency(actuals.tax)}</td>
                                       <td className={`py-1 px-4 text-right ${getVarColor(forecast.tax, actuals.tax, true)}`}>{calculateVar(forecast.tax, actuals.tax)}</td>
                                   </tr>

                                   {/* Net Profit */}
                                   <tr className="font-black text-base bg-emerald-50 text-emerald-950 border-t-2 border-b-2 border-emerald-300">
                                       <td className="py-3 px-4">Net Profit After Tax</td>
                                       <td className="py-3 px-4 text-right">{formatCurrency(forecast.netProfit)}</td>
                                       <td className="py-3 px-4 text-right">{formatCurrency(actuals.netProfit)}</td>
                                       <td className={`py-3 px-4 text-right ${getVarColor(forecast.netProfit, actuals.netProfit)}`}>{calculateVar(forecast.netProfit, actuals.netProfit)}</td>
                                   </tr>
                               </tbody>
                               </table>
                           </div>
                      </div>
                  </div>

              </div>
          )}

           {/* 3. BALANCE SHEET */}
           {activeTab === 'balance' && (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                   
                   {/* Assets Table */}
                   <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                       <h3 className="text-lg font-bold text-slate-800 mb-4">Assets</h3>
                       <table className="w-full text-sm">
                           <thead>
                               <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                   <th className="py-2 px-3 text-left">Asset Item</th>
                                   <th className="py-2 px-3 text-right">Forecast Year {currentTeam.currentPeriod}</th>
                                   <th className="py-2 px-3 text-right">Actual Year {currentTeam.currentPeriod - 1}</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               <tr className="font-bold bg-slate-50/50">
                                   <td className="py-2 px-3">Non-Current Assets (Fixed Assets Net)</td>
                                   <td className="py-2 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.fixedAssets)}</td>
                                   <td className="py-2 px-3 text-right font-mono text-slate-600">{formatCurrency(actuals.balanceSheet.fixedAssets)}</td>
                               </tr>
                               <tr className="font-bold bg-slate-50/50 border-t border-slate-200">
                                   <td className="py-2 px-3" colSpan={3}>Current Assets</td>
                               </tr>
                               <tr>
                                   <td className="py-1.5 px-6 text-slate-600">- Cash & Cash Equivalents</td>
                                   <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.cash)}</td>
                                   <td className="py-1.5 px-3 text-right font-mono text-slate-400">{formatCurrency(actuals.balanceSheet.cash)}</td>
                               </tr>
                               <tr>
                                   <td className="py-1.5 px-6 text-slate-600">- Accounts Receivable (Debtors)</td>
                                   <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.receivables)}</td>
                                   <td className="py-1.5 px-3 text-right font-mono text-slate-400">{formatCurrency(actuals.balanceSheet.receivables)}</td>
                               </tr>
                               <tr>
                                   <td className="py-1.5 px-6 text-slate-600">- Inventories (Raw + Finished Goods)</td>
                                   <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.inventory)}</td>
                                   <td className="py-1.5 px-3 text-right font-mono text-slate-400">{formatCurrency(actuals.balanceSheet.inventory)}</td>
                               </tr>
                               <tr className="font-semibold bg-slate-100/50">
                                   <td className="py-2 px-3">Total Current Assets</td>
                                   <td className="py-2 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.cash + forecast.balanceSheet.receivables + forecast.balanceSheet.inventory)}</td>
                                   <td className="py-2 px-3 text-right font-mono text-slate-600">{formatCurrency(actuals.balanceSheet.cash + actuals.balanceSheet.receivables + actuals.balanceSheet.inventory)}</td>
                               </tr>
                               <tr className="font-bold bg-blue-50 text-blue-950 border-t-2 border-slate-300">
                                   <td className="py-2.5 px-3">Total Assets</td>
                                   <td className="py-2.5 px-3 text-right font-mono text-blue-700">{formatCurrency(forecast.balanceSheet.totalAssets)}</td>
                                   <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(actuals.balanceSheet.totalAssets)}</td>
                               </tr>
                           </tbody>
                       </table>
                   </div>

                   {/* Liabilities & Equity Table */}
                   <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                       <h3 className="text-lg font-bold text-slate-800 mb-4">Liabilities & Shareholders' Equity</h3>
                       <table className="w-full text-sm">
                           <thead>
                               <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                   <th className="py-2 px-3 text-left">Liabilities / Equity Item</th>
                                   <th className="py-2 px-3 text-right">Forecast Year {currentTeam.currentPeriod}</th>
                                   <th className="py-2 px-3 text-right">Actual Year {currentTeam.currentPeriod - 1}</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               <tr className="font-bold bg-slate-50/50">
                                   <td className="py-2 px-3" colSpan={3}>Shareholders' Equity</td>
                               </tr>
                               <tr>
                                   <td className="py-1.5 px-6 text-slate-600">- Opening Equity</td>
                                   <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(actuals.balanceSheet.equity)}</td>
                                   <td className="py-1.5 px-3 text-right font-mono text-slate-400">{formatCurrency((actuals.balanceSheet as any).openingEquity ?? 0)}</td>
                               </tr>
                               <tr>
                                   <td className="py-1.5 px-6 text-slate-600">- Net Profit for the Period</td>
                                   <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(forecast.netProfit)}</td>
                                   <td className="py-1.5 px-3 text-right font-mono text-slate-400">{formatCurrency(actuals.netProfit)}</td>
                               </tr>
                               <tr className="font-semibold bg-emerald-50/50 text-emerald-950">
                                   <td className="py-2 px-3">Total Shareholders' Equity</td>
                                   <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(forecast.balanceSheet.equity)}</td>
                                   <td className="py-2 px-3 text-right font-mono text-slate-700">{formatCurrency(actuals.balanceSheet.equity)}</td>
                               </tr>

                               <tr className="font-bold bg-slate-50/50 border-t border-slate-200">
                                   <td className="py-2 px-3" colSpan={3}>Liabilities</td>
                               </tr>
                               <tr>
                                   <td className="py-1.5 px-6 text-slate-600">- Long-Term Loans & Debt</td>
                                   <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.longTermDebt)}</td>
                                   <td className="py-1.5 px-3 text-right font-mono text-slate-400">{formatCurrency(actuals.balanceSheet.longTermDebt)}</td>
                               </tr>
                               <tr>
                                   <td className="py-1.5 px-6 text-slate-600">- Current Liabilities (Payables/Overdraft)</td>
                                   <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.currentLiabilities)}</td>
                                   <td className="py-1.5 px-3 text-right font-mono text-slate-400">{formatCurrency(actuals.balanceSheet.currentLiabilities)}</td>
                               </tr>
                               <tr className="font-semibold bg-slate-100/50">
                                   <td className="py-2 px-3">Total Liabilities</td>
                                   <td className="py-2 px-3 text-right font-mono">{formatCurrency(forecast.balanceSheet.longTermDebt + forecast.balanceSheet.currentLiabilities)}</td>
                                   <td className="py-2 px-3 text-right font-mono text-slate-600">{formatCurrency((actuals.balanceSheet as any).totalLiabilities ?? (actuals.balanceSheet.longTermDebt + actuals.balanceSheet.currentLiabilities))}</td>
                               </tr>
                               <tr className="font-bold bg-blue-50 text-blue-950 border-t-2 border-slate-300">
                                   <td className="py-2.5 px-3">Total Liabilities & Equity</td>
                                   <td className="py-2.5 px-3 text-right font-mono text-blue-700">{formatCurrency(forecast.balanceSheet.totalLiabilitiesAndEquity)}</td>
                                   <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(actuals.balanceSheet.totalLiabilitiesAndEquity)}</td>
                               </tr>
                           </tbody>
                       </table>
                   </div>

               </div>
           )}

          {/* 4. CASH FLOW STATEMENT */}
          {activeTab === 'cashflow' && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-4xl mx-auto">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Cash Flow Statement Forecast</h3>
                  <table className="w-full text-sm">
                      <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                              <th className="py-2.5 px-4 text-left">Cash Flow Activity</th>
                              <th className="py-2.5 px-4 text-right">Forecast Year {currentTeam.currentPeriod}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                          <tr>
                              <td className="py-2 px-4 font-sans text-slate-700">Cash Flow from Operating Activities (Net Profit + Depr)</td>
                              <td className="py-2 px-4 text-right font-bold text-slate-900">{formatCurrency(forecast.cashFlow.operating)}</td>
                          </tr>
                          <tr>
                              <td className="py-2 px-4 font-sans text-slate-700">Cash Flow from Investing Activities (CapEx / Store Expansion)</td>
                              <td className="py-2 px-4 text-right text-rose-600">{formatCurrency(forecast.cashFlow.investing)}</td>
                          </tr>
                          <tr>
                              <td className="py-2 px-4 font-sans text-slate-700">Cash Flow from Financing Activities (Debt / Equity Changes)</td>
                              <td className="py-2 px-4 text-right text-blue-600">{formatCurrency(forecast.cashFlow.financing)}</td>
                          </tr>
                          <tr className="font-bold bg-slate-50 border-t-2 border-slate-200">
                              <td className="py-2.5 px-4 font-sans text-slate-900">Net Increase / (Decrease) in Cash</td>
                              <td className={`py-2.5 px-4 text-right font-black ${forecast.cashFlow.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatCurrency(forecast.cashFlow.net)}
                              </td>
                          </tr>
                          <tr>
                              <td className="py-2 px-4 font-sans text-slate-500">Add: Opening Cash Balance</td>
                              <td className="py-2 px-4 text-right text-slate-500">{formatCurrency(actuals.balanceSheet.cash)}</td>
                          </tr>
                          <tr className="font-extrabold text-base bg-blue-50 text-blue-900 border-t-2 border-b-2 border-blue-200">
                              <td className="py-3 px-4 font-sans">Ending Cash Balance</td>
                              <td className="py-3 px-4 text-right font-black">{formatCurrency(forecast.balanceSheet.cash)}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          )}

      </div>
    </div>
  );
};

export default FinancialReports;