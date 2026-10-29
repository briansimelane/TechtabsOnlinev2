import React, { useEffect, useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { PRODUCTS, STORE_COSTS, MARKET_SIZES, LAST_YEAR_DATA, getMarketSize } from '../../constants';
import { ProductId } from '../../types';
import { Info, AlertCircle, DollarSign, Target, Store, PieChart as PieChartIcon, Tag, Globe, CheckCircle2, Lock } from 'lucide-react';
import DecisionsSummary from '../../components/DecisionsSummary';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../../utils/numberFormat';
import { useFlashOnChange } from '../../utils/useFlashOnChange';
import { computeIndustryPerformance, didTeamEnterBotswanaInPeriod } from '../../utils/industryPerformance';
import { getCriterionRating } from '../../utils/marketShareBackModel';

const Marketing: React.FC = () => {
  const { decisions, updateDecisions, currentTeam, lastPeriodKPIs, isReadOnly, currentRole, classes, currentClassId } = useSimulation();
  const disabled = isReadOnly && currentRole === 'STUDENT';
  const { marketing } = decisions;

  const currentClass = classes.find(c => c.id === currentClassId);
  const realTeams = React.useMemo(() => {
    return currentClass?.teams ? currentClass.teams.filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id)) : [];
  }, [currentClass]);

  const flashPrices = {
      techbook: useFlashOnChange(marketing.prices.techbook),
      zroid: useFlashOnChange(marketing.prices.zroid),
      itab: useFlashOnChange(marketing.prices.itab)
  };

  const flashAdSplits = {
      techbook: useFlashOnChange(marketing.adSplits.techbook),
      zroid: useFlashOnChange(marketing.adSplits.zroid),
      itab: useFlashOnChange(marketing.adSplits.itab)
  };

  const flashAdBudget = useFlashOnChange(marketing.advertisingBudget);
  const flashStores = useFlashOnChange(marketing.openCloseStores);
  const flashCommission = useFlashOnChange(marketing.agentCommission);

  const pastPeriod = currentTeam.currentPeriod - 1;
  const pastPeriodRecord = currentTeam.history?.[pastPeriod];

  const pastTeamPerf = React.useMemo(() => {
    if (pastPeriod <= 0) return null;
    if (pastPeriodRecord?.industry) return pastPeriodRecord.industry;
    if (realTeams && realTeams.length > 0) {
      try {
        const list = computeIndustryPerformance(realTeams, pastPeriod);
        return list.find(p => p.teamId === currentTeam.id) || null;
      } catch (e) {}
    }
    return null;
  }, [pastPeriod, pastPeriodRecord, realTeams, currentTeam.id]);

  const getPastPrice = (productId: ProductId) => {
    return pastTeamPerf?.price?.[productId] ?? pastPeriodRecord?.industry?.price?.[productId] ?? pastPeriodRecord?.prices?.[productId] ?? (productId === 'techbook' ? 3000 : productId === 'zroid' ? 4800 : 6500);
  };

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
    const newPrice = parseNumber(value);
    updateDecisions('marketing', {
      prices: {
        ...marketing.prices,
        [productId]: newPrice,
      },
    });
    if (decisions.markets?.za) {
      updateDecisions('markets' as any, {
        ...decisions.markets,
        za: {
          ...decisions.markets.za,
          prices: {
            ...(decisions.markets.za.prices || {}),
            [productId]: newPrice
          }
        }
      } as any);
    }
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
  const totalMarketingSpend = marketing.advertisingBudget;
  
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



  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      
      <DecisionsSummary />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Marketing & Sales Strategy</h1>
        <p className="text-slate-500 mt-2 text-lg">Optimize pricing, advertising, and distribution channels.</p>
      </div>

      <div className="space-y-6">
            
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
                                    className="w-full text-center font-bold text-blue-800 border border-blue-200 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={marketShareInputs[p.id] ?? ''}
                                    onChange={(e) => handleMarketShareInputChange(p.id, e.target.value)}
                                    onBlur={() => handleMarketShareCommit(p.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleMarketShareCommit(p.id);
                                        }
                                    }}
                                    disabled={disabled}
                                 />
                                 <span className="absolute right-3 top-2.5 text-xs text-blue-400">%</span>
                             </div>
                         ))}
                     </div>

                     {/* Forecasted Units */}
                     <div className="grid grid-cols-4 gap-4 items-center">
                         <div className="font-medium text-slate-700 text-sm">Forecasted Units</div>
                         {PRODUCTS.map(p => {
                             const share = marketing.forecastedMarketShare?.[p.id] || 0;
                             const units = Math.round((getMarketSize(p.id, currentTeam.currentPeriod) * share) / 100);
                             return (
                                 <div key={p.id} className="text-center font-mono text-slate-900">
                                     {formatNumber(units)}
                                 </div>
                             );
                         })}
                     </div>

                     {/* Previous Period Actual Data */}
                     <div className="border-t border-slate-100 pt-6 mt-6 space-y-3">
                         <div className="grid grid-cols-4 gap-4 items-center">
                             <div className="font-medium text-slate-500 text-xs">
                                 {pastPeriod === 0 ? 'Last Year Market Share' : `Year ${pastPeriod} Actual Market Share (% Total Market)`}
                             </div>
                             {PRODUCTS.map(p => {
                                 const unitsSold = pastPeriod === 0 
                                     ? LAST_YEAR_DATA.unitsSold[p.id] 
                                     : (pastTeamPerf?.units?.[p.id]?.actual ?? pastPeriodRecord?.industry?.units?.[p.id]?.actual ?? pastPeriodRecord?.market?.actualUnits?.[p.id] ?? 0);
                                 const mSize = pastTeamPerf?.units?.[p.id]?.marketSize ?? pastPeriodRecord?.market?.marketSize?.[p.id] ?? getMarketSize(p.id, pastPeriod);
                                 const rawShare = pastPeriod === 0 
                                     ? LAST_YEAR_DATA.marketShare[p.id] 
                                     : (mSize > 0 ? (unitsSold / mSize) * 100 : (pastTeamPerf?.marketShare?.[p.id] ?? 0));
                                 const pctValue = rawShare > 1 ? rawShare : rawShare * 100;
                                 return (
                                     <div key={p.id} className="text-center text-xs font-mono font-semibold text-slate-700" title={`${formatNumber(unitsSold)} units sold out of ${formatNumber(mSize)} total market demand`}>
                                         {formatPercent(pctValue, 2, false)}
                                     </div>
                                 );
                             })}
                         </div>
                         <div className="grid grid-cols-4 gap-4 items-center">
                             <div className="font-medium text-slate-500 text-xs">
                                 {pastPeriod === 0 ? 'Last Year Units Sold' : `Year ${pastPeriod} Actual Units Sold`}
                             </div>
                             {PRODUCTS.map(p => {
                                 const unitsSold = pastPeriod === 0 
                                     ? LAST_YEAR_DATA.unitsSold[p.id] 
                                     : (pastTeamPerf?.units?.[p.id]?.actual ?? pastPeriodRecord?.industry?.units?.[p.id]?.actual ?? pastPeriodRecord?.market?.actualUnits?.[p.id] ?? 0);
                                 return (
                                     <div key={p.id} className="text-center text-xs font-mono font-semibold text-slate-700">
                                         {formatNumber(unitsSold)}
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 </div>
            </div>

            {/* Grid for Pricing & Advertising Decisions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Pricing Decisions Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Tag className="w-5 h-5 mr-2 text-blue-600" />
                        Pricing Decisions
                    </h3>
                </div>
                <div className="p-0 lg:p-6">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-semibold w-48">Product</th>
                                    <th className="px-6 py-3 font-semibold">Unit Price (R)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {PRODUCTS.map((product) => {
                                    const priceRating = getCriterionRating(1, product.id, currentTeam.currentPeriod);
                                    const isAlpYear3ItabShift = Boolean(currentClass?.isActionLearningProject) && currentTeam.currentPeriod >= 3 && product.id === 'itab';
                                    return (
                                    <tr key={product.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 w-48">
                                            <div className="font-medium text-slate-900">{product.name}</div>
                                            <div className="text-xs text-slate-500">{product.segment} Segment</div>
                                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isAlpYear3ItabShift ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'}`}>
                                                    Price Criteria: {priceRating}/10{isAlpYear3ItabShift ? ' (Updated in Year 3)' : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                             <div className="relative w-32">
                                                 <span className="absolute left-2 top-2 text-blue-400 text-sm">R</span>
                                                 <input 
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={formatNumber(marketing.prices[product.id])}
                                                    onChange={(e) => handlePriceChange(product.id, String(parseNumber(e.target.value)))}
                                                    className={`w-full pl-5 pr-2 py-1.5 text-sm bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashPrices[product.id] ? 'animate-flash-green' : ''}`}
                                                    disabled={disabled}
                                                 />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1 pl-1">
                                                Last year: R {formatNumber(getPastPrice(product.id))}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block lg:hidden space-y-4 p-4">
                        {PRODUCTS.map((product) => {
                            const priceRating = getCriterionRating(1, product.id, currentTeam.currentPeriod);
                            const isAlpYear3ItabShift = Boolean(currentClass?.isActionLearningProject) && currentTeam.currentPeriod >= 3 && product.id === 'itab';
                            return (
                            <div key={product.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{product.name}</h4>
                                        <span className="text-[10px] text-slate-400 font-semibold uppercase">{product.segment} Segment</span>
                                    </div>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isAlpYear3ItabShift ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                        Price Criteria: {priceRating}/10
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-500 block">Unit Price (R)</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-2 text-blue-400 text-xs">R</span>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            value={formatNumber(marketing.prices[product.id])}
                                            onChange={(e) => handlePriceChange(product.id, String(parseNumber(e.target.value)))}
                                            className={`w-full pl-5 pr-2 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashPrices[product.id] ? 'animate-flash-green' : ''}`}
                                            disabled={disabled}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                        Last year: R {formatNumber(getPastPrice(product.id))}
                                    </span>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Advertising Strategy Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between bg-slate-50/50 -mx-6 -mt-6 px-6 py-4">
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-blue-600" />
                        Advertising Budget & Allocation
                    </h3>
                </div>

                {/* Advertising Budget Input */}
                <div className="max-w-md">
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
                                 className={`w-full pl-8 pr-4 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${flashAdBudget ? 'animate-flash-green' : ''}`}
                                 disabled={disabled}
                              />
                         </div>
                     </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-semibold w-48">Product</th>
                                <th className="px-6 py-3 font-semibold">Ad Allocation %</th>
                                <th className="px-6 py-3 font-semibold w-64">Ad Budget</th>
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
                                                 className={`w-24 text-right font-mono text-blue-800 bg-blue-50 border border-blue-200 font-bold rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashAdSplits[product.id] ? 'animate-flash-green' : ''}`}
                                                 disabled={disabled}
                                             />
                                             <span className="text-sm font-mono text-slate-600">%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono w-64">
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
                                <td className="px-6 py-4">
                                     <div className="flex items-center space-x-3 w-48">
                                         <div className="w-24 text-right font-mono text-slate-700 border border-slate-300 rounded px-2 py-1 bg-slate-100">
                                             {formatNumber(balancedGeneralSplit * 100, 2)}
                                         </div>
                                         <span className="text-sm font-mono text-slate-600">%</span>
                                     </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-mono w-64">
                                    {formatCurrency(marketing.advertisingBudget * balancedGeneralSplit)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-4">
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
                                        className={`w-full text-right font-mono text-blue-800 bg-blue-50 border border-blue-200 font-bold rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashAdSplits[product.id] ? 'animate-flash-green' : ''}`}
                                        disabled={disabled}
                                    />
                                    <span className="text-xs font-mono text-slate-600">%</span>
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
                </div>

                {isOverAllocated && (
                  <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    Warning: Ad allocations exceed 100% by {formatPercent(totalProductSplit - 1, 2)}.
                  </div>
                )}
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
                                    className={`w-full pl-4 pr-4 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashStores ? 'animate-flash-green' : ''}`}
                                    disabled={disabled}
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
                                        className={`w-full pl-4 pr-8 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashCommission ? 'animate-flash-green' : ''}`}
                                        disabled={disabled}
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

            {/* ALP Regional Market Opportunities (Year 2 & Year 3) */}
            {Boolean(currentClass?.isActionLearningProject) && (currentTeam.currentPeriod === 2 || currentTeam.currentPeriod === 3) && (() => {
              const isYear2 = currentTeam.currentPeriod === 2;
              const enteredBotswanaY2 = didTeamEnterBotswanaInPeriod(currentTeam, 2);
              const botswanaSelected = Boolean(marketing.alpOpportunities?.botswana);
              const mozambiqueSelected = isYear2 ? Boolean(marketing.alpOpportunities?.mozambique) : false;

              const handleToggleOpportunity = (market: 'botswana' | 'mozambique', value: boolean) => {
                if (disabled) return;
                updateDecisions('marketing', {
                  alpOpportunities: {
                    ...(marketing.alpOpportunities || {}),
                    [market]: value
                  }
                });
              };

              return (
                <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 bg-indigo-50/60">
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center">
                        <Globe className="w-5 h-5 mr-2 text-indigo-600" />
                        Regional Market Opportunities — Year {currentTeam.currentPeriod} (Action Learning Project)
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Indicate whether your team will enter the neighbouring country opportunities upon submission. Volume is divided equally among all entering teams using your South African pricing and product Gross Profit %. You do not need to forecast additional production units.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                      Equal Volume Split • Other Income
                    </span>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Botswana Card */}
                    <div className={`rounded-xl border-2 p-5 transition-all ${botswanaSelected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">Botswana</h4>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              Entry Mode: Alliance
                            </span>
                          </div>
                          {!isYear2 && (
                            <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${enteredBotswanaY2 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {enteredBotswanaY2
                                ? 'Entered Botswana in Year 2: Reduced Operating Agreement (R50m) applies'
                                : 'Did not enter Botswana in Year 2: Standard Operating Agreement (R95m) applies'}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleToggleOpportunity('botswana', !botswanaSelected)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            botswanaSelected
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          {botswanaSelected ? '✓ Entering Botswana' : 'Enter Botswana'}
                        </button>
                      </div>

                      <div className="space-y-2 text-xs border-t border-slate-200/80 pt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">TechBook Market Demand</span>
                          <span className="font-mono font-semibold text-slate-800">{isYear2 ? '50,000' : '20,000'} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Zroid Market Demand</span>
                          <span className="font-mono font-semibold text-slate-800">{isYear2 ? '80,000' : '50,000'} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">iTab Market Demand</span>
                          <span className="font-mono font-semibold text-slate-800">{isYear2 ? '60,000' : '70,000'} units</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200/60">
                          <span className="text-slate-600 font-medium">Entry Cost & Tax</span>
                          <span className="font-semibold text-slate-900 text-right">
                            {isYear2
                              ? 'Operating Agreement: R 90,000,000'
                              : `Operating Agreement: R ${enteredBotswanaY2 ? '50,000,000' : '95,000,000'} + 50% tax on profits`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mozambique Card */}
                    {isYear2 ? (
                      <div className={`rounded-xl border-2 p-5 transition-all ${mozambiqueSelected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-900">Mozambique</h4>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Entry Mode: Agent
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleToggleOpportunity('mozambique', !mozambiqueSelected)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              mozambiqueSelected
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                            }`}
                          >
                            {mozambiqueSelected ? '✓ Entering Mozambique' : 'Enter Mozambique'}
                          </button>
                        </div>

                        <div className="space-y-2 text-xs border-t border-slate-200/80 pt-3">
                          <div className="flex justify-between">
                            <span className="text-slate-500">TechBook Market Demand</span>
                            <span className="font-mono font-semibold text-slate-800">20,000 units</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Zroid Market Demand</span>
                            <span className="font-mono font-semibold text-slate-800">45,000 units</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">iTab Market Demand</span>
                            <span className="font-mono font-semibold text-slate-800">40,000 units</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-200/60">
                            <span className="text-slate-600 font-medium">Entry Cost</span>
                            <span className="font-semibold text-slate-900 text-right">
                              Agent Commission: 4.5% of Sales
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-80">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-700">Mozambique</h4>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                <Lock className="w-3 h-3" /> Restricted in Year 3
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          The Mozambican government has decided to restrict imports of technological products in favour of local producers and suppliers. Therefore, teams are not able to sell in Mozambique in Year 3.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

      </div>
    </div>
  );
};

export default Marketing;