import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { formatPercent, formatNumber, parseNumber } from '../../utils/numberFormat';
import { PRODUCTS, SUPPLIERS, SUPPLIER_METRICS, COMPONENT_COSTS, FINISHED_GOODS_COSTS } from '../../constants';
import { ProductId } from '../../types';
import { Truck, Info, AlertCircle, ShoppingCart, Tag, BrainCircuit, Send, Lock, CheckCircle, Shield, Briefcase, User, Bot, X, MessageSquare } from 'lucide-react';
import DecisionsSummary from '../../components/DecisionsSummary';
import { useFlashOnChange } from '../../utils/useFlashOnChange';

const AnimatedProcurementInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    onBlur: () => void;
    onKeyDown: (e: any) => void;
    className: string;
    disabled: boolean;
}> = ({ value, onChange, onBlur, onKeyDown, className, disabled }) => {
    const flash = useFlashOnChange(value);
    return (
        <input 
            type="text"
            inputMode="numeric"
            className={`${className} ${flash ? 'animate-flash-green' : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
        />
    );
};

const Procurement: React.FC = () => {
  console.log("Procurement v2.1.3 loaded without negotiations.");
  const { decisions, updateDecisions, currentTeam, startNegotiation, sendNegotiationMessage, isReadOnly, currentRole } = useSimulation();
  const disabled = isReadOnly && currentRole === 'STUDENT';
  const { procurement, operations, negotiation } = decisions;
  const [activeTab, setActiveTab] = useState<ProductId>('techbook');
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({});
  
  // Negotiation Modal State
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [negotiationSupplierId, setNegotiationSupplierId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [negotiation.transcript, isNegotiationModalOpen]);

  const handleOpenNegotiationModal = async (supplierId: string) => {
    // Disabled/Hidden for now
    return;
  };

  const handleStartNegotiation = async (supplierId: string) => {
    setIsSending(true);
    await startNegotiation(supplierId);
    setIsSending(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    
    setIsSending(true);
    await sendNegotiationMessage(inputMessage);
    setInputMessage('');
    setIsSending(false);
  };

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
                                    <AnimatedProcurementInput 
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-blue-50 transition-colors outline-none font-bold text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={allocationInputs[`${activeTab}-${s}-components`] ?? ''}
                                        onChange={(val) => handleAllocationInputChange(s, 'components', val)}
                                        onBlur={() => handleAllocationCommit(s, 'components')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'components');
                                            }
                                        }}
                                        disabled={disabled}
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
                                    <AnimatedProcurementInput 
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-blue-50 transition-colors outline-none font-bold text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={allocationInputs[`${activeTab}-${s}-finishedGoods`] ?? ''}
                                        onChange={(val) => handleAllocationInputChange(s, 'finishedGoods', val)}
                                        onBlur={() => handleAllocationCommit(s, 'finishedGoods')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'finishedGoods');
                                            }
                                        }}
                                        disabled={disabled}
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
                                    <AnimatedProcurementInput 
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-3 py-2 bg-blue-50/50 font-bold text-blue-800 text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={allocationInputs[`${activeTab}-${s}-components`] ?? ''}
                                        onChange={(val) => handleAllocationInputChange(s, 'components', val)}
                                        onBlur={() => handleAllocationCommit(s, 'components')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'components');
                                            }
                                        }}
                                        disabled={disabled}
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
                                    <AnimatedProcurementInput 
                                        className="w-full text-right font-mono border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-3 py-2 bg-blue-50/50 font-bold text-blue-800 text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={allocationInputs[`${activeTab}-${s}-finishedGoods`] ?? ''}
                                        onChange={(val) => handleAllocationInputChange(s, 'finishedGoods', val)}
                                        onBlur={() => handleAllocationCommit(s, 'finishedGoods')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAllocationCommit(s, 'finishedGoods');
                                            }
                                        }}
                                        disabled={disabled}
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
                            {/* Negotiations Row Hidden */}
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
                            
                            {/* Negotiation Button Hidden */}
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

      {/* Negotiation Modal Dialog */}
      {isNegotiationModalOpen && negotiationSupplierId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-lg">
                  {negotiationSupplierId.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center font-bold">
                    Negotiation: {negotiationSupplierId}
                    {negotiation.status === 'AGREED' && negotiation.selectedSupplierId === negotiationSupplierId && (
                      <span className="ml-3 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full flex items-center font-bold">
                        <CheckCircle size={12} className="mr-1" /> Deal Closed
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">Formulate and propose your custom supplier contract terms.</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {negotiation.status === 'AGREED' && negotiation.selectedSupplierId === negotiationSupplierId && (
                  <div className="flex space-x-4 text-xs bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Discount</span>
                      <span className="font-bold text-emerald-600 font-mono">{formatPercent(negotiation.agreedDiscount, 2)}</span>
                    </div>
                    <div className="border-l border-slate-100 pl-3">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Terms</span>
                      <span className="font-bold text-slate-700 font-mono">{negotiation.agreedPaymentTerms} Days</span>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => setIsNegotiationModalOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* Left Column: Supplier Info (Desktop Only) */}
              <div className="hidden md:block w-80 border-r border-slate-200 p-6 overflow-y-auto bg-slate-50/50">
                <div className="text-center mb-6">
                  <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Supplier Profile</h4>
                  <p className="text-sm text-slate-600 italic">
                    {/* @ts-ignore */}
                    {SUPPLIER_METRICS[negotiationSupplierId]?.desc}
                  </p>
                </div>

                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Base Metrics</h4>
                  {Object.entries(SUPPLIER_METRICS[negotiationSupplierId as keyof typeof SUPPLIER_METRICS] || {}).map(([key, value]) => {
                    if (key === 'desc') return null;
                    let displayVal = value;
                    if (key === 'terms' && negotiation.status === 'AGREED' && negotiation.selectedSupplierId === negotiationSupplierId) {
                      displayVal = negotiation.agreedPaymentTerms;
                    }
                    
                    // Calculate average across all suppliers
                    const allVals = Object.values(SUPPLIER_METRICS).map(m => {
                      if (key === 'terms' && negotiation.status === 'AGREED' && negotiation.selectedSupplierId === m) {
                        return negotiation.agreedPaymentTerms; // use negotiated terms if agreed
                      }
                      return (m as any)[key];
                    }).filter(v => typeof v === 'number');
                    const avgVal = allVals.reduce((a, b) => a + b, 0) / allVals.length;

                    return (
                      <div key={key} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono font-bold ${key === 'terms' && negotiation.selectedSupplierId === negotiationSupplierId && negotiation.status === 'AGREED' ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {typeof displayVal === 'number' ? displayVal.toFixed(1) : displayVal}
                          </span>
                          {typeof displayVal === 'number' && (
                            <span className="text-[10px] text-slate-400">
                              (Avg: {avgVal.toFixed(1)})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Average KPI Rating across 5 Performance metrics */}
                  {(() => {
                    const kpiKeys = ['quality', 'leadTime', 'service', 'capacity', 'innovation'];
                    const mInfo = SUPPLIER_METRICS[negotiationSupplierId as keyof typeof SUPPLIER_METRICS] || {};
                    const selectedKpiSum = kpiKeys.reduce((sum, k) => sum + (mInfo[k as keyof typeof mInfo] as number || 0), 0);
                    const selectedKpiAvg = selectedKpiSum / kpiKeys.length;

                    const allSuppliersKpiAvg = Object.values(SUPPLIER_METRICS).map(m => {
                      const sum = kpiKeys.reduce((s, k) => s + (m[k as keyof typeof m] as number || 0), 0);
                      return sum / kpiKeys.length;
                    });
                    const overallAvgKpi = allSuppliersKpiAvg.reduce((a, b) => a + b, 0) / allSuppliersKpiAvg.length;

                    return (
                      <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 mt-2 font-bold">
                        <span className="text-slate-700">Average KPI Rating</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-indigo-600 font-mono">{selectedKpiAvg.toFixed(1)} / 10</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (Avg: {overallAvgKpi.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Base Costs Reference */}
                <div className="space-y-4 border-t border-slate-200 pt-4 mt-4">
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Base Input Costs</h4>
                  
                  {/* Components */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Components</span>
                    {PRODUCTS.map(p => {
                      // @ts-ignore
                      const baseCost = COMPONENT_COSTS[p.id][negotiationSupplierId];
                      const allCosts = Object.values(COMPONENT_COSTS[p.id]);
                      const avgCost = allCosts.reduce((a, b) => a + b, 0) / allCosts.length;
                      const diff = ((baseCost - avgCost) / avgCost) * 100;
                      
                      return (
                        <div key={p.id} className="text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-slate-600">{p.name}</span>
                            <span className="font-mono font-bold text-slate-700">R {baseCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Avg: R {avgCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                            <span className={`font-bold ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                              {diff > 0 ? '+' : ''}{formatPercent(diff, 2, false)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Finished Goods */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-t border-slate-100 pt-3">Finished Goods</span>
                    {PRODUCTS.map(p => {
                      // @ts-ignore
                      const baseCost = FINISHED_GOODS_COSTS[p.id][negotiationSupplierId];
                      const allCosts = Object.values(FINISHED_GOODS_COSTS[p.id]);
                      const avgCost = allCosts.reduce((a, b) => a + b, 0) / allCosts.length;
                      const diff = ((baseCost - avgCost) / avgCost) * 100;
                      
                      return (
                        <div key={p.id} className="text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-slate-600">{p.name}</span>
                            <span className="font-mono font-bold text-slate-700">R {baseCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Avg: R {avgCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                            <span className={`font-bold ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                              {diff > 0 ? '+' : ''}{formatPercent(diff, 2, false)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {negotiation.status === 'IN_PROGRESS' && negotiation.selectedSupplierId === negotiationSupplierId && (
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
                    <p className="font-bold mb-1 flex items-center"><BrainCircuit size={14} className="mr-1.5"/> Strategic Hint</p>
                    <p>
                      {negotiationSupplierId === 'Alpha' && "Alpha focuses on high-quality standards and relationship integrity."}
                      {negotiationSupplierId === 'Neepo' && "Neepo is responsive to volume commitments. Promise high product demand."}
                      {negotiationSupplierId === 'Zen' && "Zen values long-term partnerships and stability."}
                      {negotiationSupplierId === 'Cheng' && "Cheng is tech-focused. Highlight product innovation features."}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Chat transcript */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {negotiation.selectedSupplierId !== negotiationSupplierId ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <MessageSquare size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Start Supplier Negotiation</h4>
                      <p className="text-sm text-slate-500 max-w-sm mt-1">
                        You are initiating a dialogue with {negotiationSupplierId}. This will close any other ongoing negotiations.
                      </p>
                    </div>
                    <button
                      onClick={() => handleStartNegotiation(negotiationSupplierId)}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm"
                    >
                      Initialize Chat
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                      {negotiation.transcript.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600 ml-2' : 'bg-indigo-600 mr-2'}`}>
                              {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                            </div>
                            <div className={`p-3.5 rounded-xl text-sm leading-relaxed shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-white text-slate-800 rounded-tr-none border border-slate-200' 
                                : 'bg-indigo-600 text-white rounded-tl-none'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex justify-start">
                          <div className="flex flex-row">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 mr-2 flex items-center justify-center flex-shrink-0">
                              <Bot size={14} className="text-white" />
                            </div>
                            <div className="bg-slate-200 px-3.5 py-3 rounded-xl rounded-tl-none flex space-x-1 items-center">
                              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {negotiation.status === 'AGREED' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 mt-6 border-l-4 border-l-emerald-500 animate-in slide-in-from-bottom duration-300">
                          <div className="flex items-center space-x-3 text-emerald-800 font-bold border-b border-slate-100 pb-3">
                            <BrainCircuit className="text-emerald-600" size={20} />
                            <h5 className="text-base">Negotiation Debrief & Skill Assessment</h5>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Final Discount</span>
                              <span className="font-mono text-2xl font-black text-emerald-600">{(negotiation.agreedDiscount * 100).toFixed(1)}%</span>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payment Terms</span>
                              <span className="font-mono text-2xl font-black text-slate-700">{negotiation.agreedPaymentTerms} Days</span>
                            </div>
                          </div>

                          {/* Scores breakdown */}
                          <div className="space-y-3">
                            <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skill Scores</h6>
                            {negotiation.sessionScores && Object.entries(negotiation.sessionScores).map(([key, val]) => {
                              const score = val as number;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-600 capitalize">{key}</span>
                                    <span className="text-indigo-600 font-bold">{score} / 5</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-indigo-500' : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${(score / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Debrief Feedback */}
                          {negotiation.debriefFeedback && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-slate-700 text-xs leading-relaxed space-y-1">
                              <span className="font-bold text-[10px] uppercase text-indigo-600 block">Facilitator Feedback</span>
                              <p className="italic">"{negotiation.debriefFeedback}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-white border-t border-slate-200">
                      {negotiation.status === 'AGREED' ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-center text-emerald-800 text-sm font-semibold">
                          <Lock size={16} className="mr-2" />
                          Preferred supplier agreement finalized. Terms locked.
                        </div>
                      ) : (
                        <form onSubmit={handleSendMessage} className="relative">
                          <input 
                            type="text" 
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder={disabled ? "Only the CEO can send messages..." : `Type negotiation offer to ${negotiationSupplierId}...`}
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSending || disabled}
                          />
                          <button 
                            type="submit" 
                            disabled={!inputMessage.trim() || isSending || disabled}
                            className="absolute right-1.5 top-1.5 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                          >
                            <Send size={16} />
                          </button>
                        </form>
                      )}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Procurement;