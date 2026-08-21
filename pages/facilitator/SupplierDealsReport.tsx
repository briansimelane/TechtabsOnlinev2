import React, { useState, useMemo } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { SUPPLIERS, SUPPLIER_METRICS, COMPONENT_COSTS, FINISHED_GOODS_COSTS, PRODUCTS } from '../../constants';
import { getDecisionsForTeamPeriod } from '../../utils/marketShareBackModel';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { exportSupplierDealsPDF, exportSupplierDealsCSV, SupplierDealRecord } from '../../utils/supplierDealsExport';
import { 
  FileText, 
  FileSpreadsheet, 
  Building, 
  Handshake, 
  Calendar, 
  SlidersHorizontal,
  Users
} from 'lucide-react';

interface Props {
  classId: string;
}

const formatAllocDisplay = (compUnits: number, fgUnits: number, totalUnits: number, sharePct: number) => {
  if (!totalUnits) return <span className="text-slate-400">0 (0%)</span>;
  return (
    <div className="leading-tight">
      <div className="font-mono font-extrabold text-slate-900">{formatNumber(totalUnits, 0)} <span className="text-[10px] text-indigo-600 font-bold">({Math.round(sharePct)}%)</span></div>
      <div className="text-[9px] text-slate-500 font-medium mt-0.5">Comp: {formatNumber(compUnits, 0)} | FG: {formatNumber(fgUnits, 0)}</div>
    </div>
  );
};

