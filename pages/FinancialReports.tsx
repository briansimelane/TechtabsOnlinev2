import React, { useState, useMemo } from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { PRODUCTS, MARKET_SIZES, STORE_COSTS, HR_CONSTANTS, FINANCE_CONSTANTS, COMPONENT_COSTS, LAST_YEAR_DATA } from '../constants';
import { ProductId, HRRole } from '../types';
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

  // --- Calculations (Forecast Logic) ---

  const forecast = useMemo(() => {
    // 1. Revenue
    const revenueByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    let totalRevenue = 0;
    
    PRODUCTS.forEach(p => {
        const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
        const units = Math.round((MARKET_SIZES[p.id] * share) / 100);
        const revenue = units * decisions.marketing.prices[p.id];
        revenueByProduct[p.id] = revenue;
        totalRevenue += revenue;
    });

    // 2. COGS (Approximation based on simple standard cost if procurement logic is complex)
    // We will use a simplified standard cost for forecast purposes
    const standardCosts = { techbook: 1400, zroid: 1350, itab: 1100 }; // blended mock cost
    const cogsByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    let totalCOGS = 0;

    PRODUCTS.forEach(p => {
         const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
         const units = Math.round((MARKET_SIZES[p.id] * share) / 100);
         const cost = units * standardCosts[p.id]; // Simplified
         cogsByProduct[p.id] = cost;
         totalCOGS += cost;
    });

    const grossProfit = totalRevenue - totalCOGS;

    // 3. Operating Expenses
    const marketingSpend = decisions.marketing.advertisingBudget + decisions.marketing.promoBudget;
    
    const finalStoreCount = currentTeam.storeCount + decisions.marketing.openCloseStores;
    const storeCosts = (finalStoreCount * STORE_COSTS.running) + 
                       (decisions.marketing.openCloseStores > 0 ? decisions.marketing.openCloseStores * STORE_COSTS.opening : 0) + 
                       (decisions.marketing.openCloseStores < 0 ? Math.abs(decisions.marketing.openCloseStores) * STORE_COSTS.closing : 0);

    // Agent Commission (approx 52% of sales via agents)
    const agentSales = totalRevenue * 0.52;
    const agentCommission = agentSales * decisions.marketing.agentCommission;

    // Payroll
    let payroll = 0;
    const roles: HRRole[] = ['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'];
    roles.forEach(r => {
        const count = (currentTeam.staffCounts[r] || 0) + (decisions.hr.hiring[r] || 0);
        payroll += count * decisions.hr.salaries[r] * 12;
    });

    // Training (Staff Development)
    let training = 0;
    roles.forEach(r => {
        const count = (currentTeam.staffCounts[r] || 0) + (decisions.hr.hiring[r] || 0);
        const level = decisions.hr.trainingLevels[r];
        training += count * HR_CONSTANTS.trainingCosts[level];
    });

    const rdSpend = decisions.operations.rdBudget;
    const otherOpex = 22049913; // Fixed/Mock from screenshot
    
    const totalOpex = marketingSpend + storeCosts + agentCommission + payroll + training + rdSpend + otherOpex;

    const ebitda = grossProfit - totalOpex;
    
    // 4. Below EBITDA
    const depreciation = 1542750; // Mock from screenshot
    const financeCharges = 1300000; // Mock
    const ebt = ebitda - depreciation - financeCharges;
    const tax = ebt * FINANCE_CONSTANTS.taxRate;
    const netProfit = ebt - tax;

    // 5. Balance Sheet Items
    // Cash: Opening + CashFlow (Simplified)
    // We need a cash flow calc to get ending cash.
    const operatingCashFlow = netProfit + depreciation; // Simplified
    const investingCashFlow = -1 * (decisions.operations.capacityChange > 0 ? decisions.operations.capacityChange * 1500 : 0); // Capex
    const financingCashFlow = decisions.finance.debtChange + decisions.finance.equityChange;
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    const endingCash = currentTeam.cashBalance + netCashFlow;

    const inventoryValue = 193475270; // Mock closing inventory valuation
    const receivables = (totalRevenue / 365) * 45; // Approx 45 days
    const totalCurrentAssets = endingCash + inventoryValue + receivables;
    
    const fixedAssets = 305416785; // Mock
    const totalAssets = fixedAssets + totalCurrentAssets;

    const endingEquity = currentTeam.shareholdersEquity + netProfit + decisions.finance.equityChange;
    const longTermDebt = currentTeam.longTermDebt + decisions.finance.debtChange;
    const currentLiabilities = 236598156; // Mock
    
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
                             <span className="font-bold">Admin User</span>
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
                                     <th className="text-right pb-1">Recruit</th>
                                     <th className="text-right pb-1">Salary</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                 {(['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'] as HRRole[]).map(r => (
                                     <tr key={r}>
                                         <td className="py-1 text-slate-700 capitalize">{r.replace(/([A-Z])/g, ' $1').trim()}</td>
                                         <td className="py-1 text-right font-mono">{decisions.hr.hiring[r]}</td>
                                         <td className="py-1 text-right font-mono">R {decisions.hr.salaries[r].toLocaleString()}</td>
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
                         <div className="flex justify-between border-b border-slate-100 pb-2">
                             <span className="text-slate-600">Debtors Days (Avg)</span>
                             <span className="font-bold">45 Days</span>
                         </div>
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
                                      <td className="py-2 px-4 text-right">{formatCurrency(lastPeriodKPIs.revenue)}</td>
                                      <td className="py-2 px-4 text-right text-emerald-600">12%</td>
                                  </tr>
                                  {PRODUCTS.map(p => (
                                      <tr key={`rev-${p.id}`}>
                                          <td className="py-1 px-8 text-slate-500">- {p.name} Revenue</td>
                                          <td className="py-1 px-4 text-right">{formatCurrency(forecast.revenue.byProduct[p.id])}</td>
                                          <td className="py-1 px-4 text-right text-slate-400">-</td>
                                          <td className="py-1 px-4 text-right">-</td>
                                      </tr>
                                  ))}
                                  
                                  {/* COGS */}
                                  <tr className="font-bold bg-slate-50/50 border-t border-slate-200">
                                      <td className="py-2 px-4">Total COGS</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(forecast.cogs.total)}</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(179499955)}</td>
                                      <td className="py-2 px-4 text-right text-red-500">24%</td>
                                  </tr>
                                  
                                  {/* Gross Profit */}
                                  <tr className="font-bold bg-blue-50 text-blue-900 border-t border-blue-100">
                                      <td className="py-2 px-4">Total Gross Profit</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(forecast.grossProfit.total)}</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(248269998)}</td>
                                      <td className="py-2 px-4 text-right text-emerald-600">44%</td>
                                  </tr>

                                  {/* Opex Details */}
                                  <tr className="text-slate-700 pt-4"><td colSpan={4} className="py-2 px-4 font-semibold text-slate-500 uppercase text-xs">Operating Expenses</td></tr>
                                  <tr><td className="py-1 px-8">Advertising & Marketing</td><td className="text-right px-4">{formatCurrency(forecast.opex.marketing)}</td><td className="text-right px-4 text-slate-400">-</td><td/></tr>
                                  <tr><td className="py-1 px-8">Store Costs</td><td className="text-right px-4">{formatCurrency(forecast.opex.store)}</td><td className="text-right px-4 text-slate-400">-</td><td/></tr>
                                  <tr><td className="py-1 px-8">Payroll</td><td className="text-right px-4">{formatCurrency(forecast.opex.payroll)}</td><td className="text-right px-4 text-slate-400">-</td><td/></tr>
                                  <tr><td className="py-1 px-8">R & D</td><td className="text-right px-4">{formatCurrency(forecast.opex.rd)}</td><td className="text-right px-4 text-slate-400">-</td><td/></tr>
                                  
                                  {/* EBITDA */}
                                  <tr className="font-bold bg-slate-100 border-t-2 border-slate-200">
                                      <td className="py-3 px-4">EBITDA</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.ebitda)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(75922733)}</td>
                                      <td className="py-3 px-4 text-right text-emerald-600">90%</td>
                                  </tr>

                                  <tr><td className="py-1 px-4 text-slate-500">- Depreciation</td><td className="text-right px-4">{formatCurrency(forecast.depreciation)}</td><td className="text-right px-4">R 1,504,500</td><td/></tr>
                                  <tr><td className="py-1 px-4 text-slate-500">- Finance Charges</td><td className="text-right px-4">{formatCurrency(forecast.financeCharges)}</td><td className="text-right px-4">R 650,000</td><td/></tr>

                                  <tr className="font-bold border-t border-slate-200">
                                      <td className="py-2 px-4">EBT</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(forecast.ebt)}</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(73768233)}</td>
                                      <td className="py-2 px-4 text-right">91%</td>
                                  </tr>
                                  <tr><td className="py-1 px-4 text-slate-500">- Tax</td><td className="text-right px-4">{formatCurrency(forecast.tax)}</td><td className="text-right px-4">R 20,655,105</td><td/></tr>

                                  <tr className="font-bold bg-emerald-50 text-emerald-900 border-t-2 border-emerald-200 text-lg">
                                      <td className="py-3 px-4">Net Profit</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.netProfit)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(53113128)}</td>
                                      <td className="py-3 px-4 text-right">91%</td>
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
                           <div className="bg-blue-600 px-4 py-2 text-white font-bold text-center">Profitability Ratios</div>
                           <div className="p-4 grid grid-cols-2 gap-4">
                               <div className="text-center p-3 bg-slate-50 rounded">
                                   <div className="text-xs text-slate-500 uppercase">GP Margin</div>
                                   <div className="text-xl font-bold text-slate-800">
                                       {formatPercent(forecast.grossProfit.total / forecast.revenue.total, 2)}
                                   </div>
                               </div>
                               <div className="text-center p-3 bg-slate-50 rounded">
                                   <div className="text-xs text-slate-500 uppercase">Net Margin</div>
                                   <div className="text-xl font-bold text-emerald-600">
                                       {formatPercent(forecast.netProfit / forecast.revenue.total, 2)}
                                   </div>
                               </div>
                               <div className="text-center p-3 bg-slate-50 rounded">
                                   <div className="text-xs text-slate-500 uppercase">ROE</div>
                                   <div className="text-xl font-bold text-slate-800">23.1%</div>
                               </div>
                               <div className="text-center p-3 bg-slate-50 rounded">
                                   <div className="text-xs text-slate-500 uppercase">RONA</div>
                                   <div className="text-xl font-bold text-slate-800">22.1%</div>
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
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(299459535)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Current Assets</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.cash + forecast.balanceSheet.inventory + forecast.balanceSheet.receivables)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(286816686)}</td>
                                  </tr>
                                  <tr><td className="py-1 px-12 text-slate-500">- Cash & Equiv.</td><td className="text-right px-4">{formatCurrency(forecast.balanceSheet.cash)}</td><td className="text-right px-4 text-slate-400">R 155,933,843</td></tr>
                                  <tr><td className="py-1 px-12 text-slate-500">- Receivables</td><td className="text-right px-4">{formatCurrency(forecast.balanceSheet.receivables)}</td><td className="text-right px-4 text-slate-400">R 18,547,918</td></tr>
                                  <tr><td className="py-1 px-12 text-slate-500">- Inventory</td><td className="text-right px-4">{formatCurrency(forecast.balanceSheet.inventory)}</td><td className="text-right px-4 text-slate-400">R 112,334,926</td></tr>
                                  
                                  <tr className="font-bold bg-blue-50 text-blue-900 border-t border-blue-200">
                                      <td className="py-3 px-4">TOTAL ASSETS</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.balanceSheet.totalAssets)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(586276221)}</td>
                                  </tr>

                                  {/* Equity & Liabilities */}
                                  <tr className="font-bold bg-slate-50/50 border-t-4 border-white"><td className="py-2 px-4" colSpan={3}>EQUITY & LIABILITIES</td></tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Total Equity</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.equity)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(339678065)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Non-Current Liabilities</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.longTermDebt)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(10000000)}</td>
                                  </tr>
                                  <tr>
                                      <td className="py-2 px-8 text-slate-700 font-semibold">Current Liabilities</td>
                                      <td className="text-right px-4 font-bold">{formatCurrency(forecast.balanceSheet.currentLiabilities)}</td>
                                      <td className="text-right px-4 text-slate-500">{formatCurrency(236598156)}</td>
                                  </tr>

                                  <tr className="font-bold bg-blue-50 text-blue-900 border-t border-blue-200">
                                      <td className="py-3 px-4">TOTAL EQUITY & LIABILITIES</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(forecast.balanceSheet.totalLiabilitiesAndEquity)}</td>
                                      <td className="py-3 px-4 text-right">{formatCurrency(586276221)}</td>
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
                           <div className="bg-blue-600 px-4 py-2 text-white font-bold text-center">Liquidity KPIs</div>
                           <div className="p-4 grid grid-cols-1 gap-4">
                               <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                   <span className="text-slate-600">Debt / Equity</span>
                                   <span className="font-bold font-mono text-slate-900">
                                       {formatPercent(forecast.balanceSheet.longTermDebt / forecast.balanceSheet.equity, 2)}
                                   </span>
                               </div>
                               <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                   <span className="text-slate-600">Current Ratio</span>
                                   <span className="font-bold font-mono text-emerald-600">
                                       {formatNumber((forecast.balanceSheet.cash + forecast.balanceSheet.inventory + forecast.balanceSheet.receivables) / forecast.balanceSheet.currentLiabilities, 0)}
                                   </span>
                               </div>
                           </div>
                      </div>
                 </div>
              </div>
          )}

          {/* 4. CASH FLOW */}
          {activeTab === 'cashflow' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* Table */}
                  <div className="xl:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 sm:p-6">
                           <h3 className="text-lg font-bold text-slate-800 mb-4">Cash Flow Statement Forecast</h3>
                           <div className="overflow-x-auto">
                               <table className="w-full text-xs sm:text-sm whitespace-nowrap">
                               <tbody className="divide-y divide-slate-100">
                                   {/* Operating */}
                                   <tr className="bg-slate-50/50 font-bold"><td colSpan={2} className="py-2 px-4">Cash from Operating Activities</td><td className="text-right px-4">{formatCurrency(forecast.cashFlow.operating)}</td></tr>
                                   <tr><td className="py-1 px-8 text-slate-500">Net Profit</td><td className="text-right px-4 text-slate-500">{formatCurrency(forecast.netProfit)}</td><td/></tr>
                                   <tr><td className="py-1 px-8 text-slate-500">Depreciation</td><td className="text-right px-4 text-slate-500">{formatCurrency(forecast.depreciation)}</td><td/></tr>
                                   
                                   {/* Investing */}
                                   <tr className="bg-slate-50/50 font-bold border-t border-slate-200"><td colSpan={2} className="py-2 px-4">Cash from Investing Activities</td><td className="text-right px-4">{formatCurrency(forecast.cashFlow.investing)}</td></tr>
                                   <tr><td className="py-1 px-8 text-slate-500">CAPEX</td><td className="text-right px-4 text-slate-500">{formatCurrency(forecast.cashFlow.investing)}</td><td/></tr>

                                   {/* Financing */}
                                   <tr className="bg-slate-50/50 font-bold border-t border-slate-200"><td colSpan={2} className="py-2 px-4">Cash from Financing Activities</td><td className="text-right px-4">{formatCurrency(forecast.cashFlow.financing)}</td></tr>
                                   <tr><td className="py-1 px-8 text-slate-500">Debt Change</td><td className="text-right px-4 text-slate-500">{formatCurrency(decisions.finance.debtChange)}</td><td/></tr>
                                   <tr><td className="py-1 px-8 text-slate-500">Equity Change</td><td className="text-right px-4 text-slate-500">{formatCurrency(decisions.finance.equityChange)}</td><td/></tr>

                                   {/* Net */}
                                   <tr className="font-bold border-t-2 border-slate-300 text-lg">
                                       <td colSpan={2} className="py-4 px-4">Net Cash Movement</td>
                                       <td className={`py-4 px-4 text-right ${forecast.cashFlow.net > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                           {formatCurrency(forecast.cashFlow.net)}
                                       </td>
                                   </tr>

                                   <tr className="bg-blue-50 text-blue-900 font-bold border-t border-blue-200">
                                       <td colSpan={2} className="py-3 px-4">Closing Cash Balance</td>
                                       <td className="py-3 px-4 text-right">{formatCurrency(forecast.balanceSheet.cash)}</td>
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
          )}

      </div>
    </div>
  );
};

export default FinancialReports;