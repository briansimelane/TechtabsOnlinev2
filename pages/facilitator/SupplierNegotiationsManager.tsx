import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { SUPPLIERS, SUPPLIER_METRICS, COMPONENT_COSTS, FINISHED_GOODS_COSTS, PRODUCTS } from '../../constants';
import { TeamSupplierOverride, ProductId } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/numberFormat';
import { 
  Handshake, 
  CheckCircle2, 
  Save, 
  Building, 
  Percent, 
  Calendar,
  Layers,
  Box,
  Award,
  Truck,
  Copy,
  Clock,
  Headphones,
  Database,
  Sparkles,
  FileText,
  Sliders
} from 'lucide-react';
import { SupplierDealsReport } from './SupplierDealsReport';

interface Props {
  classId: string;
}

export const SupplierNegotiationsManager: React.FC<Props> = ({ classId }) => {
  const { classes, updateTeamSupplierOverridesByFacilitator } = useSimulation();
  
  const [managerTab, setManagerTab] = useState<'edit' | 'report'>('edit');
  const currentClass = classes.find(c => c.id === classId);
  const teams = currentClass?.teams?.filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id)) || [];

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('Alpha');
  
  // Custom Overrides State for current selected Team & Supplier
  const [componentPrices, setComponentPrices] = useState<Record<ProductId, number>>({
    techbook: COMPONENT_COSTS.techbook.Alpha,
    zroid: COMPONENT_COSTS.zroid.Alpha,
    itab: COMPONENT_COSTS.itab.Alpha
  });

  const [finishedGoodsPrices, setFinishedGoodsPrices] = useState<Record<ProductId, number>>({
    techbook: FINISHED_GOODS_COSTS.techbook.Alpha,
    zroid: FINISHED_GOODS_COSTS.zroid.Alpha,
    itab: FINISHED_GOODS_COSTS.itab.Alpha
  });

  const [paymentTerms, setPaymentTerms] = useState<number>(45);
  const [agreedDiscount, setAgreedDiscount] = useState<number>(0.05);
  const [quality, setQuality] = useState<number>(8);
  const [leadTime, setLeadTime] = useState<number>(3);
  const [service, setService] = useState<number>(8);
  const [capacity, setCapacity] = useState<number>(4);
  const [innovation, setInnovation] = useState<number>(8);
  const [deliveryReliability, setDeliveryReliability] = useState<number>(0.95);
  const [status, setStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'AGREED' | 'FAILED'>('AGREED');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmDetails, setConfirmDetails] = useState<{
    targetName: string;
    supplierId: string;
    isAllTeams: boolean;
  } | null>(null);

  // Default team selection
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const existingOverrides: TeamSupplierOverride = selectedTeam?.draftDecisions?.supplierOverrides || {};

  // Load active team & supplier values when selection changes
  useEffect(() => {
    const defaultMetrics = (SUPPLIER_METRICS as any)[supplierId] || { quality: 7, terms: 30, leadTime: 5, service: 7, capacity: 6, innovation: 6 };
    
    // 1. Component Costs
    setComponentPrices({
      techbook: existingOverrides.componentCosts?.techbook?.[supplierId] ?? COMPONENT_COSTS.techbook[supplierId] ?? 400,
      zroid: existingOverrides.componentCosts?.zroid?.[supplierId] ?? COMPONENT_COSTS.zroid[supplierId] ?? 350,
      itab: existingOverrides.componentCosts?.itab?.[supplierId] ?? COMPONENT_COSTS.itab[supplierId] ?? 300
    });

    // 2. Finished Goods Costs
    setFinishedGoodsPrices({
      techbook: existingOverrides.finishedGoodsCosts?.techbook?.[supplierId] ?? FINISHED_GOODS_COSTS.techbook[supplierId] ?? 1400,
      zroid: existingOverrides.finishedGoodsCosts?.zroid?.[supplierId] ?? FINISHED_GOODS_COSTS.zroid[supplierId] ?? 1200,
      itab: existingOverrides.finishedGoodsCosts?.itab?.[supplierId] ?? FINISHED_GOODS_COSTS.itab[supplierId] ?? 1000
    });

    // 3. Terms, Performance Indicators & Discounts
    setPaymentTerms(existingOverrides.paymentTerms?.[supplierId] ?? defaultMetrics.terms ?? 45);
    setAgreedDiscount(existingOverrides.discounts?.[supplierId] ?? (existingOverrides.status?.[supplierId] === 'AGREED' ? 0.05 : 0));
    setQuality(existingOverrides.quality?.[supplierId] ?? defaultMetrics.quality ?? 7);
    setLeadTime(existingOverrides.leadTime?.[supplierId] ?? defaultMetrics.leadTime ?? 5);
    setService(existingOverrides.service?.[supplierId] ?? defaultMetrics.service ?? 7);
    setCapacity(existingOverrides.capacity?.[supplierId] ?? defaultMetrics.capacity ?? 6);
    setInnovation(existingOverrides.innovation?.[supplierId] ?? defaultMetrics.innovation ?? 6);
    setDeliveryReliability(existingOverrides.deliveryReliability?.[supplierId] ?? 0.95);
    setStatus(existingOverrides.status?.[supplierId] ?? 'AGREED');
  }, [selectedTeamId, supplierId]);

  const handleSaveOverrides = async () => {
    if (!selectedTeamId || !supplierId) return;

    try {
      setIsSaving(true);
      
      const newOverrides: TeamSupplierOverride = {
        ...existingOverrides,
        componentCosts: {
          ...(existingOverrides.componentCosts || {}),
          techbook: { ...(existingOverrides.componentCosts?.techbook || {}), [supplierId]: componentPrices.techbook },
          zroid: { ...(existingOverrides.componentCosts?.zroid || {}), [supplierId]: componentPrices.zroid },
          itab: { ...(existingOverrides.componentCosts?.itab || {}), [supplierId]: componentPrices.itab }
        },
        finishedGoodsCosts: {
          ...(existingOverrides.finishedGoodsCosts || {}),
          techbook: { ...(existingOverrides.finishedGoodsCosts?.techbook || {}), [supplierId]: finishedGoodsPrices.techbook },
          zroid: { ...(existingOverrides.finishedGoodsCosts?.zroid || {}), [supplierId]: finishedGoodsPrices.zroid },
          itab: { ...(existingOverrides.finishedGoodsCosts?.itab || {}), [supplierId]: finishedGoodsPrices.itab }
        },
        paymentTerms: {
          ...(existingOverrides.paymentTerms || {}),
          [supplierId]: paymentTerms
        },
        discounts: {
          ...(existingOverrides.discounts || {}),
          [supplierId]: status === 'AGREED' ? agreedDiscount : 0
        },
        quality: {
          ...(existingOverrides.quality || {}),
          [supplierId]: quality
        },
        leadTime: {
          ...(existingOverrides.leadTime || {}),
          [supplierId]: leadTime
        },
        service: {
          ...(existingOverrides.service || {}),
          [supplierId]: service
        },
        capacity: {
          ...(existingOverrides.capacity || {}),
          [supplierId]: capacity
        },
        innovation: {
          ...(existingOverrides.innovation || {}),
          [supplierId]: innovation
        },
        deliveryReliability: {
          ...(existingOverrides.deliveryReliability || {}),
          [supplierId]: deliveryReliability
        },
        status: {
          ...(existingOverrides.status || {}),
          [supplierId]: status
        }
      };

      await updateTeamSupplierOverridesByFacilitator(classId, selectedTeamId, newOverrides);
      setSaveSuccess(true);
      setConfirmDetails({
        targetName: selectedTeam?.name || 'Selected Team',
        supplierId,
        isAllTeams: false,
      });
      setShowConfirmModal(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save facilitator supplier overrides", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyToAllTeams = async () => {
    if (!supplierId || teams.length === 0) return;
    if (!window.confirm(`Apply these custom ${supplierId} terms & prices to ALL teams in this class?`)) return;

    try {
      setIsSaving(true);
      for (const t of teams) {
        const teamExist = t.draftDecisions?.supplierOverrides || {};
        const teamNewOverrides: TeamSupplierOverride = {
          ...teamExist,
          componentCosts: {
            ...(teamExist.componentCosts || {}),
            techbook: { ...(teamExist.componentCosts?.techbook || {}), [supplierId]: componentPrices.techbook },
            zroid: { ...(teamExist.componentCosts?.zroid || {}), [supplierId]: componentPrices.zroid },
            itab: { ...(teamExist.componentCosts?.itab || {}), [supplierId]: componentPrices.itab }
          },
          finishedGoodsCosts: {
            ...(teamExist.finishedGoodsCosts || {}),
            techbook: { ...(teamExist.finishedGoodsCosts?.techbook || {}), [supplierId]: finishedGoodsPrices.techbook },
            zroid: { ...(teamExist.finishedGoodsCosts?.zroid || {}), [supplierId]: finishedGoodsPrices.zroid },
            itab: { ...(teamExist.finishedGoodsCosts?.itab || {}), [supplierId]: finishedGoodsPrices.itab }
          },
          paymentTerms: {
            ...(teamExist.paymentTerms || {}),
            [supplierId]: paymentTerms
          },
          discounts: {
            ...(teamExist.discounts || {}),
            [supplierId]: status === 'AGREED' ? agreedDiscount : 0
          },
          quality: {
            ...(teamExist.quality || {}),
            [supplierId]: quality
          },
          leadTime: {
            ...(teamExist.leadTime || {}),
            [supplierId]: leadTime
          },
          service: {
            ...(teamExist.service || {}),
            [supplierId]: service
          },
          capacity: {
            ...(teamExist.capacity || {}),
            [supplierId]: capacity
          },
          innovation: {
            ...(teamExist.innovation || {}),
            [supplierId]: innovation
          },
          deliveryReliability: {
            ...(teamExist.deliveryReliability || {}),
            [supplierId]: deliveryReliability
          },
          status: {
            ...(teamExist.status || {}),
            [supplierId]: status
          }
        };

        await updateTeamSupplierOverridesByFacilitator(classId, t.id, teamNewOverrides);
      }
      setSaveSuccess(true);
      setConfirmDetails({
        targetName: 'All Teams in Class',
        supplierId,
        isAllTeams: true,
      });
      setShowConfirmModal(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to apply supplier overrides to all teams", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-xl">
            <Handshake size={32} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Supplier Variables & Negotiation Manager</h2>
            <p className="text-sm text-indigo-200/80 mt-1">
              Directly customize component costs, finished goods prices, credit terms, and performance indicators for individual teams.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-4 py-2 rounded-xl text-sm font-semibold animate-in fade-in duration-200">
            <CheckCircle2 size={18} />
            Supplier Variables Updated!
          </div>
        )}
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setManagerTab('edit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            managerTab === 'edit'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Sliders size={16} />
          <span>Manage & Edit Supplier Variables</span>
        </button>
        <button
          onClick={() => setManagerTab('report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            managerTab === 'report'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <FileText size={16} />
          <span>Supplier Deals & Negotiations Report</span>
        </button>
      </div>

      {managerTab === 'report' ? (
        <SupplierDealsReport classId={classId} />
      ) : (
        /* Main Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Team & Supplier Selection */}
          <div className="space-y-6">
            
            {/* Team Select */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                Select Team
              </label>
              <div className="space-y-2">
                {teams.map(t => {
                  const overrides = t.draftDecisions?.supplierOverrides;
                  const isSelected = t.id === selectedTeamId;
                  const hasOverrides = overrides && Object.keys(overrides).length > 0;

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 font-bold text-indigo-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Building size={16} />
                        </div>
                        <div>
                          <span className="block text-sm font-bold">{t.name}</span>
                          <span className="text-xs text-slate-400">CEO: {t.ceoName || 'Unassigned'}</span>
                        </div>
                      </div>
                      {hasOverrides ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Custom Terms
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Standard</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Supplier Selection */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                Select Supplier
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPLIERS.map(s => {
                  const isCurrent = supplierId === s;

                  return (
                    <button
                      key={s}
                      onClick={() => setSupplierId(s)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-sm">{s}</div>
                      <div className={`text-xs mt-1 ${isCurrent ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {s === 'Alpha' ? 'High End' : s === 'Neepo' ? 'Volume' : s === 'SinoTech' ? 'Cost Leader' : 'Balanced'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (Span 2): Full Variable Overrides Editor */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Editing <span className="text-indigo-600">{supplierId}</span> Supplier Variables for <span className="text-slate-700">{selectedTeam?.name || 'Selected Team'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Whatever adjustments you save here will be the exact prices and terms seen by Team {selectedTeam?.name}.</p>
                </div>

                <button
                  onClick={handleApplyToAllTeams}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Apply these exact custom prices and terms to all teams"
                >
                  <Copy size={14} />
                  Apply to All Teams
                </button>
              </div>

              {/* 1. Component Purchase Prices */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Layers size={15} className="text-indigo-600" />
                  Component Purchase Prices (Per Unit)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRODUCTS.map(p => (
                    <div key={`comp-${p.id}`} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="block text-xs font-bold text-slate-700">{p.name} Component</span>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R</span>
                        <input
                          type="number"
                          value={componentPrices[p.id]}
                          onChange={(e) => setComponentPrices({ ...componentPrices, [p.id]: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Finished Goods Purchase Prices */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Box size={15} className="text-indigo-600" />
                  Finished Goods Purchase Prices (Per Unit)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRODUCTS.map(p => (
                    <div key={`fg-${p.id}`} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="block text-xs font-bold text-slate-700">{p.name} Finished Good</span>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R</span>
                        <input
                          type="number"
                          value={finishedGoodsPrices[p.id]}
                          onChange={(e) => setFinishedGoodsPrices({ ...finishedGoodsPrices, [p.id]: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Performance Indicators & Terms */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Award size={15} className="text-indigo-600" />
                  Performance Indicators & Credit Terms
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Payment Terms */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-600" />
                      Payment Credit Terms (Days)
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[15, 30, 45, 60, 90].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setPaymentTerms(days)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            paymentTerms === days
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overall Discount % */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Percent size={14} className="text-indigo-600" />
                        Overall Discount (%)
                      </label>
                      <span className="text-xs font-extrabold text-emerald-600">{formatPercent(agreedDiscount, 1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.30"
                      step="0.01"
                      value={agreedDiscount}
                      onChange={(e) => setAgreedDiscount(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Quality Rating */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Award size={14} className="text-indigo-600" />
                        Quality Rating (1–10)
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600">{quality} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Lead Time */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Clock size={14} className="text-indigo-600" />
                        Lead Time Rating (1–10)
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600">{leadTime} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={leadTime}
                      onChange={(e) => setLeadTime(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* After Sales Service */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Headphones size={14} className="text-indigo-600" />
                        After Sales Service (1–10)
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600">{service} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={service}
                      onChange={(e) => setService(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Capacity Rating */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Database size={14} className="text-indigo-600" />
                        Capacity Rating (1–10)
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600">{capacity} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={capacity}
                      onChange={(e) => setCapacity(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Product Innovation */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" />
                        Product Innovation (1–10)
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600">{innovation} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={innovation}
                      onChange={(e) => setInnovation(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Delivery Reliability */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Truck size={14} className="text-indigo-600" />
                        Delivery Reliability (%)
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600">{formatPercent(deliveryReliability, 0)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="1.00"
                      step="0.05"
                      value={deliveryReliability}
                      onChange={(e) => setDeliveryReliability(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                </div>
              </div>

              {/* 4. Negotiation Agreement Status */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                  Agreement Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['AGREED', 'IN_PROGRESS', 'FAILED', 'NOT_STARTED'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                        status === st
                          ? st === 'AGREED' ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'IN_PROGRESS' ? 'bg-amber-500 text-white border-amber-500'
                            : st === 'FAILED' ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveOverrides}
                  disabled={isSaving}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {isSaving ? 'Saving Overrides...' : 'Save Supplier Variables'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Supplier Variables Saved!</h3>
              <p className="text-xs text-slate-500">
                Custom supplier settings for <span className="font-bold text-indigo-600">{confirmDetails.supplierId}</span> have been saved for <span className="font-bold text-slate-800">{confirmDetails.targetName}</span>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex justify-between">
                <span>Updated Variables</span>
                <span className="text-emerald-600 font-extrabold">{confirmDetails.supplierId}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div><span className="font-medium text-slate-400">Quality:</span> <strong className="text-slate-800">{quality} / 10</strong></div>
                <div><span className="font-medium text-slate-400">Lead Time:</span> <strong className="text-slate-800">{leadTime} / 10</strong></div>
                <div><span className="font-medium text-slate-400">Service:</span> <strong className="text-slate-800">{service} / 10</strong></div>
                <div><span className="font-medium text-slate-400">Capacity:</span> <strong className="text-slate-800">{capacity} / 10</strong></div>
                <div><span className="font-medium text-slate-400">Innovation:</span> <strong className="text-slate-800">{innovation} / 10</strong></div>
                <div><span className="font-medium text-slate-400">Terms:</span> <strong className="text-slate-800">{paymentTerms} Days</strong></div>
                <div><span className="font-medium text-slate-400">Discount:</span> <strong className="text-emerald-700">{formatPercent(agreedDiscount, 1)}</strong></div>
                <div><span className="font-medium text-slate-400">Reliability:</span> <strong className="text-slate-800">{formatPercent(deliveryReliability, 0)}</strong></div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center italic">
              These variables update team decisions immediately on their dashboard and decision screens.
            </p>

            <button
              onClick={() => setShowConfirmModal(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Confirm & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