export const SupplierDealsReport: React.FC<Props> = ({ classId }) => {
  const { classes } = useSimulation();

  const currentClass = classes.find(c => c.id === classId);
  const teams = useMemo(() => {
    return currentClass?.teams?.filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id)) || [];
  }, [currentClass]);

  const maxPeriod = currentClass?.currentPeriod || 1;
  const availableYears = useMemo(() => Array.from({ length: maxPeriod }, (_, i) => i + 1), [maxPeriod]);

  const [selectedYear, setSelectedYear] = useState<number>(maxPeriod);
  const [viewMode, setViewMode] = useState<'matrix' | 'byTeam' | 'bySupplier'>('matrix');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('Alpha');

  // Ensure selected team defaults to first team
  React.useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Build deal records for selectedYear
  const dealRecords = useMemo<SupplierDealRecord[]>(() => {
    if (!teams || teams.length === 0) return [];

    const records: SupplierDealRecord[] = [];

    teams.forEach(t => {
      const dec = getDecisionsForTeamPeriod(t, selectedYear);
      const ov = dec.supplierOverrides || {};

      // Compute total product units ordered by this team across all suppliers
      const teamTechBookTotal = SUPPLIERS.reduce((sum, s) => {
        const c = dec.procurement?.supplierAllocation?.techbook?.[s as any]?.components || 0;
        const fg = dec.procurement?.supplierAllocation?.techbook?.[s as any]?.finishedGoods || 0;
        return sum + c + fg;
      }, 0);

      const teamZroidTotal = SUPPLIERS.reduce((sum, s) => {
        const c = dec.procurement?.supplierAllocation?.zroid?.[s as any]?.components || 0;
        const fg = dec.procurement?.supplierAllocation?.zroid?.[s as any]?.finishedGoods || 0;
        return sum + c + fg;
      }, 0);

      const teamItabTotal = SUPPLIERS.reduce((sum, s) => {
        const c = dec.procurement?.supplierAllocation?.itab?.[s as any]?.components || 0;
        const fg = dec.procurement?.supplierAllocation?.itab?.[s as any]?.finishedGoods || 0;
        return sum + c + fg;
      }, 0);

      SUPPLIERS.forEach(s => {
        const defaultMetrics = (SUPPLIER_METRICS as any)[s] || { quality: 7, terms: 30, leadTime: 5, service: 7, capacity: 6, innovation: 6 };

        const status = ov.status?.[s] || (ov.discounts?.[s] ? 'AGREED' : 'STANDARD');
        const paymentTerms = ov.paymentTerms?.[s] ?? defaultMetrics.terms ?? 45;

        const quality = ov.quality?.[s] ?? defaultMetrics.quality ?? 7;
        const leadTime = ov.leadTime?.[s] ?? defaultMetrics.leadTime ?? 5;
        const service = ov.service?.[s] ?? defaultMetrics.service ?? 7;
        const capacity = ov.capacity?.[s] ?? defaultMetrics.capacity ?? 6;
        const innovation = ov.innovation?.[s] ?? defaultMetrics.innovation ?? 6;

        const techbookComp = ov.componentCosts?.techbook?.[s] ?? COMPONENT_COSTS.techbook[s as keyof typeof COMPONENT_COSTS.techbook] ?? 400;
        const zroidComp = ov.componentCosts?.zroid?.[s] ?? COMPONENT_COSTS.zroid[s as keyof typeof COMPONENT_COSTS.zroid] ?? 350;
        const itabComp = ov.componentCosts?.itab?.[s] ?? COMPONENT_COSTS.itab[s as keyof typeof COMPONENT_COSTS.itab] ?? 300;

        const techbookFg = ov.finishedGoodsCosts?.techbook?.[s] ?? FINISHED_GOODS_COSTS.techbook[s as keyof typeof FINISHED_GOODS_COSTS.techbook] ?? 1400;
        const zroidFg = ov.finishedGoodsCosts?.zroid?.[s] ?? FINISHED_GOODS_COSTS.zroid[s as keyof typeof FINISHED_GOODS_COSTS.zroid] ?? 1200;
        const itabFg = ov.finishedGoodsCosts?.itab?.[s] ?? FINISHED_GOODS_COSTS.itab[s as keyof typeof FINISHED_GOODS_COSTS.itab] ?? 1000;

        // Procurement Units & Share Pct
        const techbookCompUnits = dec.procurement?.supplierAllocation?.techbook?.[s as any]?.components || 0;
        const techbookFgUnits = dec.procurement?.supplierAllocation?.techbook?.[s as any]?.finishedGoods || 0;
        const techbookTotalUnits = techbookCompUnits + techbookFgUnits;
        const techbookSharePct = teamTechBookTotal > 0 ? (techbookTotalUnits / teamTechBookTotal) * 100 : 0;

        const zroidCompUnits = dec.procurement?.supplierAllocation?.zroid?.[s as any]?.components || 0;
        const zroidFgUnits = dec.procurement?.supplierAllocation?.zroid?.[s as any]?.finishedGoods || 0;
        const zroidTotalUnits = zroidCompUnits + zroidFgUnits;
        const zroidSharePct = teamZroidTotal > 0 ? (zroidTotalUnits / teamZroidTotal) * 100 : 0;

        const itabCompUnits = dec.procurement?.supplierAllocation?.itab?.[s as any]?.components || 0;
        const itabFgUnits = dec.procurement?.supplierAllocation?.itab?.[s as any]?.finishedGoods || 0;
        const itabTotalUnits = itabCompUnits + itabFgUnits;
        const itabSharePct = teamItabTotal > 0 ? (itabTotalUnits / teamItabTotal) * 100 : 0;

        records.push({
          teamName: t.name,
          supplierId: s,
          year: selectedYear,
          status,
          paymentTerms,
          quality,
          leadTime,
          service,
          capacity,
          innovation,
          techbookComp,
          zroidComp,
          itabComp,
          techbookFg,
          zroidFg,
          itabFg,
          techbookCompUnits,
          techbookFgUnits,
          techbookTotalUnits,
          techbookSharePct,
          zroidCompUnits,
          zroidFgUnits,
          zroidTotalUnits,
          zroidSharePct,
          itabCompUnits,
          itabFgUnits,
          itabTotalUnits,
          itabSharePct
        });
      });
    });

    return records;
  }, [teams, selectedYear]);

  // Handle Export PDF
  const handleExportPDF = () => {
    exportSupplierDealsPDF({
      className: currentClass?.name || 'Class Simulation',
      period: selectedYear,
      deals: dealRecords
    });
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    exportSupplierDealsCSV({
      className: currentClass?.name || 'Class Simulation',
      period: selectedYear,
      deals: dealRecords
    });
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'AGREED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">AGREED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">IN PROGRESS</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">STANDARD</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <Handshake className="text-emerald-600" size={24} />
              <h3 className="text-xl font-extrabold text-slate-900">Supplier Deals & Negotiations Report</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete historical report of negotiated terms, quality scores, purchase prices, and procurement allocations (Components & Finished Goods) across teams.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-[1.02]"
            >
              <FileText size={15} />
              <span>Download PDF Report</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-[1.02]"
            >
              <FileSpreadsheet size={15} />
              <span>Download CSV Report</span>
            </button>
          </div>

        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          
          {/* Year Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={14} className="text-slate-400" />
              Year:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {availableYears.map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    selectedYear === yr
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Year {yr}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'matrix'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Overview Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('byTeam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'byTeam'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building size={14} />
              <span>By Team</span>
            </button>
            <button
              onClick={() => setViewMode('bySupplier')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'bySupplier'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users size={14} />
              <span>By Supplier</span>
            </button>
          </div>

        </div>
      </div>

      {/* --- VIEW MODE 1: OVERVIEW MATRIX --- */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Year {selectedYear} Supplier Deals Matrix</span>
              <span className="text-xs text-slate-400 font-normal">({dealRecords.length} deal records)</span>
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                  <th className="py-3 px-4 text-left font-bold">Team</th>
                  <th className="py-3 px-3 text-left font-bold">Supplier</th>
                  <th className="py-3 px-3 text-center font-bold">Status</th>
                  <th className="py-3 px-3 text-center font-bold">Terms</th>
                  <th className="py-3 px-3 text-center font-bold">Quality</th>
                  <th className="py-3 px-3 text-center font-bold">Lead Time</th>
                  <th className="py-3 px-3 text-center font-bold">Service</th>
                  <th className="py-3 px-3 text-center font-bold">Capacity</th>
                  <th className="py-3 px-3 text-center font-bold">Innovation</th>
                  <th className="py-3 px-3 text-center font-bold">TB Comp</th>
                  <th className="py-3 px-3 text-center font-bold">ZR Comp</th>
                  <th className="py-3 px-3 text-center font-bold">iT Comp</th>
                  <th className="py-3 px-3 text-center font-bold">TB FG</th>
                  <th className="py-3 px-3 text-center font-bold">ZR FG</th>
                  <th className="py-3 px-3 text-center font-bold">iT FG</th>
                  <th className="py-3 px-3 text-center font-bold">TB Orders (C + FG)</th>
                  <th className="py-3 px-3 text-center font-bold">ZR Orders (C + FG)</th>
                  <th className="py-3 px-3 text-center font-bold">iT Orders (C + FG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dealRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.teamName}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-700">{r.supplierId}</td>
                    <td className="py-2.5 px-3 text-center">{getStatusBadge(r.status)}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.paymentTerms}d</td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.quality}/10</td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.leadTime}/10</td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.service}/10</td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.capacity}/10</td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.innovation}/10</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.techbookComp, 0)}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.zroidComp, 0)}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.itabComp, 0)}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.techbookFg, 0)}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.zroidFg, 0)}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.itabFg, 0)}</td>
                    <td className="py-2.5 px-3 text-center">{formatAllocDisplay(r.techbookCompUnits, r.techbookFgUnits, r.techbookTotalUnits, r.techbookSharePct)}</td>
                    <td className="py-2.5 px-3 text-center">{formatAllocDisplay(r.zroidCompUnits, r.zroidFgUnits, r.zroidTotalUnits, r.zroidSharePct)}</td>
                    <td className="py-2.5 px-3 text-center">{formatAllocDisplay(r.itabCompUnits, r.itabFgUnits, r.itabTotalUnits, r.itabSharePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- VIEW MODE 2: BY TEAM --- */}
      {viewMode === 'byTeam' && (
        <div className="space-y-6">
          {/* Team Selector Buttons */}
          <div className="flex flex-wrap gap-2">
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedTeamId === t.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Building size={14} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>

          {/* Supplier Cards Grid for Selected Team */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SUPPLIERS.map(s => {
              const record = dealRecords.find(r => r.teamName === teams.find(t => t.id === selectedTeamId)?.name && r.supplierId === s);

              if (!record) return null;

              return (
                <div key={s} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-extrabold text-slate-900">{s}</h4>
                        <span className="text-xs text-slate-400">Year {selectedYear} Negotiated Terms</span>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>

                    {/* All KPIs & Performance Indicators */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1 text-[11px] uppercase tracking-wider">
                        Performance Indicators (KPIs)
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Credit Terms:</span>
                        <span className="font-mono font-bold text-slate-800">{record.paymentTerms} Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Quality Rating:</span>
                        <span className="font-mono font-bold text-indigo-600">{record.quality} / 10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lead Time:</span>
                        <span className="font-mono font-bold text-slate-700">{record.leadTime} / 10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Service:</span>
                        <span className="font-mono font-bold text-slate-700">{record.service} / 10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Capacity:</span>
                        <span className="font-mono font-bold text-slate-700">{record.capacity} / 10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Innovation:</span>
                        <span className="font-mono font-bold text-slate-700">{record.innovation} / 10</span>
                      </div>
                    </div>

                    {/* Component Purchase Prices */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Component Prices (R)</span>
                      <div className="grid grid-cols-3 gap-1 text-center text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="block text-[10px] text-slate-500">TechBook</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(record.techbookComp, 0)}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="block text-[10px] text-slate-500">Zroid</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(record.zroidComp, 0)}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="block text-[10px] text-slate-500">iTab</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(record.itabComp, 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Finished Goods Purchase Prices */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Finished Goods Prices (R)</span>
                      <div className="grid grid-cols-3 gap-1 text-center text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="block text-[10px] text-slate-500">TechBook</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(record.techbookFg, 0)}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="block text-[10px] text-slate-500">Zroid</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(record.zroidFg, 0)}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="block text-[10px] text-slate-500">iTab</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(record.itabFg, 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Procurement Allocations with Component vs Finished Goods Breakdown */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Procurement Orders (Comp & FG)</span>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        
                        {/* TechBook Allocation Card */}
                        <div className="p-2 bg-indigo-50/60 rounded-xl border border-indigo-100/80 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-indigo-800 font-bold">TB</span>
                              <span className="font-mono font-extrabold text-indigo-900">{Math.round(record.techbookSharePct)}%</span>
                            </div>
                            <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                              {record.techbookTotalUnits > 0 ? `${formatNumber(record.techbookTotalUnits, 0)}` : '0'}
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium pt-1 mt-1 border-t border-indigo-100/80 space-y-0.5">
                            <div className="flex justify-between"><span>C:</span> <strong>{formatNumber(record.techbookCompUnits, 0)}</strong></div>
                            <div className="flex justify-between"><span>FG:</span> <strong>{formatNumber(record.techbookFgUnits, 0)}</strong></div>
                          </div>
                        </div>

                        {/* Zroid Allocation Card */}
                        <div className="p-2 bg-indigo-50/60 rounded-xl border border-indigo-100/80 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-indigo-800 font-bold">ZR</span>
                              <span className="font-mono font-extrabold text-indigo-900">{Math.round(record.zroidSharePct)}%</span>
                            </div>
                            <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                              {record.zroidTotalUnits > 0 ? `${formatNumber(record.zroidTotalUnits, 0)}` : '0'}
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium pt-1 mt-1 border-t border-indigo-100/80 space-y-0.5">
                            <div className="flex justify-between"><span>C:</span> <strong>{formatNumber(record.zroidCompUnits, 0)}</strong></div>
                            <div className="flex justify-between"><span>FG:</span> <strong>{formatNumber(record.zroidFgUnits, 0)}</strong></div>
                          </div>
                        </div>

                        {/* iTab Allocation Card */}
                        <div className="p-2 bg-indigo-50/60 rounded-xl border border-indigo-100/80 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-indigo-800 font-bold">iT</span>
                              <span className="font-mono font-extrabold text-indigo-900">{Math.round(record.itabSharePct)}%</span>
                            </div>
                            <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                              {record.itabTotalUnits > 0 ? `${formatNumber(record.itabTotalUnits, 0)}` : '0'}
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium pt-1 mt-1 border-t border-indigo-100/80 space-y-0.5">
                            <div className="flex justify-between"><span>C:</span> <strong>{formatNumber(record.itabCompUnits, 0)}</strong></div>
                            <div className="flex justify-between"><span>FG:</span> <strong>{formatNumber(record.itabFgUnits, 0)}</strong></div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- VIEW MODE 3: BY SUPPLIER --- */}
      {viewMode === 'bySupplier' && (
        <div className="space-y-6">
          {/* Supplier Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SUPPLIERS.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSupplierId(s)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedSupplierId === s
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-sm">{s}</div>
                <div className={`text-xs mt-0.5 ${selectedSupplierId === s ? 'text-teal-100' : 'text-slate-400'}`}>
                  Year {selectedYear} Cross-Team Comparative
                </div>
              </button>
            ))}
          </div>

          {/* Supplier Cross-Team Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                {selectedSupplierId} Negotiations Across Teams (Year {selectedYear})
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                    <th className="py-3 px-4 text-left font-bold">Team Name</th>
                    <th className="py-3 px-3 text-center font-bold">Status</th>
                    <th className="py-3 px-3 text-center font-bold">Credit Terms</th>
                    <th className="py-3 px-3 text-center font-bold">Quality</th>
                    <th className="py-3 px-3 text-center font-bold">Lead Time</th>
                    <th className="py-3 px-3 text-center font-bold">Service</th>
                    <th className="py-3 px-3 text-center font-bold">Capacity</th>
                    <th className="py-3 px-3 text-center font-bold">Innovation</th>
                    <th className="py-3 px-3 text-center font-bold">TB Comp</th>
                    <th className="py-3 px-3 text-center font-bold">ZR Comp</th>
                    <th className="py-3 px-3 text-center font-bold">iT Comp</th>
                    <th className="py-3 px-3 text-center font-bold">TB FG</th>
                    <th className="py-3 px-3 text-center font-bold">ZR FG</th>
                    <th className="py-3 px-3 text-center font-bold">iT FG</th>
                    <th className="py-3 px-3 text-center font-bold">TB Orders (C + FG)</th>
                    <th className="py-3 px-3 text-center font-bold">ZR Orders (C + FG)</th>
                    <th className="py-3 px-3 text-center font-bold">iT Orders (C + FG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealRecords.filter(r => r.supplierId === selectedSupplierId).map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{r.teamName}</td>
                      <td className="py-2.5 px-3 text-center">{getStatusBadge(r.status)}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.paymentTerms} Days</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">{r.quality} / 10</td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.leadTime} / 10</td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.service} / 10</td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.capacity} / 10</td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.innovation} / 10</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.techbookComp, 0)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.zroidComp, 0)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.itabComp, 0)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.techbookFg, 0)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.zroidFg, 0)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">{formatCurrency(r.itabFg, 0)}</td>
                      <td className="py-2.5 px-3 text-center">{formatAllocDisplay(r.techbookCompUnits, r.techbookFgUnits, r.techbookTotalUnits, r.techbookSharePct)}</td>
                      <td className="py-2.5 px-3 text-center">{formatAllocDisplay(r.zroidCompUnits, r.zroidFgUnits, r.zroidTotalUnits, r.zroidSharePct)}</td>
                      <td className="py-2.5 px-3 text-center">{formatAllocDisplay(r.itabCompUnits, r.itabFgUnits, r.itabTotalUnits, r.itabSharePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
