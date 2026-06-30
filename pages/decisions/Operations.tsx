import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { PRODUCTS, OPERATIONS_CONSTANTS, MARKET_SIZES } from '../../constants';
import { ProductId } from '../../types';
import { Box, Layers, Zap, TrendingUp, AlertTriangle, Hammer, Link as LinkIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import DecisionsSummary from '../../components/DecisionsSummary';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../../utils/numberFormat';

const Operations: React.FC = () => {
  const { decisions, updateDecisions, currentTeam } = useSimulation();
  const { operations, marketing } = decisions;

  const [rdSplitInputs, setRdSplitInputs] = useState<Record<ProductId, string>>({
    techbook: formatNumber((operations.rdSplits.techbook || 0) * 100, 2),
    zroid: formatNumber((operations.rdSplits.zroid || 0) * 100, 2),
    itab: formatNumber((operations.rdSplits.itab || 0) * 100, 2)
  });

  const [capacityChangeInput, setCapacityChangeInput] = useState<string>(
    operations.capacityChange === 0 ? '' : formatNumber(operations.capacityChange, 0)
  );

  const [productionInputs, setProductionInputs] = useState<Record<ProductId, string>>({
    techbook: formatNumber(operations.production.techbook || 0, 0),
    zroid: formatNumber(operations.production.zroid || 0, 0),
    itab: formatNumber(operations.production.itab || 0, 0)
  });

  const [finishedGoodsInputs, setFinishedGoodsInputs] = useState<Record<ProductId, string>>({
    techbook: formatNumber(operations.reqFinishedGoods?.techbook || 0, 0),
    zroid: formatNumber(operations.reqFinishedGoods?.zroid || 0, 0),
    itab: formatNumber(operations.reqFinishedGoods?.itab || 0, 0)
  });

  // -- Handlers --

  const handleProductionChange = (productId: ProductId, value: string) => {
    updateDecisions('operations', {
        production: {
            ...operations.production,
            [productId]: parseInt(value) || 0
        }
    });
  };

  const handleRequiredGoodsChange = (productId: ProductId, value: string) => {
    updateDecisions('operations', {
      reqFinishedGoods: {
        ...operations.reqFinishedGoods,
        [productId]: parseInt(value) || 0
      }
    });
  };

  const handleProductionInputChange = (productId: ProductId, value: string) => {
    setProductionInputs(prev => ({ ...prev, [productId]: value }));
  };

  const handleProductionCommit = (productId: ProductId) => {
    const rawValue = productionInputs[productId] ?? '0';
    const numericValue = Math.floor(parseNumber(rawValue)) || 0;
    handleProductionChange(productId, String(numericValue));
    setProductionInputs(prev => ({
      ...prev,
      [productId]: formatNumber(numericValue, 0)
    }));
  };

  const handleFinishedGoodsInputChange = (productId: ProductId, value: string) => {
    setFinishedGoodsInputs(prev => ({ ...prev, [productId]: value }));
  };

  const handleFinishedGoodsCommit = (productId: ProductId) => {
    const rawValue = finishedGoodsInputs[productId] ?? '0';
    const numericValue = Math.floor(parseNumber(rawValue)) || 0;
    handleRequiredGoodsChange(productId, String(numericValue));
    setFinishedGoodsInputs(prev => ({
      ...prev,
      [productId]: formatNumber(numericValue, 0)
    }));
  };

  const handleCapacityChange = (value: string) => {
    updateDecisions('operations', {
      capacityChange: parseInt(value) || 0,
    });
  };

  const handleCapacityChangeInputChange = (value: string) => {
    setCapacityChangeInput(value);
  };

  const handleCapacityChangeCommit = () => {
    const rawValue = capacityChangeInput ?? '0';
    const numericValue = Math.floor(parseNumber(rawValue)) || 0;
    handleCapacityChange(String(numericValue));
    setCapacityChangeInput(numericValue === 0 ? '' : formatNumber(numericValue, 0));
  };

  const handleRDBudgetChange = (value: string) => {
      updateDecisions('operations', {
          rdBudget: parseInt(value) || 0
      });
  };

  const handleRDSplitChange = (productId: ProductId, value: string) => {
      const newVal = parseNumber(value) / 100; // Convert 25 to 0.25
      updateDecisions('operations', {
          rdSplits: {
              ...operations.rdSplits,
              [productId]: newVal
          }
      });
  };

  const handleRDSplitInputChange = (productId: ProductId, value: string) => {
      setRdSplitInputs(prev => ({ ...prev, [productId]: value }));
  };

  const handleRDSplitCommit = (productId: ProductId) => {
      const rawValue = rdSplitInputs[productId] ?? '0';
      const numericValue = parseNumber(rawValue);
      handleRDSplitChange(productId, String(numericValue));
      setRdSplitInputs(prev => ({
          ...prev,
          [productId]: formatNumber(numericValue, 2)
      }));
  };

  useEffect(() => {
      setRdSplitInputs({
          techbook: formatNumber((operations.rdSplits.techbook || 0) * 100, 2),
          zroid: formatNumber((operations.rdSplits.zroid || 0) * 100, 2),
          itab: formatNumber((operations.rdSplits.itab || 0) * 100, 2)
      });
  }, [operations.rdSplits.techbook, operations.rdSplits.zroid, operations.rdSplits.itab]);

  useEffect(() => {
    setCapacityChangeInput(
      operations.capacityChange === 0 ? '' : formatNumber(operations.capacityChange, 0)
    );
  }, [operations.capacityChange]);

  useEffect(() => {
    setProductionInputs({
      techbook: formatNumber(operations.production.techbook || 0, 0),
      zroid: formatNumber(operations.production.zroid || 0, 0),
      itab: formatNumber(operations.production.itab || 0, 0)
    });
  }, [operations.production.techbook, operations.production.zroid, operations.production.itab]);

  useEffect(() => {
    setFinishedGoodsInputs({
      techbook: formatNumber(operations.reqFinishedGoods?.techbook || 0, 0),
      zroid: formatNumber(operations.reqFinishedGoods?.zroid || 0, 0),
      itab: formatNumber(operations.reqFinishedGoods?.itab || 0, 0)
    });
  }, [operations.reqFinishedGoods?.techbook, operations.reqFinishedGoods?.zroid, operations.reqFinishedGoods?.itab]);

  // -- Calculations --

  const totalProduction = (Object.values(operations.production) as number[]).reduce((a, b) => a + Math.max(0, b), 0);
  const capacityUtilization = (totalProduction / currentTeam.factoryCapacity) * 100;
  const isOverCapacity = totalProduction > currentTeam.factoryCapacity;
  
  const capexCost = operations.capacityChange > 0 
    ? operations.capacityChange * OPERATIONS_CONSTANTS.capexUnitCost 
    : 0;

  const totalRDSplit = (Object.values(operations.rdSplits) as number[]).reduce((a, b) => a + b, 0);
  
  // Data for Capacity Chart
  const capacityChartData = [
      { name: 'Capacity', value: currentTeam.factoryCapacity, type: 'limit' },
      { name: 'Planned', value: totalProduction, type: 'usage' }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      
      <DecisionsSummary />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operations Strategy</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage inventory, production capacity, and R&D innovation.</p>
        </div>
        <div className="flex gap-4">
             <div className={`px-4 py-2 rounded-lg border shadow-sm text-right ${isOverCapacity ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Utilization</p>
                <div className="flex items-center justify-end gap-2">
                    {isOverCapacity && <AlertTriangle size={16} className="text-red-600"/>}
                    <p className={`text-2xl font-bold ${isOverCapacity ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatPercent(capacityUtilization, 2, false)}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Inventory Management Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center">
                <Box className="w-5 h-5 mr-2 text-blue-600" />
                Inventory Management
            </h3>
        </div>
        <div className="p-0 lg:p-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <th className="pb-4 pl-2">Product</th>
                            <th className="pb-4 text-right">
                                <div className="flex items-center justify-end group cursor-help">
                                    <span>Planned Sales</span>
                                    <LinkIcon size={12} className="ml-1 text-blue-400" />
                                    <div className="hidden group-hover:block absolute bg-slate-800 text-white p-2 rounded text-xs -mt-12 mr-6 whitespace-nowrap z-10 font-normal">
                                        Linked to Marketing Market Share Forecast
                                    </div>
                                </div>
                            </th>
                            <th className="pb-4 text-right">Opening Inv.</th>
                            <th className="pb-4 px-4 w-32 text-right">Planned Production</th>
                            <th className="pb-4 px-4 w-36 text-right">Req. Finished Goods</th>
                            <th className="pb-4 text-right pr-2">Over / (Under) Stocked</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {PRODUCTS.map((product) => {
                            // Calculate Planned Sales from Marketing Forecast
                            const marketSize = MARKET_SIZES[product.id];
                            const forecastedShare = marketing.forecastedMarketShare[product.id] || 0;
                            const plannedSales = Math.round((marketSize * forecastedShare) / 100);

                            const openingInv = (currentTeam.inventory[product.id] as number) || 0;
                            const production = (operations.production[product.id] as number) || 0;
                            const reqFinishedGoods = (operations.reqFinishedGoods?.[product.id] as number) || 0;
                            
                            // Formula: Total Supply - Planned Sales
                            // Result < 0: Under Stocked (Shortage) -> Red, Negative
                            // Result > 0: Over Stocked (Surplus) -> Green, Positive
                            const stockPosition = (openingInv + production + reqFinishedGoods) - plannedSales;

                            return (
                                <tr key={product.id} className="group hover:bg-slate-50">
                                    <td className="py-4 pl-2">
                                        <div className="font-bold text-slate-900">{product.name}</div>
                                    </td>
                                    <td className="py-4 text-right font-mono text-blue-700 font-semibold bg-blue-50/30">
                                        {plannedSales.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right font-mono text-slate-600">
                                        {openingInv.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-4">
                                         <input 
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-blue-50 transition-colors outline-none font-bold text-blue-800"
                                            value={productionInputs[product.id] ?? ''}
                                            onChange={(e) => handleProductionInputChange(product.id, e.target.value)}
                                            onBlur={() => handleProductionCommit(product.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleProductionCommit(product.id);
                                                }
                                            }}
                                         />
                                    </td>
                                    <td className="py-4 px-4">
                                         <input 
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-blue-50 transition-colors outline-none font-bold text-blue-800"
                                            value={finishedGoodsInputs[product.id] ?? ''}
                                            onChange={(e) => handleFinishedGoodsInputChange(product.id, e.target.value)}
                                            onBlur={() => handleFinishedGoodsCommit(product.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleFinishedGoodsCommit(product.id);
                                                }
                                            }}
                                         />
                                    </td>
                                    <td className={`py-4 text-right font-mono pr-2 font-bold ${stockPosition < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {stockPosition.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-100 bg-slate-50">
                        <tr>
                             <td colSpan={3} className="py-3 text-right font-bold text-slate-500 text-xs uppercase tracking-wider">Total Production</td>
                             <td className="py-3 px-4 text-right font-mono font-bold text-blue-900 bg-slate-50/50">
                                 {totalProduction.toLocaleString()}
                             </td>
                             <td colSpan={2} className="py-3 px-4 text-xs text-slate-400 italic text-right">
                                 Capacity Limit: {currentTeam.factoryCapacity.toLocaleString()}
                             </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4 p-4">
                {PRODUCTS.map((product) => {
                    const marketSize = MARKET_SIZES[product.id];
                    const forecastedShare = marketing.forecastedMarketShare[product.id] || 0;
                    const plannedSales = Math.round((marketSize * forecastedShare) / 100);
                    const openingInv = (currentTeam.inventory[product.id] as number) || 0;
                    const production = (operations.production[product.id] as number) || 0;
                    const reqFinishedGoods = (operations.reqFinishedGoods?.[product.id] as number) || 0;
                    const stockPosition = (openingInv + production + reqFinishedGoods) - plannedSales;

                    return (
                        <div key={product.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <h4 className="font-bold text-slate-800 text-sm">{product.name}</h4>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                    stockPosition < 0 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                    {stockPosition < 0 ? 'Shortage: ' : 'Surplus: '}
                                    {stockPosition.toLocaleString()}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                    <span className="text-slate-500 block mb-0.5">Planned Sales</span>
                                    <span className="font-bold text-blue-700 font-mono text-sm">{plannedSales.toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                    <span className="text-slate-500 block mb-0.5">Opening Inv.</span>
                                    <span className="font-bold text-slate-700 font-mono text-sm">{openingInv.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-500 block">Planned Production</label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-2.5 py-1.5 bg-blue-50 font-bold text-blue-800 text-xs"
                                        value={productionInputs[product.id] ?? ''}
                                        onChange={(e) => handleProductionInputChange(product.id, e.target.value)}
                                        onBlur={() => handleProductionCommit(product.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleProductionCommit(product.id);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-500 block">Req. Finished Goods</label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-2.5 py-1.5 bg-blue-50 font-bold text-blue-800 text-xs"
                                        value={finishedGoodsInputs[product.id] ?? ''}
                                        onChange={(e) => handleFinishedGoodsInputChange(product.id, e.target.value)}
                                        onBlur={() => handleFinishedGoodsCommit(product.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleFinishedGoodsCommit(product.id);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-600">Total Planned Production:</span>
                        <span className="font-bold font-mono text-blue-900">{totalProduction.toLocaleString()} Units</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Current Factory Capacity Limit:</span>
                        <span className="font-mono text-slate-700">{currentTeam.factoryCapacity.toLocaleString()} Units</span>
                    </div>
                </div>
            </div>

            {isOverCapacity && (
                 <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-xs">
                    <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span><strong>Warning:</strong> Production exceeds factory capacity by {(totalProduction - currentTeam.factoryCapacity).toLocaleString()} units.</span>
                 </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Expansion (CAPEX) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
               <h3 className="font-bold text-slate-800 flex items-center mb-6">
                    <Hammer className="w-5 h-5 mr-2 text-indigo-600" />
                    Expansion (CAPEX)
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                   <div className="space-y-6">
                        <div>
                             <label className="text-sm font-medium text-slate-700 block mb-1">Build Capacity</label>
                             <div className="relative">
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full pl-3 pr-16 py-2 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="0"
                                    value={capacityChangeInput}
                                    onChange={(e) => handleCapacityChangeInputChange(e.target.value)}
                                    onBlur={() => handleCapacityChangeCommit()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCapacityChangeCommit();
                                        }
                                    }}
                                />
                                <span className="absolute right-3 top-2 text-xs text-blue-400 mt-0.5">Units</span>
                             </div>
                             <p className="text-xs text-slate-500 mt-1 italic">(To be available next year)</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Forecasted Costs</p>
                            <p className="text-xl font-mono font-bold text-slate-800">
                                {formatCurrency(capexCost)}
                            </p>
                        </div>
                   </div>

                   <div className="h-48 w-full bg-slate-900/5 rounded-lg border border-slate-200/50 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={capacityChartData} margin={{top: 20, right: 20, bottom: 0, left: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}} 
                                    formatter={(value: any) => [formatNumber(value as number, 0), 'Units']}
                                />
                                <Bar dataKey="value" barSize={40}>
                                    {capacityChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.type === 'limit' ? '#3B82F6' : (isOverCapacity ? '#EF4444' : '#10B981')} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
               </div>
          </div>

          {/* Research & Development */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 flex items-center mb-6">
                    <Zap className="w-5 h-5 mr-2 text-amber-500" />
                    Research & Development
               </h3>

               <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center shadow-lg shadow-slate-200">
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Total Innovation Budget</label>
                            <div className="flex items-center mt-1">
                                <span className="text-slate-400 mr-1">R</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    className="bg-transparent text-xl font-bold font-mono outline-none w-40 placeholder-slate-600"
                                    value={formatNumber(operations.rdBudget)}
                                    onChange={(e) => handleRDBudgetChange(String(parseNumber(e.target.value)))}
                                />
                            </div>
                        </div>
                        <TrendingUp className="text-emerald-400" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase border-b border-slate-100 pb-2">
                            <span>Product</span>
                            <span>Split %</span>
                            <span>Investment</span>
                        </div>
                        {PRODUCTS.map((p, i) => {
                            const splitVal = Number(operations.rdSplits[p.id]);
                            const investment = operations.rdBudget * splitVal;
                            // Mock feature level calculation based on cumulative investment simulation
                            // In a real app this would come from backend state
                            const features = i === 2 ? 2 : 1; 

                            return (
                                <div key={p.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800">{p.name}</p>
                                        <div className="flex space-x-1 mt-1">
                                            {[...Array(3)].map((_, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`w-2 h-2 rounded-full ${idx < features ? 'bg-emerald-500' : 'bg-slate-200'}`} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="relative w-24">
                                            <input 
                                                type="text"
                                                inputMode="decimal"
                                                className="w-full text-right pr-6 py-1 bg-blue-50 border border-blue-200 rounded text-blue-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={rdSplitInputs[p.id] ?? ''}
                                                onChange={(e) => handleRDSplitInputChange(p.id, e.target.value)}
                                                onBlur={() => handleRDSplitCommit(p.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleRDSplitCommit(p.id);
                                                    }
                                                }}
                                            />
                                            <span className="absolute right-2 top-1.5 text-xs text-blue-400">%</span>
                                        </div>
                                        <div className="w-28 text-right font-mono text-sm text-slate-600">
                                            {formatCurrency(investment)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {Math.abs(totalRDSplit - 1.0) > 0.01 && (
                        <div className="text-xs text-red-500 font-medium text-center bg-red-50 py-1 rounded">
                            Splits must sum to 100% (Current: {formatPercent(totalRDSplit, 2)})
                        </div>
                    )}

               </div>
          </div>

      </div>

    </div>
  );
};

export default Operations;