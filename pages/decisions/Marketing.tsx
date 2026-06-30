import React, { useEffect, useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { PRODUCTS, STORE_COSTS, MARKET_SIZES, LAST_YEAR_DATA } from '../../constants';
import { ProductId } from '../../types';
import { Info, AlertCircle, TrendingUp, DollarSign, Megaphone, Target, Store, Users, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import DecisionsSummary from '../../components/DecisionsSummary';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../../utils/numberFormat';

const Marketing: React.FC = () => {
  const { decisions, updateDecisions, currentTeam, lastPeriodKPIs } = useSimulation();
  const { marketing } = decisions;

    const [marketShareInputs, setMarketShareInputs] = useState<Record<ProductId, string>>({
        techbook: formatNumber(marketing.forecastedMarketShare?.techbook || 0, 2),
        zroid: formatNumber(marketing.forecastedMarketShare?.zroid || 0, 2),
        itab: formatNumber(marketing.forecastedMarketShare?.itab || 0, 2)
    });
    const [adSplitInputs, setAdSplitInputs] = useState<Record<ProductId, string>>({
        techbook: formatNumber((marketing.adSplits.techbook || 0) * 100, 2),
        zroid: formatNumber((marketing.adSplits.zroid || 0) * 100, 2),
        itab: formatNumber((marketing.adSplits.itab || 0) * 100, 2)
    });
    const [agentCommissionInput, setAgentCommissionInput] = useState<string>(
        formatNumber(marketing.agentCommission * 100, 2)
    );

    useEffect(() => {
        setMarketShareInputs({
            techbook: formatNumber(marketing.forecastedMarketShare?.techbook || 0, 2),
            zroid: formatNumber(marketing.forecastedMarketShare?.zroid || 0, 2),
            itab: formatNumber(marketing.forecastedMarketShare?.itab || 0, 2)
        });
    }, [marketing.forecastedMarketShare?.techbook, marketing.forecastedMarketShare?.zroid, marketing.forecastedMarketShare?.itab]);

    useEffect(() => {
        setAdSplitInputs({
            techbook: formatNumber((marketing.adSplits.techbook || 0) * 100, 2),
            zroid: formatNumber((marketing.adSplits.zroid || 0) * 100, 2),
            itab: formatNumber((marketing.adSplits.itab || 0) * 100, 2)
        });
    }, [marketing.adSplits.techbook, marketing.adSplits.zroid, marketing.adSplits.itab]);

    useEffect(() => {
        setAgentCommissionInput(formatNumber(marketing.agentCommission * 100, 2));
    }, [marketing.agentCommission]);

    useEffect(() => {
        const totalSplit = (Object.values(marketing.adSplits) as number[]).reduce((a: number, b: number) => a + b, 0);
        const balancedGeneral = Math.max(0, 1 - totalSplit);
        if (Math.abs((marketing.generalAdSplit || 0) - balancedGeneral) > 0.0001) {
            updateDecisions('marketing', { generalAdSplit: balancedGeneral });
        }
    }, [marketing.adSplits, marketing.generalAdSplit, updateDecisions]);

  // Helper for currency update
  const updateMarketingValue = (key: keyof typeof marketing, value: number) => {
    updateDecisions('marketing', { [key]: value });
  };

  const handlePriceChange = (productId: ProductId, value: string) => {
    updateDecisions('marketing', {
      prices: {
        ...marketing.prices,
                [productId]: parseNumber(value),
      },
    });
  };

    const handleAdSplitChange = (productId: ProductId, value: string) => {
        const newVal = parseNumber(value) / 100;
        const updatedSplits = {
            ...marketing.adSplits,
            [productId]: newVal,
        };
        const totalSplit = (Object.values(updatedSplits) as number[]).reduce((a: number, b: number) => a + b, 0);
        const balancedGeneral = Math.max(0, 1 - totalSplit);

        updateDecisions('marketing', {
            adSplits: updatedSplits,
            generalAdSplit: balancedGeneral,
        });
    };

    const handleAdSplitInputChange = (productId: ProductId, value: string) => {
        setAdSplitInputs(prev => ({ ...prev, [productId]: value }));
    };

    const handleAdSplitCommit = (productId: ProductId) => {
        const rawValue = adSplitInputs[productId] ?? '0';
        handleAdSplitChange(productId, rawValue);
    };

  const handleMarketShareChange = (productId: ProductId, value: string) => {
      updateDecisions('marketing', {
          forecastedMarketShare: {
              ...marketing.forecastedMarketShare,
              [productId]: parseNumber(value)
          }
      });
  };

    const handleMarketShareInputChange = (productId: ProductId, value: string) => {
        setMarketShareInputs(prev => ({ ...prev, [productId]: value }));
    };

    const handleMarketShareCommit = (productId: ProductId) => {
        const rawValue = marketShareInputs[productId] ?? '0';
        const numericValue = parseNumber(rawValue);
        handleMarketShareChange(productId, String(numericValue));
        setMarketShareInputs(prev => ({
            ...prev,
            [productId]: formatNumber(numericValue, 2)
        }));
    };

    const handleAgentCommissionInputChange = (value: string) => {
        setAgentCommissionInput(value);
    };

    const handleAgentCommissionCommit = () => {
        const rawValue = agentCommissionInput ?? '0';
        const numericValue = parseNumber(rawValue);
        updateMarketingValue('agentCommission', numericValue / 100);
        setAgentCommissionInput(formatNumber(numericValue, 2));
    };

    // Calculations
    const totalProductSplit = (Object.values(marketing.adSplits) as number[]).reduce((a: number, b: number) => a + b, 0);
    const balancedGeneralSplit = Math.max(0, 1 - totalProductSplit);
    const totalAdSplit = Number(totalProductSplit) + Number(balancedGeneralSplit);
    const isOverAllocated = Number(totalProductSplit) > 1;
  const totalMarketingSpend = marketing.advertisingBudget + marketing.promoBudget;
  
  // Store Cost Calculations
  const finalStoreCount = currentTeam.storeCount + marketing.openCloseStores;
  const runningCosts = finalStoreCount * STORE_COSTS.running;
  const transitionCosts = marketing.openCloseStores > 0 
    ? marketing.openCloseStores * STORE_COSTS.opening 
    : Math.abs(marketing.openCloseStores) * STORE_COSTS.closing;
  const totalStoreCosts = runningCosts + transitionCosts;

  // Agent Cost Forecast (Approximation based on last period revenue share)
  // Assuming approx 52% of sales come through agents based on simulation history
  const estimatedAgentSales = lastPeriodKPIs.revenue * 0.52; 
  const forecastedCommissionCost = estimatedAgentSales * marketing.agentCommission;

  // Data for Chart
  const allocationData = [
    ...PRODUCTS.map((p, i) => ({ 
        name: p.name + ' Ads', 
        value: marketing.advertisingBudget * marketing.adSplits[p.id],
        // Assign distinct colors or shades
        color: ['#3B82F6', '#10B981', '#EC4899'][i % 3]
    })),
    { 
        name: 'General Branding', 
        value: marketing.advertisingBudget * marketing.generalAdSplit,
        color: '#8B5CF6' // Violet
    },
    {
        name: 'Sales Promo',
        value: marketing.promoBudget,
        color: '#F59E0B' // Amber
    }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B'];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      
      <DecisionsSummary />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Marketing & Sales Strategy</h1>
          <p className="text-slate-500 mt-2 text-lg">Optimize pricing, advertising, and distribution channels.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Investment</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalMarketingSpend)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Decisions */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Market Share Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <PieChartIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Market Share
                    </h3>
                </div>
                <div className="p-6">
                     <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                         <div className="col-span-1"></div>
                         {PRODUCTS.map(p => <div key={p.id} className="text-center">{p.name}</div>)}
                     </div>

                     {/* Forecasted Market Share Input */}
                     <div className="grid grid-cols-4 gap-4 items-center mb-6">
                         <div className="font-medium text-slate-700 text-sm">Forecasted Market Share</div>
                         {PRODUCTS.map(p => (
                             <div key={p.id} className="relative">
                                 <input 
                                    type="text"
                                    inputMode="decimal"
                                    className="w-full text-center font-bold text-blue-800 border border-blue-200 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                                                                        value={marketShareInputs[p.id] ?? ''}
                                                                        onChange={(e) => handleMarketShareInputChange(p.id, e.target.value)}
                                                                        onBlur={() => handleMarketShareCommit(p.id)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleMarketShareCommit(p.id);
                                                                            }
                                                                        }}
                                 />
                                 <span className="absolute right-3 top-2.5 text-xs text-blue-400">%</span>
                             </div>
                         ))}
                     </div>

                     {/* Forecasted Units */}
                     <div className="grid grid-cols-4 gap-4 items-center mb-6 border-b border-slate-100 pb-6">
                         <div className="font-medium text-slate-700 text-sm">Forecasted Units</div>
                         {PRODUCTS.map(p => {
                             const share = marketing.forecastedMarketShare?.[p.id] || 0;
                             const units = Math.round((MARKET_SIZES[p.id] * share) / 100);
                             return (
                                 <div key={p.id} className="text-center font-mono text-slate-900">
                                     {formatNumber(units)}
                                 </div>
                             );
                         })}
                     </div>

                     {/* Last Year Data */}
                     <div className="grid grid-cols-4 gap-4 items-center mb-3">
                         <div className="font-medium text-slate-500 text-xs">Last year Market Share</div>
                         {PRODUCTS.map(p => (
                             // @ts-ignore
                             <div key={p.id} className="text-center text-xs text-slate-500">{formatPercent(LAST_YEAR_DATA.marketShare[p.id], 2, false)}</div>
                         ))}
                     </div>
                     <div className="grid grid-cols-4 gap-4 items-center">
                         <div className="font-medium text-slate-500 text-xs">Last year Units Sold</div>
                         {PRODUCTS.map(p => (
                             // @ts-ignore
                             <div key={p.id} className="text-center text-xs text-slate-500">{LAST_YEAR_DATA.unitsSold[p.id].toLocaleString()}</div>
                         ))}
                     </div>
                </div>
            </div>

            {/* Product Strategy Table */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-blue-600" />
                        Product Advertising
                    </h3>
                </div>
                 <div className="p-0 lg:p-6">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-semibold w-48">Product</th>
                                    <th className="px-6 py-3 font-semibold">Unit Price</th>
                                    <th className="px-6 py-3 font-semibold">Ad Allocation %</th>
                                    <th className="px-6 py-3 font-semibold w-56">Ad Budget</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {PRODUCTS.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 w-48">
                                            <div className="font-medium text-slate-900">{product.name}</div>
                                            <div className="text-xs text-slate-500">{product.segment} Segment</div>
                                        </td>
                                        <td className="px-6 py-4">
                                             <div className="relative w-32">
                                                 <span className="absolute left-2 top-2 text-blue-400 text-sm">R</span>
                                                 <input 
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={formatNumber(marketing.prices[product.id])}
                                                    onChange={(e) => handlePriceChange(product.id, String(parseNumber(e.target.value)))}
                                                    className="w-full pl-5 pr-2 py-1.5 text-sm bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                 />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                             <div className="flex items-center space-x-3 w-48">
                                                 <input 
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={adSplitInputs[product.id] ?? ''}
                                                    onChange={(e) => handleAdSplitInputChange(product.id, e.target.value)}
                                                    onBlur={() => handleAdSplitCommit(product.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAdSplitCommit(product.id);
                                                        }
                                                    }}
                                                    className="w-24 text-right font-mono text-slate-700 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                                 />
                                                 <span className="text-sm font-mono text-slate-600">%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-mono w-56">
                                            {formatCurrency(marketing.advertisingBudget * marketing.adSplits[product.id])}
                                        </td>
                                    </tr>
                                ))}
                                {/* General Ad Row */}
                                <tr className="bg-slate-50/50">
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        Brand Equity
                                        <span className="block text-xs text-slate-400 font-normal">General Corporate Advertising</span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-300">—</td>
                                    <td className="px-6 py-4">
                                         <div className="flex items-center space-x-3 w-48">
                                             <div className="w-24 text-right font-mono text-slate-700 border border-slate-300 rounded px-2 py-1 bg-slate-100">
                                                 {formatNumber(balancedGeneralSplit * 100, 2)}
                                             </div>
                                             <span className="text-sm font-mono text-slate-600">%</span>
                                         </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono w-56">
                                        {formatCurrency(marketing.advertisingBudget * balancedGeneralSplit)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block lg:hidden space-y-4 p-4">
                        {PRODUCTS.map((product) => (
                            <div key={product.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{product.name}</h4>
                                        <span className="text-[10px] text-slate-400 font-semibold uppercase">{product.segment} Segment</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Ad Budget</span>
                                        <span className="text-xs font-mono font-bold text-slate-700">
                                            {formatCurrency(marketing.advertisingBudget * marketing.adSplits[product.id])}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-slate-500 block">Unit Price (R)</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-2 text-blue-400 text-xs">R</span>
                                            <input 
                                                type="text"
                                                inputMode="numeric"
                                                value={formatNumber(marketing.prices[product.id])}
                                                onChange={(e) => handlePriceChange(product.id, String(parseNumber(e.target.value)))}
                                                className="w-full pl-5 pr-2 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-slate-500 block">Ad Split %</label>
                                        <div className="flex items-center space-x-1">
                                            <input 
                                                type="text"
                                                inputMode="decimal"
                                                value={adSplitInputs[product.id] ?? ''}
                                                onChange={(e) => handleAdSplitInputChange(product.id, e.target.value)}
                                                onBlur={() => handleAdSplitCommit(product.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAdSplitCommit(product.id);
                                                    }
                                                }}
                                                className="w-full text-right font-mono text-slate-700 border border-slate-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <span className="text-xs font-mono text-slate-600">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Brand Equity Card */}
                        <div className="bg-slate-100 rounded-xl border border-slate-200 p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-700 text-xs">Brand Equity</h4>
                                    <span className="text-[10px] text-slate-400">General Corporate Branding</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Ad Budget</span>
                                    <span className="text-xs font-mono font-bold text-slate-600">
                                        {formatCurrency(marketing.advertisingBudget * balancedGeneralSplit)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                                <span className="text-slate-500">General Ad Split %</span>
                                <span className="font-bold font-mono text-slate-700">{formatNumber(balancedGeneralSplit * 100, 2)}%</span>
                            </div>
                        </div>

                        {isOverAllocated && (
                          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                            Warning: Ad allocations exceed 100% by {formatPercent(totalProductSplit - 1, 2)}.
                          </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Budgets Card - Moved ABOVE Distribution */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                    Budget Allocation
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Advertising Budget */}
                    <div className="space-y-2">
                         <div className="flex justify-between items-center">
                             <label className="text-sm font-medium text-slate-700">Advertising Budget</label>
                         </div>
                         <div className="relative">
                                     <span className="absolute left-3 top-2.5 text-blue-400">R</span>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                value={formatNumber(marketing.advertisingBudget)}
                                onChange={(e) => updateMarketingValue('advertisingBudget', parseNumber(e.target.value))}
                                className="w-full pl-8 pr-4 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Promo Budget */}
                    <div className="space-y-2">
                         <div className="flex justify-between items-center">
                             <label className="text-sm font-medium text-slate-700">Sales Promotion Budget</label>
                         </div>
                         <div className="relative">
                                     <span className="absolute left-3 top-2.5 text-blue-400">R</span>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                value={formatNumber(marketing.promoBudget)}
                                onChange={(e) => updateMarketingValue('promoBudget', parseNumber(e.target.value))}
                                className="w-full pl-8 pr-4 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Ad Allocation Slider Visualization */}
                <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700">Ad Budget Allocation Mix</span>
                        <span className={`text-sm font-bold ${Math.abs(totalAdSplit - 1) < 0.0001 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatPercent(totalAdSplit, 2)} Used
                        </span>
                    </div>
                    <div className="w-full h-4 bg-slate-200 rounded-full flex overflow-hidden">
                        {PRODUCTS.map((p, i) => (
                             <div 
                                key={p.id}
                                style={{ width: `${marketing.adSplits[p.id] * 100}%`, backgroundColor: ['#3B82F6', '#10B981', '#EC4899'][i % 3] }}
                                className="h-full transition-all duration-300"
                                          title={`${p.name}: ${formatPercent(marketing.adSplits[p.id], 2)}`}
                             />
                        ))}
                        <div 
                            style={{ width: `${balancedGeneralSplit * 100}%` }}
                            className="h-full bg-violet-500 transition-all duration-300"
                            title={`General: ${formatPercent(balancedGeneralSplit, 2)}`}
                        />
                    </div>
                </div>
            </div>

            {/* Distribution Strategy Card - Moved BELOW Budget Allocation */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <Store className="w-5 h-5 mr-2 text-blue-600" />
                    Distribution
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    
                    {/* Decisions */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 block">Company Stores (Open/Close)</label>
                            <div className="flex items-center space-x-4">
                                <input 
                                    type="number"
                                    value={marketing.openCloseStores}
                                    onChange={(e) => updateMarketingValue('openCloseStores', parseInt(e.target.value) || 0)}
                                    className="w-full pl-4 pr-4 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <div className="text-right min-w-[80px]">
                                    <span className="block text-xs text-slate-500">Resulting</span>
                                    <span className="font-bold text-slate-900">{finalStoreCount} Stores</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">Current: {currentTeam.storeCount} Stores</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 block">Agents' Commission</label>
                             <div className="flex items-center space-x-4">
                                <div className="relative flex-1">
                                    <input 
                                        type="text"
                                        inputMode="decimal"
                                        value={agentCommissionInput}
                                        onChange={(e) => handleAgentCommissionInputChange(e.target.value)}
                                        onBlur={() => handleAgentCommissionCommit()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAgentCommissionCommit();
                                            }
                                        }}
                                        className="w-full pl-4 pr-8 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <span className="absolute right-3 top-2.5 text-blue-400 text-sm">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Forecasted Costs */}
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
                         <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Forecasted Costs</h4>
                         
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Company Stores</span>
                                <span className="font-mono text-sm font-semibold text-slate-900">R {totalStoreCosts.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="text-sm text-slate-600">Agents' Commission</span>
                                <span className="font-mono text-sm font-semibold text-slate-900">R {forecastedCommissionCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                         </div>

                         <div className="mt-6 pt-4 border-t border-slate-200/60 space-y-2">
                             <p className="text-xs text-slate-400 font-semibold uppercase mb-2">Cost Reference</p>
                             <div className="flex justify-between text-xs">
                                 <span className="text-slate-500">Opening a store</span>
                                 <span className="font-mono text-slate-600">R {STORE_COSTS.opening.toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                                 <span className="text-slate-500">Closing a store</span>
                                 <span className="font-mono text-slate-600">R {STORE_COSTS.closing.toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                                 <span className="text-slate-500">Running costs</span>
                                 <span className="font-mono text-slate-600">R {STORE_COSTS.running.toLocaleString()}</span>
                             </div>
                         </div>
                    </div>

                </div>
            </div>

        </div>

        {/* Right Column: Analytics & Visualization */}
        <div className="space-y-6">
            
             {/* Tips Panel - Moved ABOVE Spend Distribution */}
             <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Strategy Tips
                </h4>
                <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                    <li>Entry-level products (TechBook) are highly price sensitive.</li>
                    <li>Premium products (iTab) respond better to targeted advertising than price cuts.</li>
                    <li>General Branding improves effectiveness of all product ads by lifting the corporate image.</li>
                    <li>Agents provide broader reach but eat into margins via commission.</li>
                </ul>
            </div>

            {/* Spend Distribution Chart - Moved BELOW Tips */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                     <Megaphone className="w-5 h-5 mr-2 text-amber-500" />
                     Spend Distribution
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={allocationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {allocationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default Marketing;