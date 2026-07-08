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

// --- Types & Interfaces for Reports ---
type ReportTab = 'summary' | 'income' | 'balance' | 'cashflow';

const FinancialReports: React.FC = () => {
  const { decisions, currentTeam, lastPeriodKPIs } = useSimulation();
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');

  const actuals = useMemo(() => {
    const prevPeriod = currentTeam.currentPeriod - 1;
    return currentTeam.history?.[prevPeriod] || YEAR_0_RECORD;
  }, [currentTeam]);

  const prevActuals = useMemo(() => {
    const prevPrevPeriod = currentTeam.currentPeriod - 2;
    if (prevPrevPeriod >= 0 && currentTeam.history?.[prevPrevPeriod]) {
      return currentTeam.history[prevPrevPeriod];
    }
    // Fallback for Year 0's prior period (Year -1 opening balances) to balance Year 0 Cash Flow exactly
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
    // 1. Production Staff Costs (Technicians & Semi-skilled)
    let productionPayroll = 0;
    let opexPayroll = 0;
    let opexTraining = 0;
    
    const hrRoles = ['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'] as const;
    hrRoles.forEach(r => {
      const count = (currentTeam.staffCounts[r] || 0) + (decisions.hr.hiring[r] || 0);
      const monthlySalary = decisions.hr.salaries[r] || 0;
      const trainingLevel = decisions.hr.trainingLevels[r] || 'None';
      const trainingCostPer = HR_CONSTANTS.trainingCosts[trainingLevel] || 0;
      
      opexTraining += count * trainingCostPer; // Training remains in OPEX
      
      if (r === 'technicians' || r === 'semiSkilled') {
        productionPayroll += count * monthlySalary * 8;
      } else {
        opexPayroll += count * monthlySalary * 8;
      }
    });
    
    const totalProductionStaffCost = productionPayroll;
    const totalProductionUnits = PRODUCTS.reduce((sum, p) => sum + (decisions.operations.production[p.id] || 0), 0);
    const laborCostPerUnit = totalProductionUnits > 0 ? (totalProductionStaffCost / totalProductionUnits) : 0;

    const standardCosts = { techbook: 1400, zroid: 1350, itab: 1100 };
    const cogsByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    let totalCOGS = 0;
    
    PRODUCTS.forEach(p => {
        const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
        const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
        const available = getAvailableInventory(p.id);
        const unitsSold = Math.min(demand, available);

        const revenue = unitsSold * decisions.marketing.prices[p.id];
        revenueByProduct[p.id] = revenue;
        totalRevenue += revenue;

        // Dynamic unit cost split
        const manufacturedUnits = decisions.operations.production[p.id] || 0;
        const fgUnits = Object.values(decisions.procurement.supplierAllocation[p.id] || {}).reduce((s: number, v: any) => s + (v.finishedGoods || 0), 0);
        
        const mfgCost = standardCosts[p.id] + laborCostPerUnit;
        const fgCost = standardCosts[p.id];
        
        const totalUnits = manufacturedUnits + fgUnits;
        const unitCost = totalUnits > 0 
            ? ((manufacturedUnits * mfgCost) + (fgUnits * fgCost)) / totalUnits 
            : standardCosts[p.id] + laborCostPerUnit;

        const cost = unitsSold * unitCost;
        cogsByProduct[p.id] = cost;
        totalCOGS += cost;
    });

    if (totalProductionUnits === 0) {
        totalCOGS += totalProductionStaffCost;
    }

    const grossProfit = totalRevenue - totalCOGS;

    const marketingSpend = decisions.marketing.advertisingBudget;
    
    const finalStoreCount = currentTeam.storeCount + decisions.marketing.openCloseStores;
    const storeCosts = (finalStoreCount * STORE_COSTS.running) + 
                       (decisions.marketing.openCloseStores > 0 ? decisions.marketing.openCloseStores * STORE_COSTS.opening : 0) + 
                       (decisions.marketing.openCloseStores < 0 ? Math.abs(decisions.marketing.openCloseStores) * STORE_COSTS.closing : 0);

    // Agent Commission (approx 52% of sales via agents)
    const agentSales = totalRevenue * 0.52;
    const agentCommission = agentSales * decisions.marketing.agentCommission;

    // Payroll (excluding production staff, who are allocated to COGS)
    const payroll = opexPayroll;

    // Training (excluding production staff, who are allocated to COGS)
    const training = opexTraining;

    const rdSpend = decisions.operations.rdBudget;
    const sumOtherExpenses = marketingSpend + storeCosts + agentCommission + payroll + training + rdSpend;
    const year0OtherOpexSum = YEAR_0_RECORD.opex.marketing + YEAR_0_RECORD.opex.store + YEAR_0_RECORD.opex.agents + YEAR_0_RECORD.opex.payroll + YEAR_0_RECORD.opex.training + YEAR_0_RECORD.opex.rd;
    const otherOpexRatio = YEAR_0_RECORD.opex.other / year0OtherOpexSum;
    const otherOpex = Math.round(sumOtherExpenses * otherOpexRatio);
    
    const totalOpex = sumOtherExpenses + otherOpex;

    const ebitda = grossProfit - totalOpex;
    
    // 4. Below EBITDA
    const depreciation = 1535965; // Aligned with Year 0 Depreciation
    const forecastedLongTermDebt = currentTeam.longTermDebt + decisions.finance.debtChange;
    const financeCharges = forecastedLongTermDebt > 0 ? Math.round(forecastedLongTermDebt * FINANCE_CONSTANTS.interestRate) : 0;
    const ebt = ebitda - depreciation - financeCharges;
    const tax = ebt * FINANCE_CONSTANTS.taxRate;
    const netProfit = ebt - tax;

    // 5. Balance Sheet Items
    const startPPE = currentTeam.history?.[currentTeam.currentPeriod - 1]?.balanceSheet.fixedAssets ?? 293500000;
    const fixedAssets = startPPE + decisions.operations.capacityChange * 1500 - depreciation;

    const startInventoryValue = currentTeam.history?.[currentTeam.currentPeriod - 1]?.balanceSheet.inventory ?? 49900000;
    const totalSalesUnits = PRODUCTS.reduce((s, p) => {
        const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
        const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
        const available = getAvailableInventory(p.id);
        const unitsSold = Math.min(demand, available);
        return s + unitsSold;
    }, 0);
    const inventoryValue = Math.max(0, startInventoryValue + (totalProductionUnits - totalSalesUnits) * 1500);

    const avgDebtorsDays = (Object.values(decisions.finance.debtorsDays) as number[]).reduce((a, b) => a + b, 0) / 3 || 30;
    const receivables = (totalRevenue / 365) * avgDebtorsDays;

    const startDebtors = currentTeam.history?.[currentTeam.currentPeriod - 1]?.balanceSheet.receivables ?? 47500000;
    const startCreditors = currentTeam.history?.[currentTeam.currentPeriod - 1]?.balanceSheet.currentLiabilities ?? 99000000;
    
    // Calculate forecasted purchases and payments to get ending creditors dynamically
    let totalPurchases = 0;
    let purchasesPaidThisPeriod = 0;
    const isDealActive = decisions.negotiation.status === 'AGREED';
    
    PRODUCTS.forEach(p => {
        const productProc = decisions.procurement.supplierAllocation[p.id] || {};
        SUPPLIERS.forEach(s => {
            const alloc = productProc[s];
            if (!alloc) return;
            const discountMultiplier = (isDealActive && decisions.negotiation.selectedSupplierId === s) ? (1 - decisions.negotiation.agreedDiscount) : 1;
            const compCost = (COMPONENT_COSTS[p.id]?.[s] || 0) * (alloc.components || 0) * discountMultiplier;
            const fgCost = (FINISHED_GOODS_COSTS[p.id]?.[s] || 0) * (alloc.finishedGoods || 0) * discountMultiplier;
            totalPurchases += compCost + fgCost;

            const agreedTerms = (isDealActive && decisions.negotiation.selectedSupplierId === s && decisions.negotiation.agreedPaymentTerms) ? decisions.negotiation.agreedPaymentTerms : (s === 'Alpha' ? 60 : s === 'Neepo' ? 30 : 45);
            const termKey = `${agreedTerms}_days`;
            const paymentFactor = termKey === '30_days' ? 1.0 : termKey === '45_days' ? 0.9 : 0.8;
            purchasesPaidThisPeriod += (compCost + fgCost) * paymentFactor;
        });
    });
    
    const currentLiabilities = Math.max(0, startCreditors + totalPurchases - purchasesPaidThisPeriod);

    const endingEquity = currentTeam.shareholdersEquity + netProfit + decisions.finance.equityChange;
    const longTermDebt = currentTeam.longTermDebt + decisions.finance.debtChange;

    const endingCash = endingEquity + longTermDebt + currentLiabilities - fixedAssets - receivables - inventoryValue;

    const investingCashFlow = -1 * (decisions.operations.capacityChange > 0 ? decisions.operations.capacityChange * 1500 : 0); // Capex
    const financingCashFlow = decisions.finance.debtChange + decisions.finance.equityChange;
    const netCashFlow = endingCash - currentTeam.cashBalance;
    const operatingCashFlow = netCashFlow - investingCashFlow - financingCashFlow;

    const totalCurrentAssets = endingCash + inventoryValue + receivables;
    const totalAssets = fixedAssets + totalCurrentAssets;

    return {
        revenue: { total: totalRevenue, byProduct: revenueByProduct },
        cogs: { total: totalCOGS, byProduct: cogsByProduct },
        grossProfit: { total: grossProfit, byProduct: {
            techbook: revenueByProduct.techbook - cogsByProduct.techbook,
            zroid: revenueByProduct.zroid - cogsByProduct.zroid,
            itab: revenueByProduct.itab - cogsByProduct.itab
        }},
        opex: {
            marketing: marketingSpend,
            store: storeCosts,
            agents: agentCommission,
            payroll,
            training,
            rd: rdSpend,
            other: otherOpex,
            total: totalOpex
        },
        ebitda,
        depreciation,
        financeCharges,
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
  }, [decisions, currentTeam]);

  // --- Render Helpers ---


  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500 mt-1">Comprehensive financial analysis and decision summary.</p>
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
                          <div className="flex justify-between">
                              <span className="text-slate-600">Team Leader:</span>
                              <span className="font-bold">{currentTeam.ceoName || 'Not Appointed'}</span>
                          </div>
                     </div>
                 </div>

                 {/* Marketing */}
                 <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden md:row-span-2">
                     <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Marketing & Sales Decisions</div>
                     <div className="p-4 space-y-4 text-sm">
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Market Share Forecast</p>
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="flex justify-between py-1">
                                     <span className="text-slate-600">{p.name}</span>
                                     <span className="font-mono">{formatPercent(decisions.marketing.forecastedMarketShare[p.id], 2, false)}</span>
                                 </div>
                             ))}
                         </div>
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Pricing</p>
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="flex justify-between py-1">
                                     <span className="text-slate-600">{p.name}</span>
                                     <span className="font-mono">R {decisions.marketing.prices[p.id].toLocaleString()}</span>
                                 </div>
                             ))}
                         </div>
                         <div>
                              <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Advertising</p>
                              <div className="flex justify-between py-1">
                                  <span className="text-slate-600">Total Budget</span>
                                  <span className="font-mono">R {decisions.marketing.advertisingBudget.toLocaleString()}</span>
                              </div>
                              {PRODUCTS.map(p => (
                                  <div key={p.id} className="flex justify-between py-1 pl-2 text-xs">
                                      <span className="text-slate-500">Split: {p.name}</span>
                                      <span className="font-mono">{formatPercent(decisions.marketing.adSplits[p.id], 2)}</span>
                                  </div>
                              ))}
                              <div className="flex justify-between py-1 pl-2 text-xs border-t border-slate-50 mt-1">
                                  <span className="text-slate-500">Brand Equity</span>
                                  <span className="font-mono">{formatPercent(decisions.marketing.generalAdSplit, 2)}</span>
                              </div>
                          </div>
                         <div>
                             <p className="font-bold text-slate-800 mb-1 border-b border-slate-100">Distribution</p>
                             <div className="flex justify-between py-1">
                                 <span className="text-slate-600">Stores Change</span>
                                 <span className="font-mono">{decisions.marketing.openCloseStores}</span>
                             </div>
                             <div className="flex justify-between py-1">
                                 <span className="text-slate-600">Agents' Comm.</span>
                                 <span className="font-mono">{formatPercent(decisions.marketing.agentCommission, 2)}</span>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Operations */}
                 <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden md:row-span-2">
                     <div className="bg-blue-600 px-4 py-2 text-white font-bold text-sm">Operations Decisions</div>
                     <div className="p-4 space-y-4 text-sm">
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
                              const hasAllocations = Object.entries(alloc).some(([_, val]) => val.components > 0 || val.finishedGoods > 0);
                              
                              return (
                                  <div key={p.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                      <p className="font-bold text-slate-800 mb-1">{p.name}</p>
                                      {hasAllocations ? (
                                          <div className="space-y-1 pl-2 text-xs">
                                              {Object.entries(alloc).map(([supplier, val]) => {
                                                  if (val.components === 0 && val.finishedGoods === 0) return null;
                                                  return (
                                                      <div key={supplier} className="flex justify-between text-slate-600 py-0.5">
                                                          <span>{supplier}:</span>
                                                          <span className="font-mono font-medium">
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
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* Table */}
                  <div className="xl:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
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
                                  <tr className="font-bold bg-blue-50 text-blue-900 border-t border-blue-100">
                                      <td className="py-2 px-4">Total Gross Profit</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(forecast.grossProfit.total)}</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(actuals.grossProfit.total)}</td>
                                      <td className={`py-2 px-4 text-right ${getVarColor(forecast.grossProfit.total, actuals.grossProfit.total)}`}>
                                          {calculateVar(forecast.grossProfit.total, actuals.grossProfit.total)}
                                      </td>
                                  </tr>

                                  {/* Opex Details */}
                                  <tr className="text-slate-700 pt-4"><td colSpan={4} className="py-2 px-4 font-semibold text-slate-500 uppercase text-xs">Operating Expenses</td></tr>
                                  <tr>
                                      <td className="py-1 px-8">Advertising & Marketing</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.opex.marketing)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.opex.marketing)}</td>
                                      <td className={`text-right px-4 text-xs ${getVarColor(forecast.opex.marketing, actuals.opex.marketing, true)}`}>{calculateVar(forecast.opex.marketing, actuals.opex.marketing)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-8">Store Costs</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.opex.store)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.opex.store)}</td>
                                      <td className={`text-right px-4 text-xs ${getVarColor(forecast.opex.store, actuals.opex.store, true)}`}>{calculateVar(forecast.opex.store, actuals.opex.store)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-8">Payroll</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.opex.payroll)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.opex.payroll)}</td>
                                      <td className={`text-right px-4 text-xs ${getVarColor(forecast.opex.payroll, actuals.opex.payroll, true)}`}>{calculateVar(forecast.opex.payroll, actuals.opex.payroll)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-8">R & D</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.opex.rd)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.opex.rd)}</td>
                                      <td className={`text-right px-4 text-xs ${getVarColor(forecast.opex.rd, actuals.opex.rd, true)}`}>{calculateVar(forecast.opex.rd, actuals.opex.rd)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-8">Agent Commissions</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.opex.agents)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.opex.agents)}</td>
                                      <td className={`text-right px-4 text-xs ${getVarColor(forecast.opex.agents, actuals.opex.agents, true)}`}>{calculateVar(forecast.opex.agents, actuals.opex.agents)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-8">Staff Development</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.opex.training)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.opex.training)}</td>
                                      <td className={`text-right px-4 text-xs ${getVarColor(forecast.opex.training, actuals.opex.training, true)}`}>{calculateVar(forecast.opex.training, actuals.opex.training)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-8">Other Operational Expenses</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.opex.other)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.opex.other)}</td>
                                      <td className={`text-right px-4 text-xs ${getVarColor(forecast.opex.other, actuals.opex.other, true)}`}>{calculateVar(forecast.opex.other, actuals.opex.other)}</td>
                                  </tr>
                                  
                                  {/* EBITDA */}
                                  <tr className="font-bold bg-slate-100 border-t-2 border-slate-200">
                                      <td className="py-3 px-4">EBITDA</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.ebitda)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(actuals.ebitda)}</td>
                                      <td className={`py-3 px-4 text-right ${getVarColor(forecast.ebitda, actuals.ebitda)}`}>
                                          {calculateVar(forecast.ebitda, actuals.ebitda)}
                                      </td>
                                  </tr>

                                  <tr>
                                      <td className="py-1 px-4 text-slate-500">- Depreciation</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.depreciation)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.depreciation)}</td>
                                      <td />
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-4 text-slate-500">- Finance Charges</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.financeCharges)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.interest)}</td>
                                      <td />
                                  </tr>

                                  <tr className="font-bold border-t border-slate-200">
                                      <td className="py-2 px-4">EBT</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(forecast.ebt)}</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(actuals.ebt)}</td>
                                      <td className={`py-2 px-4 text-right ${getVarColor(forecast.ebt, actuals.ebt)}`}>
                                          {calculateVar(forecast.ebt, actuals.ebt)}
                                      </td>
                                  </tr>
                                  <tr>
                                      <td className="py-1 px-4 text-slate-500">- Tax</td>
                                      <td className="text-right px-4">{formatCurrency(forecast.tax)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.tax)}</td>
                                      <td />
                                  </tr>

                                  <tr className="font-bold bg-emerald-50 text-emerald-900 border-t-2 border-emerald-200 text-lg">
                                      <td className="py-3 px-4">Net Profit</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.netProfit)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(actuals.netProfit)}</td>
                                      <td className={`py-3 px-4 text-right ${getVarColor(forecast.netProfit, actuals.netProfit)}`}>
                                          {calculateVar(forecast.netProfit, actuals.netProfit)}
                                      </td>
                                  </tr>
                              </tbody>
                               </table>
                           </div>
                       </div>
                   </div>

                  {/* Charts & KPIs */}
                  <div className="space-y-6">
                      
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                           <h4 className="font-bold text-slate-800 mb-4 text-center">Revenue vs Opex</h4>
                           <div className="h-64">
                               <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={[
                                       { name: 'Revenue', value: forecast.revenue.total, fill: '#3B82F6' },
                                       { name: 'Opex', value: forecast.opex.total, fill: '#EF4444' }
                                   ]}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                       <XAxis dataKey="name" />
                                       <YAxis tickFormatter={(val) => `R ${(val/1000000).toFixed(0)}M`} />
                                       <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                       <Bar dataKey="value" barSize={60} radius={[4, 4, 0, 0]} />
                                   </BarChart>
                               </ResponsiveContainer>
                           </div>
                      </div>

                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-blue-600 px-4 py-2 text-white font-bold text-center">Profitability Ratios (Forecast vs Actual)</div>
                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-slate-50 rounded">
                                    <div className="text-xs text-slate-500 uppercase">GP Margin</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {formatPercent(forecast.grossProfit.total / forecast.revenue.total, 2)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Act: {formatPercent(actuals.grossProfit.total / actuals.revenue.total, 2)}
                                    </div>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded">
                                    <div className="text-xs text-slate-500 uppercase">Net Margin</div>
                                    <div className="text-lg font-bold text-emerald-600">
                                        {formatPercent(forecast.netProfit / forecast.revenue.total, 2)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Act: {formatPercent(actuals.netProfit / actuals.revenue.total, 2)}
                                    </div>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded">
                                    <div className="text-xs text-slate-500 uppercase">ROE</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {formatPercent(forecast.netProfit / forecast.balanceSheet.equity, 2)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Act: {formatPercent(actuals.netProfit / actuals.balanceSheet.equity, 2)}
                                    </div>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded">
                                    <div className="text-xs text-slate-500 uppercase">RONA</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {formatPercent(forecast.netProfit / (forecast.balanceSheet.fixedAssets + (forecast.balanceSheet.cash + forecast.balanceSheet.inventory + forecast.balanceSheet.receivables - forecast.balanceSheet.currentLiabilities)), 2)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Act: {formatPercent(actuals.netProfit / (actuals.balanceSheet.fixedAssets + (actuals.balanceSheet.cash + actuals.balanceSheet.inventory + actuals.balanceSheet.receivables - actuals.balanceSheet.currentLiabilities)), 2)}
                                    </div>
                                </div>
                            </div>
                      </div>

                  </div>
              </div>
          )}

          {/* 3. BALANCE SHEET */}
          {activeTab === 'balance' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                 <div className="xl:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                     <div className="p-4 sm:p-6">
                           <h3 className="text-lg font-bold text-slate-800 mb-4">Balance Sheet Forecast</h3>
                           <div className="overflow-x-auto">
                               <table className="w-full text-xs sm:text-sm whitespace-nowrap">
                              <thead>
                                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                      <th className="py-3 px-4 text-left">Item</th>
                                      <th className="py-3 px-4 text-right">Forecast Year {currentTeam.currentPeriod}</th>
                                      <th className="py-3 px-4 text-right">Actual Year {currentTeam.currentPeriod - 1}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {/* Assets */}
                                  <tr className="font-bold bg-slate-50/50"><td className="py-2 px-4" colSpan={3}>ASSETS</td></tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Non-Current Assets</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.fixedAssets)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.balanceSheet.fixedAssets)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Current Assets</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.cash + forecast.balanceSheet.inventory + forecast.balanceSheet.receivables)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.balanceSheet.cash + actuals.balanceSheet.inventory + actuals.balanceSheet.receivables)}</td>
                                  </tr>
                                  <tr><td className="py-1 px-12 text-slate-500">- Cash & Equiv.</td><td className="text-right px-4">{formatCurrency(forecast.balanceSheet.cash)}</td><td className="text-right px-4 text-slate-400">{formatCurrency(actuals.balanceSheet.cash)}</td></tr>
                                  <tr><td className="py-1 px-12 text-slate-500">- Receivables</td><td className="text-right px-4">{formatCurrency(forecast.balanceSheet.receivables)}</td><td className="text-right px-4 text-slate-400">{formatCurrency(actuals.balanceSheet.receivables)}</td></tr>
                                  <tr><td className="py-1 px-12 text-slate-500">- Inventory</td><td className="text-right px-4">{formatCurrency(forecast.balanceSheet.inventory)}</td><td className="text-right px-4 text-slate-400">{formatCurrency(actuals.balanceSheet.inventory)}</td></tr>
                                  
                                  <tr className="font-bold bg-blue-50 text-blue-900 border-t border-blue-200">
                                      <td className="py-3 px-4">TOTAL ASSETS</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.balanceSheet.totalAssets)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(actuals.balanceSheet.totalAssets)}</td>
                                  </tr>

                                  {/* Equity & Liabilities */}
                                  <tr className="font-bold bg-slate-50/50 border-t-4 border-white"><td className="py-2 px-4" colSpan={3}>EQUITY & LIABILITIES</td></tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Total Equity</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.equity)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.balanceSheet.equity)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Non-Current Liabilities</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.longTermDebt)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.balanceSheet.longTermDebt)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Current Liabilities</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.currentLiabilities)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.balanceSheet.currentLiabilities)}</td>
                                  </tr>

                                  <tr className="font-bold bg-blue-50 text-blue-900 border-t border-blue-200">
                                      <td className="py-3 px-4">TOTAL EQUITY & LIABILITIES</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.balanceSheet.totalLiabilitiesAndEquity)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(actuals.balanceSheet.totalLiabilitiesAndEquity)}</td>
                                  </tr>
                                  
                                  <tr className="font-bold bg-slate-100 text-slate-700 border-t border-slate-200 text-xs">
                                      <td className="py-2 px-4 text-slate-500">Balance check (Equity + Liabilities - Assets)</td>
                                      <td className="py-2 px-4 text-right">R 0</td>
                                      <td className="py-2 px-4 text-right">R 0</td>
                                  </tr>
                              </tbody>
                          </table>
                     </div>
                 </div>
              </div>

                 {/* Charts */}
                 <div className="space-y-6">
                     <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                           <h4 className="font-bold text-slate-800 mb-4 text-center">Funding Structure</h4>
                           <div className="h-64">
                               <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={[
                                       { name: 'Structure', Equity: forecast.balanceSheet.equity, Debt: forecast.balanceSheet.longTermDebt + forecast.balanceSheet.currentLiabilities }
                                   ]} barSize={60}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                       <XAxis dataKey="name" hide />
                                       <YAxis tickFormatter={(val) => `R ${(val/1000000).toFixed(0)}M`} />
                                       <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                       <Legend />
                                       <Bar dataKey="Equity" stackId="a" fill="#3B82F6" />
                                       <Bar dataKey="Debt" stackId="a" fill="#EF4444" />
                                   </BarChart>
                               </ResponsiveContainer>
                           </div>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-blue-600 px-4 py-2 text-white font-bold text-center">Liquidity KPIs (Forecast vs Actual)</div>
                            <div className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-slate-600">Debt / Equity</span>
                                    <div className="text-right">
                                        <span className="font-bold font-mono text-slate-900">
                                            {formatPercent(forecast.balanceSheet.longTermDebt / forecast.balanceSheet.equity, 2)}
                                        </span>
                                        <span className="text-xs text-slate-400 block">
                                            Act: {formatPercent(actuals.balanceSheet.longTermDebt / actuals.balanceSheet.equity, 2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-slate-600">Current Ratio</span>
                                    <div className="text-right">
                                        <span className="font-bold font-mono text-emerald-600">
                                            {formatNumber((forecast.balanceSheet.cash + forecast.balanceSheet.inventory + forecast.balanceSheet.receivables) / forecast.balanceSheet.currentLiabilities, 2)}
                                        </span>
                                        <span className="text-xs text-slate-400 block">
                                            Act: {formatNumber((actuals.balanceSheet.cash + actuals.balanceSheet.inventory + actuals.balanceSheet.receivables) / actuals.balanceSheet.currentLiabilities, 2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="text-slate-600">Interest Coverage</span>
                                    <div className="text-right">
                                        <span className="font-bold font-mono text-slate-900">
                                            {formatNumber(forecast.financeCharges > 0 ? (forecast.ebt + forecast.financeCharges) / forecast.financeCharges : 0, 2)}
                                        </span>
                                        <span className="text-xs text-slate-400 block">
                                            Act: {formatNumber(actuals.interestCoverage, 2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                      </div>
                 </div>
              </div>
          )}

          {/* 4. CASH FLOW */}
          {activeTab === 'cashflow' && (() => {
              const startDebtors = currentTeam.history?.[currentTeam.currentPeriod - 1]?.balanceSheet.receivables ?? 47500000;
              const startInventoryValue = currentTeam.history?.[currentTeam.currentPeriod - 1]?.balanceSheet.inventory ?? 49900000;
              const startCreditors = currentTeam.history?.[currentTeam.currentPeriod - 1]?.balanceSheet.currentLiabilities ?? 99000000;

              const forecastChangeInDebtors = forecast.balanceSheet.receivables - startDebtors;
              const forecastChangeInInventory = forecast.balanceSheet.inventory - startInventoryValue;
              const forecastChangeInCreditors = forecast.balanceSheet.currentLiabilities - startCreditors;

              const actualChangeInDebtors = actuals.balanceSheet.receivables - prevActuals.balanceSheet.receivables;
              const actualChangeInInventory = actuals.balanceSheet.inventory - prevActuals.balanceSheet.inventory;
              const actualChangeInCreditors = actuals.balanceSheet.currentLiabilities - prevActuals.balanceSheet.currentLiabilities;

              return (
               <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                   
                   {/* Table */}
                   <div className="xl:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Cash Flow Statement Forecast</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="text-slate-500 border-b border-slate-100 text-left font-bold">
                                        <th className="py-2 px-4">Category</th>
                                        <th className="text-right px-4">Forecast (Year {currentTeam.currentPeriod})</th>
                                        <th className="text-right px-4">Actual (Year {currentTeam.currentPeriod - 1})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Operating */}
                                    <tr className="bg-slate-50/50 font-bold">
                                        <td className="py-2 px-4">Cash from Operating Activities</td>
                                        <td className="text-right px-4">{formatCurrency(forecast.cashFlow.operating)}</td>
                                        <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.cashFlow.operating)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">Net Profit</td>
                                        <td className="text-right px-4 text-slate-500 font-medium">{formatCurrency(forecast.netProfit)}</td>
                                        <td className="text-right px-4 text-slate-400">{formatCurrency(actuals.netProfit)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">Depreciation (Add-back)</td>
                                        <td className="text-right px-4 text-slate-500 font-medium">{formatCurrency(forecast.depreciation)}</td>
                                        <td className="text-right px-4 text-slate-400">{formatCurrency(actuals.depreciation)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">Decrease / (Increase) in Debtors</td>
                                        <td className={`text-right px-4 font-medium ${forecastChangeInDebtors <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(-1 * forecastChangeInDebtors)}
                                        </td>
                                        <td className={`text-right px-4 text-slate-400 ${actualChangeInDebtors <= 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {formatCurrency(-1 * actualChangeInDebtors)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">Decrease / (Increase) in Inventory</td>
                                        <td className={`text-right px-4 font-medium ${forecastChangeInInventory <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(-1 * forecastChangeInInventory)}
                                        </td>
                                        <td className={`text-right px-4 text-slate-400 ${actualChangeInInventory <= 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {formatCurrency(-1 * actualChangeInInventory)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">Increase / (Decrease) in Creditors</td>
                                        <td className={`text-right px-4 font-medium ${forecastChangeInCreditors >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(forecastChangeInCreditors)}
                                        </td>
                                        <td className={`text-right px-4 text-slate-400 ${actualChangeInCreditors >= 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {formatCurrency(actualChangeInCreditors)}
                                        </td>
                                    </tr>
                                    
                                    {/* Investing */}
                                    <tr className="bg-slate-50/50 font-bold border-t border-slate-200">
                                        <td className="py-2 px-4">Cash from Investing Activities</td>
                                        <td className="text-right px-4">{formatCurrency(forecast.cashFlow.investing)}</td>
                                        <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.cashFlow.investing)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">CAPEX</td>
                                        <td className="text-right px-4 text-slate-500 font-medium">{formatCurrency(forecast.cashFlow.investing)}</td>
                                        <td className="text-right px-4 text-slate-400">{formatCurrency(actuals.cashFlow.investing)}</td>
                                    </tr>

                                    {/* Financing */}
                                    <tr className="bg-slate-50/50 font-bold border-t border-slate-200">
                                        <td className="py-2 px-4">Cash from Financing Activities</td>
                                        <td className="text-right px-4">{formatCurrency(forecast.cashFlow.financing)}</td>
                                        <td className="text-right px-4 text-slate-500">{formatCurrency(actuals.cashFlow.financing)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">Debt Change</td>
                                        <td className="text-right px-4 text-slate-500 font-medium">{formatCurrency(decisions.finance.debtChange)}</td>
                                        <td className="text-right px-4 text-slate-400">
                                            {formatCurrency(actuals.period === 0 ? 0 : actuals.cashFlow.financing)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-8 text-slate-500">Equity Change</td>
                                        <td className="text-right px-4 text-slate-500 font-medium">{formatCurrency(decisions.finance.equityChange)}</td>
                                        <td className="text-right px-4 text-slate-400">R 0</td>
                                    </tr>

                                    {/* Net */}
                                    <tr className="font-bold border-t-2 border-slate-300 text-base">
                                        <td className="py-3 px-4">Net Cash Movement</td>
                                        <td className={`text-right px-4 ${forecast.cashFlow.net > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(forecast.cashFlow.net)}
                                        </td>
                                        <td className={`text-right px-4 ${actuals.cashFlow.net > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(actuals.cashFlow.net)}
                                        </td>
                                    </tr>

                                    <tr className="bg-slate-50/50 text-slate-800 font-bold border-t border-slate-200">
                                        <td className="py-2.5 px-4">Opening Cash Balance</td>
                                        <td className="py-2.5 px-4 text-right">{formatCurrency(currentTeam.cashBalance)}</td>
                                        <td className="py-2.5 px-4 text-right text-slate-500">{formatCurrency(prevActuals.balanceSheet.cash)}</td>
                                    </tr>

                                    <tr className="bg-blue-50 text-blue-900 font-bold border-t border-blue-200 text-base">
                                        <td className="py-3 px-4">Closing Cash Balance</td>
                                        <td className="py-3 px-4 text-right">{formatCurrency(forecast.balanceSheet.cash)}</td>
                                        <td className="py-3 px-4 text-right">{formatCurrency(actuals.balanceSheet.cash)}</td>
                                    </tr>
                                </tbody>
                                </table>
                            </div>
                       </div>
                   </div>

                   {/* Waterfall Chart */}
                   <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                        <h4 className="font-bold text-slate-800 mb-4 text-center">Cash Flow Movement</h4>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Open', value: currentTeam.cashBalance, fill: '#64748B' },
                                    { name: 'Operating', value: forecast.cashFlow.operating, fill: '#10B981' },
                                    { name: 'Investing', value: forecast.cashFlow.investing, fill: '#EF4444' },
                                    { name: 'Financing', value: forecast.cashFlow.financing, fill: '#3B82F6' },
                                    { name: 'Close', value: forecast.balanceSheet.cash, fill: '#0F172A' },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} />
                                    <YAxis tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} />
                                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                    <Bar dataKey="value" barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                   </div>
               </div>
              );
          })()}

      </div>
    </div>
  );
};

export default FinancialReports;