import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { formatPercent, formatNumber, parseNumber } from '../../utils/numberFormat';
import { PRODUCTS, SUPPLIERS, SUPPLIER_METRICS, COMPONENT_COSTS, FINISHED_GOODS_COSTS } from '../../constants';
import { ProductId } from '../../types';
import { Truck, Info, AlertCircle, ShoppingCart, Tag } from 'lucide-react';
import DecisionsSummary from '../../components/DecisionsSummary';

const Procurement: React.FC = () => {
  const { decisions, updateDecisions, currentTeam } = useSimulation();
  const { procurement, operations, negotiation } = decisions;
  const [activeTab, setActiveTab] = useState<ProductId>('techbook');
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({});

  // Sync state when procurement.supplierAllocation changes
  useEffect(() => {
    const newInputs: Record<string, string> = {};
    PRODUCTS.forEach(p => {
      SUPPLIERS.forEach(s => {
        const compVal = procurement.supplierAllocation[p.id]?.[s]?.components || 0;
        const fgVal = procurement.supplierAllocation[p.id]?.[s]?.finishedGoods || 0;
        newInputs[`${p.id}-${s}-components`] = formatNumber(compVal, 0);
        newInputs[`${p.id}-${s}-finishedGoods`] = formatNumber(fgVal, 0);
      });
    });
    setAllocationInputs(newInputs);
  }, [procurement.supplierAllocation]);

  // Theme configuration for products - Modified to force Blue inputs for decisions cells
  const PRODUCT_THEMES: Record<ProductId, { 
      activeTabBorder: string;
      activeTabText: string;
      headerBg: string;
      iconColor: string;
      inputBg: string;
      inputText: string;
      inputBorder: string;
      focusRing: string;
  }> = {
      techbook: {
          activeTabBorder: 'border-blue-500',
          activeTabText: 'text-blue-600',
          headerBg: 'bg-gradient-to-r from-blue-600 to-blue-700',
          iconColor: 'text-blue-100',
          inputBg: 'bg-blue-50',
          inputText: 'text-blue-800',
          inputBorder: 'border-blue-200',
          focusRing: 'focus:ring-blue-500'
      },
      zroid: {
          activeTabBorder: 'border-emerald-500',
          activeTabText: 'text-emerald-600',
          headerBg: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
          iconColor: 'text-emerald-100',
          inputBg: 'bg-blue-50', // Standardized to Blue
          inputText: 'text-blue-800', // Standardized to Blue
          inputBorder: 'border-blue-200', // Standardized to Blue
          focusRing: 'focus:ring-blue-500' // Standardized to Blue
      },
      itab: {
          activeTabBorder: 'border-fuchsia-500',
          activeTabText: 'text-fuchsia-600',
          headerBg: 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-700',
          iconColor: 'text-fuchsia-100',
          inputBg: 'bg-blue-50', // Standardized to Blue
          inputText: 'text-blue-800', // Standardized to Blue
          inputBorder: 'border-blue-200', // Standardized to Blue
          focusRing: 'focus:ring-blue-500' // Standardized to Blue
      }
  };

  const theme = PRODUCT_THEMES[activeTab];

  const handleAllocationInputChange = (supplier: string, type: 'components' | 'finishedGoods', value: string) => {
    setAllocationInputs(prev => ({
      ...prev,
      [`${activeTab}-${supplier}-${type}`]: value
    }));
  };

  const handleAllocationCommit = (supplier: string, type: 'components' | 'finishedGoods') => {
    const key = `${activeTab}-${supplier}-${type}`;
    const rawValue = allocationInputs[key] ?? '0';
    const numericValue = parseInt(parseNumber(rawValue).toString()) || 0;
    
    updateDecisions('procurement', {
      supplierAllocation: {
        ...procurement.supplierAllocation,
        [activeTab]: {
          ...procurement.supplierAllocation[activeTab],
          [supplier]: {
            ...procurement.supplierAllocation[activeTab][supplier],
            [type]: numericValue
          }
        }
      }
    });

    setAllocationInputs(prev => ({
      ...prev,
      [key]: formatNumber(numericValue, 0)
    }));
  };

  // Derived Values
  const activeProduct = PRODUCTS.find(p => p.id === activeTab)!;
  
  // Required Components = Planned Production (Internal)
  const reqComponents = operations.production[activeTab] || 0;
  
  // Required Finished Goods directly from Operations "Req. Finished Goods"
  const reqFinishedGoods = operations.reqFinishedGoods?.[activeTab] || 0;

  // Totals
  const totalComponentsAllocated = SUPPLIERS.reduce((sum, s) => sum + (procurement.supplierAllocation[activeTab][s]?.components || 0), 0);
  const totalFinishedGoodsAllocated = SUPPLIERS.reduce((sum, s) => sum + (procurement.supplierAllocation[activeTab][s]?.finishedGoods || 0), 0);

  const componentsUnallocated = reqComponents - totalComponentsAllocated;
  const finishedGoodsUnallocated = reqFinishedGoods - totalFinishedGoodsAllocated;

  // Negotiation Impact Helper
  const getDiscountedCost = (baseCost: number, supplier: string) => {
      if (negotiation.status === 'AGREED' && negotiation.selectedSupplierId === supplier) {
          return baseCost * (1 - negotiation.agreedDiscount);
      }
      return baseCost;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      
      <DecisionsSummary />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Procurement Strategy</h1>
          <p className="text-slate-500 mt-2 text-lg">Select suppliers and allocate volume for components and finished goods.</p>
        </div>
      </div>

      {negotiation.status === 'AGREED' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center">
                  <Tag className="text-emerald-600 mr-3" />
                  <div>
                      <p className="font-bold text-emerald-900">Preferred Supplier Agreement Active</p>
                      <p className="text-sm text-emerald-700">
                          {negotiation.selectedSupplierId} is offering a {formatPercent(negotiation.agreedDiscount, 2)} discount on all orders.
                          Payment Terms: {negotiation.agreedPaymentTerms} days.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {PRODUCTS.map((product) => {
             const isSelected = activeTab === product.id;
             const themeClasses = PRODUCT_THEMES[product.id];
             
             return (
                <button
                key={product.id}
                onClick={() => setActiveTab(product.id)}
                className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isSelected 
                        ? `${themeClasses.activeTabBorder} ${themeClasses.activeTabText}` 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                `}
                >
                {product.name}
                </button>
            );
          })}
        </nav>
      </div>

      {/* Supplier Choice & Allocation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className={`px-6 py-4 border-b border-slate-100 ${theme.headerBg} transition-colors duration-300`}>
            <h3 className="font-bold text-white flex items-center">
                <Truck className={`w-5 h-5 mr-2 ${theme.iconColor}`} />
                Supplier Choice - {activeProduct.name}
            </h3>
        </div>
        <div className="p-0 lg:p-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto p-6">
                <table className="w-full text-center">
                    <thead>
                        <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="pb-4 text-left w-48">Volume Allocation</th>
                            <th className="pb-4 w-32">Required Units</th>
                            {SUPPLIERS.map(s => (
                                <th key={s} className="pb-4 w-32 relative">
                                    {s}
                                    {negotiation.status === 'AGREED' && negotiation.selectedSupplierId === s && (
                                        <span className="absolute -top-1 right-2 text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">DEAL</span>
                                    )}
                                </th>
                            ))}
                            <th className="pb-4 w-32">Unallocated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Components Row */}
                        <tr>
                            <td className="py-4 text-left font-bold text-slate-800">Components</td>
                            <td className="py-4 font-mono font-bold text-slate-600 bg-slate-50">{reqComponents.toLocaleString()}</td>
                            {SUPPLIERS.map(s => (
                                <td key={s} className={`py-4 px-2 ${negotiation.selectedSupplierId === s && negotiation.status === 'AGREED' ? 'bg-emerald-50/50' : ''}`}>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-blue-50 transition-colors outline-none font-bold text-blue-800"
                                        value={allocationInputs[`${activeTab}-${s}-components`] ?? ''}
                                        onChange={(e) => handleAllocationInputChange(s, 'components', e.target.value)}
                                        onBlur={() => handleAllocationCommit(s, 'components')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'components');
                                            }
                                        }}
                                    />
                                </td>
                            ))}
                            <td className={`py-4 font-mono font-bold ${componentsUnallocated !== 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                {componentsUnallocated !== 0 ? componentsUnallocated.toLocaleString() : '-'}
                            </td>
                        </tr>
                         {/* Finished Goods Row */}
                        <tr>
                            <td className="py-4 text-left font-bold text-slate-800">
                                Finished Goods
                                <span className="block text-xs font-normal text-slate-400">Outsourced / Direct Purchase</span>
                            </td>
                            <td className="py-4 font-mono font-bold text-slate-600 bg-slate-50">{reqFinishedGoods.toLocaleString()}</td>
                            {SUPPLIERS.map(s => (
                                <td key={s} className={`py-4 px-2 ${negotiation.selectedSupplierId === s && negotiation.status === 'AGREED' ? 'bg-emerald-50/50' : ''}`}>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-blue-50 transition-colors outline-none font-bold text-blue-800"
                                        value={allocationInputs[`${activeTab}-${s}-finishedGoods`] ?? ''}
                                        onChange={(e) => handleAllocationInputChange(s, 'finishedGoods', e.target.value)}
                                        onBlur={() => handleAllocationCommit(s, 'finishedGoods')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'finishedGoods');
                                            }
                                        }}
                                    />
                                </td>
                            ))}
                            <td className={`py-4 font-mono font-bold ${finishedGoodsUnallocated !== 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                {finishedGoodsUnallocated !== 0 ? finishedGoodsUnallocated.toLocaleString() : '-'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-6 p-4">
                {/* Components Allocation Card */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-800 text-sm">Components Allocation</h4>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            componentsUnallocated !== 0 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                            {componentsUnallocated !== 0 ? `Unallocated: ${componentsUnallocated.toLocaleString()}` : 'Fully Allocated'}
                        </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Required Units</span>
                        <span className="font-bold text-slate-700 font-mono text-sm">{reqComponents.toLocaleString()}</span>
                    </div>

                    <div className="space-y-3">
                        {SUPPLIERS.map(s => {
                            const isDeal = negotiation.status === 'AGREED' && negotiation.selectedSupplierId === s;
                            return (
                                <div key={s} className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                        <span>{s}</span>
                                        {isDeal && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">DEAL</span>}
                                    </label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-3 py-2 bg-blue-50/50 font-bold text-blue-800 text-sm outline-none transition-all"
                                        value={allocationInputs[`${activeTab}-${s}-components`] ?? ''}
                                        onChange={(e) => handleAllocationInputChange(s, 'components', e.target.value)}
                                        onBlur={() => handleAllocationCommit(s, 'components')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'components');
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Finished Goods Allocation Card */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Finished Goods Allocation</h4>
                            <span className="text-[10px] text-slate-400">Outsourced / Direct Purchase</span>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            finishedGoodsUnallocated !== 0 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                            {finishedGoodsUnallocated !== 0 ? `Unallocated: ${finishedGoodsUnallocated.toLocaleString()}` : 'Fully Allocated'}
                        </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Required Units</span>
                        <span className="font-bold text-slate-700 font-mono text-sm">{reqFinishedGoods.toLocaleString()}</span>
                    </div>

                    <div className="space-y-3">
                        {SUPPLIERS.map(s => {
                            const isDeal = negotiation.status === 'AGREED' && negotiation.selectedSupplierId === s;
                            return (
                                <div key={s} className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                        <span>{s}</span>
                                        {isDeal && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">DEAL</span>}
                                    </label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-3 py-2 bg-blue-50/50 font-bold text-blue-800 text-sm outline-none transition-all"
                                        value={allocationInputs[`${activeTab}-${s}-finishedGoods`] ?? ''}
                                        onChange={(e) => handleAllocationInputChange(s, 'finishedGoods', e.target.value)}
                                        onBlur={() => handleAllocationCommit(s, 'finishedGoods')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'finishedGoods');
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {(componentsUnallocated !== 0 || finishedGoodsUnallocated !== 0) && (
                <div className="mx-4 mb-4 lg:mx-0 lg:mb-0 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Ensure all required units are allocated to suppliers.
                </div>
            )}
        </div>
      </div>

      {/* Performance & Costs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Supplier Performance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="mb-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                        Forecasted Supplier Performance
                    </h3>
                    <p className="text-xs text-red-500 font-medium mt-1">
                        (1 - Poor | 5 - Average | 10 - Excellent)
                    </p>
                </div>
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-center text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                                <th className="text-left py-2">Metric</th>
                                {SUPPLIERS.map(s => <th key={s} className="py-2 px-2 border-l border-slate-100">{s}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[
                                { key: 'quality', label: 'Quality' },
                                { key: 'leadTime', label: 'Lead Time' },
                                { key: 'service', label: 'After Sales Service' },
                                { key: 'capacity', label: 'Capacity' },
                                { key: 'innovation', label: 'Product Innovation' },
                                { key: 'terms', label: 'Terms (Days)' },
                            ].map((metric) => (
                                <tr key={metric.key}>
                                    <td className="py-3 text-left font-medium text-slate-700">{metric.label}</td>
                                    {SUPPLIERS.map(s => {
                                        // Override Terms if negotiated
                                        // @ts-ignore
                                        let val = SUPPLIER_METRICS[s][metric.key];
                                        if (metric.key === 'terms' && negotiation.status === 'AGREED' && negotiation.selectedSupplierId === s) {
                                            val = negotiation.agreedPaymentTerms;
                                        }

                                        return (
                                            <td key={s} className={`py-3 px-2 border-l border-slate-100 text-slate-600 ${metric.key === 'terms' && negotiation.selectedSupplierId === s && negotiation.status === 'AGREED' ? 'font-bold text-emerald-600' : ''}`}>
                                                {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-4">
                    {SUPPLIERS.map(s => (
                        <div key={s} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2 flex justify-between items-center">
                                <span>{s} Performance</span>
                                {negotiation.status === 'AGREED' && negotiation.selectedSupplierId === s && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Agreed Deal</span>
                                )}
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                {[
                                    { key: 'quality', label: 'Quality' },
                                    { key: 'leadTime', label: 'Lead Time' },
                                    { key: 'service', label: 'After Sales Service' },
                                    { key: 'capacity', label: 'Capacity' },
                                    { key: 'innovation', label: 'Product Innovation' },
                                    { key: 'terms', label: 'Terms (Days)' },
                                ].map((metric) => {
                                    // Override Terms if negotiated
                                    // @ts-ignore
                                    let val = SUPPLIER_METRICS[s][metric.key];
                                    if (metric.key === 'terms' && negotiation.status === 'AGREED' && negotiation.selectedSupplierId === s) {
                                        val = negotiation.agreedPaymentTerms;
                                    }
                                    const isNegotiated = metric.key === 'terms' && negotiation.selectedSupplierId === s && negotiation.status === 'AGREED';

                                    return (
                                        <div key={metric.key} className="flex justify-between items-center py-1">
                                            <span className="text-slate-500 font-medium">{metric.label}</span>
                                            <span className={`font-bold font-mono ${isNegotiated ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                {val.toLocaleString(undefined, { minimumFractionDigits: metric.key === 'terms' ? 0 : 1, maximumFractionDigits: 1 })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
          </div>

          {/* Costs */}
          <div className="space-y-6">
              {/* Component Costs */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">
                      Input Costs / Unit (Components)
                  </h3>
                  <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-center text-sm">
                          <thead>
                               <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="text-left py-2">Product</th>
                                    {SUPPLIERS.map(s => <th key={s} className="py-2 px-2 border-l border-slate-100">{s}</th>)}
                               </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {PRODUCTS.map(p => (
                                  <tr key={p.id}>
                                      <td className="py-2 text-left font-medium text-slate-700">{p.name}</td>
                                      {SUPPLIERS.map(s => {
                                          const baseCost = COMPONENT_COSTS[p.id][s];
                                          const discountedCost = getDiscountedCost(baseCost, s);
                                          const hasDiscount = discountedCost < baseCost;

                                          return (
                                            <td key={s} className={`py-2 px-2 border-l border-slate-100 text-slate-600 font-mono ${hasDiscount ? 'bg-emerald-50' : ''}`}>
                                                {hasDiscount ? (
                                                    <>
                                                        <span className="line-through text-xs text-slate-400 block">R {baseCost.toLocaleString()}</span>
                                                        <span className="text-emerald-700 font-bold">R {discountedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </>
                                                ) : (
                                                    `R ${baseCost.toLocaleString()}`
                                                )}
                                            </td>
                                          );
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                      {PRODUCTS.map(p => (
                          <div key={p.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                              <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">{p.name}</h4>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                  {SUPPLIERS.map(s => {
                                      const baseCost = COMPONENT_COSTS[p.id][s];
                                      const discountedCost = getDiscountedCost(baseCost, s);
                                      const hasDiscount = discountedCost < baseCost;

                                      return (
                                        <div key={s} className={`p-2 rounded-lg border text-center ${hasDiscount ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                            <span className="text-slate-500 block text-[10px] mb-0.5">{s}</span>
                                            {hasDiscount ? (
                                                <>
                                                    <span className="line-through text-[9px] text-slate-400 block">R {baseCost.toLocaleString()}</span>
                                                    <span className="text-emerald-700 font-bold font-mono">R {discountedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </>
                                            ) : (
                                                <span className="font-bold text-slate-700 font-mono">R {baseCost.toLocaleString()}</span>
                                            )}
                                        </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

               {/* Finished Goods Costs */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">
                      Input Costs / Unit (Finished Goods)
                  </h3>
                  <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-center text-sm">
                          <thead>
                               <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="text-left py-2">Product</th>
                                    {SUPPLIERS.map(s => <th key={s} className="py-2 px-2 border-l border-slate-100">{s}</th>)}
                               </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {PRODUCTS.map(p => (
                                  <tr key={p.id}>
                                      <td className="py-2 text-left font-medium text-slate-700">{p.name}</td>
                                      {SUPPLIERS.map(s => {
                                          const baseCost = FINISHED_GOODS_COSTS[p.id][s];
                                          const discountedCost = getDiscountedCost(baseCost, s);
                                          const hasDiscount = discountedCost < baseCost;

                                          return (
                                            <td key={s} className={`py-2 px-2 border-l border-slate-100 text-slate-600 font-mono ${hasDiscount ? 'bg-emerald-50' : ''}`}>
                                                {hasDiscount ? (
                                                    <>
                                                        <span className="line-through text-xs text-slate-400 block">R {baseCost.toLocaleString()}</span>
                                                        <span className="text-emerald-700 font-bold">R {discountedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </>
                                                ) : (
                                                    `R ${baseCost.toLocaleString()}`
                                                )}
                                            </td>
                                          );
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                      {PRODUCTS.map(p => (
                          <div key={p.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                              <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">{p.name}</h4>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                  {SUPPLIERS.map(s => {
                                      const baseCost = FINISHED_GOODS_COSTS[p.id][s];
                                      const discountedCost = getDiscountedCost(baseCost, s);
                                      const hasDiscount = discountedCost < baseCost;

                                      return (
                                        <div key={s} className={`p-2 rounded-lg border text-center ${hasDiscount ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                            <span className="text-slate-500 block text-[10px] mb-0.5">{s}</span>
                                            {hasDiscount ? (
                                                <>
                                                    <span className="line-through text-[9px] text-slate-400 block">R {baseCost.toLocaleString()}</span>
                                                    <span className="text-emerald-700 font-bold font-mono">R {discountedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </>
                                            ) : (
                                                <span className="font-bold text-slate-700 font-mono">R {baseCost.toLocaleString()}</span>
                                            )}
                                        </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

      </div>

    </div>
  );
};

export default Procurement;