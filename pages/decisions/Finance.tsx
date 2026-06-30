import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { PRODUCTS, MARKET_SIZES, FINANCE_CONSTANTS } from '../../constants';
import { ProductId } from '../../types';
import { DollarSign, Landmark, PieChart } from 'lucide-react';
import DecisionsSummary from '../../components/DecisionsSummary';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../../utils/numberFormat';

const Finance: React.FC = () => {
  const { decisions, updateDecisions, currentTeam } = useSimulation();
  const { finance, marketing } = decisions;

  // -- Handlers --
  const handleDebtorsDaysChange = (productId: ProductId, value: string) => {
    updateDecisions('finance', {
      debtorsDays: {
        ...finance.debtorsDays,
        [productId]: parseInt(value) || 0
      }
    });
  };

  const handleDebtChange = (value: string) => {
      updateDecisions('finance', {
          debtChange: parseNumber(value)
      });
  };

  const handleEquityChange = (value: string) => {
      updateDecisions('finance', {
          equityChange: parseNumber(value)
      });
  };

  // -- Calculations --

  // Max Debt Available (Simulation Logic: typically capped by equity or asset base)
  const TOTAL_DEBT_CAPACITY = 35475855; 
  const maxDebtAvailable = TOTAL_DEBT_CAPACITY - currentTeam.longTermDebt;
  
  const endingDebt = currentTeam.longTermDebt + finance.debtChange;
  const endingEquity = currentTeam.shareholdersEquity + finance.equityChange;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      
      <DecisionsSummary />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Finance Strategy</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage cash flow, debt structures, and equity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Cash Flow Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-800 flex items-center shadow-sm">
                <DollarSign className="w-5 h-5 mr-2 text-white" />
                <h3 className="font-bold text-white">Cash Flow</h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-start">
                    
                    {/* Labels Column (Desktop) */}
                    <div className="hidden lg:block pt-8 space-y-7">
                        <div className="h-9 flex items-center justify-end px-4">
                             <span className="font-bold text-slate-800 text-sm">Average Debtors Days</span>
                        </div>
                        <div className="h-6 flex items-center justify-end px-4">
                             <div className="text-xs text-slate-500 italic">Current Balance</div>
                        </div>
                    </div>

                    {/* Values Column */}
                    <div className="w-full">
                         {/* Product Headers */}
                         <div className="grid grid-cols-3 gap-4 mb-2">
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="text-sm font-bold text-slate-800">
                                     {p.name}
                                 </div>
                             ))}
                         </div>
                         
                         {/* Debtors Days Dropdown */}
                         <div className="grid grid-cols-3 gap-4 mb-5">
                             {PRODUCTS.map(p => (
                                 <div key={p.id} className="relative">
                                     <select 
                                         className="w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold py-1.5 px-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-center cursor-pointer appearance-none"
                                         value={finance.debtorsDays[p.id]}
                                         onChange={(e) => handleDebtorsDaysChange(p.id, e.target.value)}
                                     >
                                         <option value="0">0</option>
                                         <option value="30">30</option>
                                         <option value="45">45</option>
                                         <option value="60">60</option>
                                         <option value="90">90</option>
                                     </select>
                                     {/* Custom arrow if needed, but simple block is robust */}
                                 </div>
                             ))}
                         </div>

                         {/* Current Balance */}
                         <div className="grid grid-cols-3 gap-4">
                             {PRODUCTS.map(p => {
                                 // Calculate forecasted revenue
                                 const share = marketing.forecastedMarketShare[p.id] || 0;
                                 const units = (MARKET_SIZES[p.id] * share) / 100;
                                 const revenue = units * marketing.prices[p.id];
                                 const days = finance.debtorsDays[p.id];
                                 // AR = (Revenue / 365) * Days
                                 const ar = (revenue / 365) * days;

                                 return (
                                     <div key={p.id} className="text-sm font-mono text-slate-700 pl-1">
                                         {formatCurrency(ar)}
                                     </div>
                                 );
                             })}
                         </div>
                    </div>
                </div>
                
                {/* Creditors Days Footer */}
                <div className="mt-8 pt-6 border-t border-slate-100 pl-0 lg:pl-[216px]">
                    <div className="flex items-center text-sm">
                        <span className="font-bold text-slate-800 w-64">Average Creditors Days Offered</span>
                        <span className="text-slate-400 italic">45 days</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Long Term Debt Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-800 flex items-center shadow-sm">
                <Landmark className="w-5 h-5 mr-2 text-white" />
                <h3 className="font-bold text-white">Long Term Debt</h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                             <span className="font-bold text-slate-800">Opening Balance</span>
                                <span className="font-mono text-slate-600">{formatCurrency(currentTeam.longTermDebt)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                             <span className="font-bold text-slate-800">Raise / (Pay)</span>
                             <div className="w-48 relative">
                                <span className="absolute left-2 top-1 text-blue-400 font-bold z-10 text-sm">R</span>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold py-1 pl-6 pr-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-center placeholder-blue-300"
                                    placeholder="-"
                                    value={finance.debtChange === 0 ? '' : formatNumber(finance.debtChange)}
                                    onChange={(e) => handleDebtChange(e.target.value)}
                                />
                             </div>
                        </div>

                        <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4">
                             <span className="font-bold text-slate-800">Ending Balance</span>
                                <span className="font-mono text-slate-900 font-bold">{formatCurrency(endingDebt)}</span>
                        </div>
                     </div>
                     
                     <div className="space-y-4 md:pl-8 md:border-l border-slate-100">
                        <div className="flex justify-between items-center text-sm">
                             <span className="font-bold text-slate-800">Maximum Debt Available</span>
                                <span className="font-mono text-slate-600">{formatCurrency(maxDebtAvailable)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                             <span className="font-bold text-slate-800">Average Interest Rate</span>
                                <span className="text-slate-400 italic">{formatPercent(FINANCE_CONSTANTS.interestRate, 2)}</span>
                        </div>
                        {endingDebt > TOTAL_DEBT_CAPACITY && (
                             <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                                 Warning: Projected debt exceeds capacity. Loan may be rejected.
                             </div>
                        )}
                     </div>
                </div>
            </div>
        </div>

        {/* Equity Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-800 flex items-center shadow-sm">
                <PieChart className="w-5 h-5 mr-2 text-white" />
                <h3 className="font-bold text-white">Equity</h3>
            </div>
            <div className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                             <span className="font-bold text-slate-800">Opening Shareholders' Equity</span>
                                <span className="font-mono text-slate-600">{formatCurrency(currentTeam.shareholdersEquity)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                             <span className="font-bold text-slate-800">Raise / (Retire)</span>
                             <div className="w-48 relative">
                                <span className="absolute left-2 top-1 text-blue-400 font-bold z-10 text-sm">R</span>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold py-1 pl-6 pr-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-center placeholder-blue-300"
                                    placeholder="-"
                                    value={finance.equityChange === 0 ? '' : formatNumber(finance.equityChange)}
                                    onChange={(e) => handleEquityChange(e.target.value)}
                                />
                             </div>
                        </div>

                        <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4">
                             <span className="font-bold text-slate-800">Ending Balance</span>
                                <span className="font-mono text-slate-900 font-bold">{formatCurrency(endingEquity)}</span>
                        </div>
                     </div>
                     
                     <div className="space-y-4 md:pl-8 md:border-l border-slate-100">
                        <div className="flex justify-between items-center text-sm pt-8">
                             <span className="font-bold text-slate-800">WACC</span>
                                <span className="text-slate-900 font-bold">{formatPercent(FINANCE_CONSTANTS.wacc, 2)}</span>
                        </div>
                     </div>
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Finance;