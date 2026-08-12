import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { 
  computeClassMarks, 
  MARK_KPIS, 
  BASE_CRITERIA, 
  DEFAULT_MARKS_CONFIG, 
  MarkKpiKey, 
  TeamMarksResult,
  runGoldenFixtureTests
} from '../../utils/marksEngine';
import { generateTeamMarksPdf, exportAllTeamPdfs, exportMarksXlsx, getTeamPdfFilename } from '../../utils/marksPdf';
import { MarksConfig, MissedSalesBasis } from '../../types';
import { formatNumber, formatCurrency, formatPercent } from '../../utils/numberFormat';
import { 
  Award, 
  School, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  Check, 
  X, 
  AlertTriangle, 
  Undo2, 
  Info, 
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function GroupMarks() {
  const { currentClassId, classes, selectClass, updateClassMarksConfig } = useSimulation();
  const currentClass = classes.find(c => c.id === currentClassId);

  // Settings Panel Collapse State
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [expandedQualityTeamId, setExpandedQualityTeamId] = useState<string | null>(null);

  // Batch Export Progress State
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Local Config state for live editing and debouncing
  const [localConfig, setLocalConfig] = useState<MarksConfig>(DEFAULT_MARKS_CONFIG);
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, string>>({});

  const lastLoadedClassIdRef = useRef<string | null>(null);

  // Sync localConfig with currentClass.marksConfig on class change
  useEffect(() => {
    if (currentClass?.id) {
      if (currentClass.id !== lastLoadedClassIdRef.current) {
        lastLoadedClassIdRef.current = currentClass.id;
        const merged = { ...DEFAULT_MARKS_CONFIG, ...(currentClass.marksConfig ?? {}) };
        setLocalConfig(merged);
      }
    } else {
      lastLoadedClassIdRef.current = null;
      setLocalConfig(DEFAULT_MARKS_CONFIG);
    }
  }, [currentClass?.id, currentClass?.marksConfig]);

  // Debounced persistence for numerical adjustments and inputs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerConfigSave = (updatedConfig: MarksConfig) => {
    if (!currentClassId) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void updateClassMarksConfig(currentClassId, updatedConfig);
    }, 600);
  };

  const handleConfigChange = <K extends keyof MarksConfig>(key: K, value: MarksConfig[K]) => {
    const updated = { ...localConfig, [key]: value };
    setLocalConfig(updated);
    triggerConfigSave(updated);
  };

  const handleAdjustmentChange = (teamId: string, rawVal: string) => {
    const nextAdjustments = { ...localAdjustments, [teamId]: rawVal };
    setLocalAdjustments(nextAdjustments);

    const parsedNum = rawVal === '' || rawVal === '-' ? 0 : Number(rawVal);
    const validNum = isNaN(parsedNum) ? 0 : parsedNum;

    const nextConfigAdjustments = { ...localConfig.classAdjustments, [teamId]: validNum };
    const updated = { ...localConfig, classAdjustments: nextConfigAdjustments };
    setLocalConfig(updated);
    triggerConfigSave(updated);
  };

  const handleResetDefaults = () => {
    setLocalConfig(DEFAULT_MARKS_CONFIG);
    setLocalAdjustments({});
    if (currentClassId) {
      void updateClassMarksConfig(currentClassId, DEFAULT_MARKS_CONFIG);
    }
  };

  // Run calculation engine
  const marksResult = useMemo(() => {
    if (!currentClass) return null;
    return computeClassMarks(currentClass.teams, localConfig);
  }, [currentClass, localConfig]);

  // Golden Fixture assertion check on mount in dev
  useEffect(() => {
    const res = runGoldenFixtureTests();
    if (!res.success) {
      console.warn("Golden fixture tests reported warnings:", res.errors);
    }
  }, []);

  // PDF Single Export Handler
  const handleExportSinglePdf = (teamRes: TeamMarksResult) => {
    if (!currentClass || !marksResult) return;
    const doc = generateTeamMarksPdf(currentClass, marksResult, teamRes, localConfig);
    const filename = getTeamPdfFilename(currentClass, teamRes);
    doc.save(filename);
  };

  // PDF Batch Export Handler
  const handleExportAllPdfs = async () => {
    if (!currentClass || !marksResult || isExportingAll) return;
    setIsExportingAll(true);
    try {
      await exportAllTeamPdfs(currentClass, marksResult, localConfig, (current, total) => {
        setExportProgress({ current, total });
      });
    } catch (err) {
      console.error("Failed batch PDF export:", err);
    } finally {
      setIsExportingAll(false);
      setExportProgress(null);
    }
  };

  // XLSX Export Handler
  const handleExportXlsx = () => {
    if (!currentClass || !marksResult) return;
    exportMarksXlsx(currentClass, marksResult, localConfig);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Empty State if no class is selected
  if (!currentClass) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Select a Class for Group Marks</h1>
          <p className="text-slate-500 mt-2">Choose a simulation class below to evaluate and calculate group marks for all active teams.</p>
        </div>
        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <button 
                key={cls.id}
                onClick={() => selectClass(cls.id)}
                className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left relative overflow-hidden shadow-sm w-full"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="font-semibold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                    {cls.name}
                  </span>
                  <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-mono">
                    P{cls.currentPeriod}
                  </span>
                </div>
                <div className="text-sm text-slate-500 space-y-1">
                  <div>Teams: {cls.teams?.length || 0}</div>
                  <div>Code: <span className="font-mono">{cls.facilitatorCode}</span></div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto">
            <p className="text-slate-600 mb-4">No active classes found.</p>
          </div>
        )}
      </div>
    );
  }

  const { teams: scoredTeamResults, scoringPeriod, divisor, maxBase, maxAdditional, maxAttainable, warnings, isTeamCountOverridden, autoTeamCount } = marksResult!;

  const formatKpiValue = (key: MarkKpiKey, val: number) => {
    switch (key) {
      case 'grossProfitPct':
      case 'netProfitPct':
      case 'roe':
      case 'csat':
      case 'esat':
        return formatPercent(val, 1);
      case 'accRevenue':
      case 'accInnovation':
        return formatCurrency(val, 0);
      case 'capacity':
        return formatNumber(val, 0);
      case 'quality':
        return val.toFixed(1);
      default:
        return formatNumber(val, 0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{currentClass.name}</h1>
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-mono border border-slate-200">
              Code: {currentClass.facilitatorCode}
            </span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Scoring as at Period {scoringPeriod ?? currentClass.currentPeriod}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Group Marks & Ranking Matrix (Facilitator Portal)
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAllPdfs}
            disabled={isExportingAll || scoredTeamResults.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {isExportingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{exportProgress ? `Generating ${exportProgress.current}/${exportProgress.total}…` : 'Generating PDFs…'}</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Export All PDFs</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportXlsx}
            disabled={scoredTeamResults.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export XLSX</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Warnings Banners */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div key={idx} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Marks Settings Panel (Collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-base">
            <Settings2 className="w-5 h-5 text-blue-600" />
            <span>Marks Settings</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <span>Click to toggle options</span>
            {isSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isSettingsOpen && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Base Mark Pass */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Mark — Hurdle Met
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={localConfig.baseMarkPass}
                  onChange={(e) => handleConfigChange('baseMarkPass', Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Awarded per criterion when hurdle is met (Excel: 10).</p>
              </div>

              {/* Base Mark Fail */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Mark — Hurdle Missed
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={localConfig.baseMarkFail}
                  onChange={(e) => handleConfigChange('baseMarkFail', Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Awarded per criterion when hurdle is missed (Excel: 7).</p>
              </div>

              {/* CSAT Hurdle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Satisfaction Hurdle (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Number((localConfig.csatHurdle * 100).toFixed(1))}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    if (!isNaN(raw)) handleConfigChange('csatHurdle', Math.min(1, Math.max(0, raw / 100)));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Teams at or above this score earn full base mark.</p>
              </div>

              {/* ESAT Hurdle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Employee Satisfaction Hurdle (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Number((localConfig.esatHurdle * 100).toFixed(1))}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    if (!isNaN(raw)) handleConfigChange('esatHurdle', Math.min(1, Math.max(0, raw / 100)));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Teams at or above this score earn full base mark.</p>
              </div>

              {/* Active Team Count Override */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Active Team Count
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.activeTeamCountOverride === null}
                      onChange={(e) => handleConfigChange('activeTeamCountOverride', e.target.checked ? null : autoTeamCount)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Auto ({autoTeamCount})</span>
                  </label>
                </div>
                <input
                  type="number"
                  min={1}
                  max={20}
                  disabled={localConfig.activeTeamCountOverride === null}
                  value={localConfig.activeTeamCountOverride ?? autoTeamCount}
                  onChange={(e) => handleConfigChange('activeTeamCountOverride', Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">Excel O31. Sets rank divisor: (n × 9) + 9.</p>
              </div>

              {/* Additional Marks Scale */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Additional Marks Scale (Advanced)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={localConfig.additionalMarksScale}
                  onChange={(e) => handleConfigChange('additionalMarksScale', Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Excel: the 50 in ROUNDDOWN(50 × rank ÷ divisor).</p>
              </div>

              {/* Missed Sales Basis */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Missed Sales Basis
                </label>
                <select
                  value={localConfig.missedSalesBasis}
                  onChange={(e) => handleConfigChange('missedSalesBasis', e.target.value as MissedSalesBasis)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="latest">Latest Period (Point-in-Time, Excel default)</option>
                  <option value="cumulative">Cumulative across all completed periods</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Scoring basis for shortfall pass/fail hurdle.</p>
              </div>

              {/* Class Adjustment (All Teams) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Class Adjustment (All Teams)
                </label>
                <input
                  type="number"
                  value={localConfig.classAdjustment ?? 0}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw === '' || raw === '-' ? 0 : Number(raw);
                    if (!isNaN(parsed)) handleConfigChange('classAdjustment', parsed);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">Class-wide mark added to all teams (Excel row 43).</p>
              </div>

            </div>

            {/* Live Readout Strip & Reset Button */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
                  Rank divisor: <strong className="text-slate-900">{divisor}</strong> = ({marksResult?.activeTeamCount} × 9) + 9
                </span>
                {isTeamCountOverridden && (
                  <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200">
                    Overridden — auto would be {autoTeamCount}
                  </span>
                )}
                <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  Max base mark: <strong className="text-slate-900">{maxBase}</strong>
                </span>
                <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  Max additional: <strong className="text-slate-900">{maxAdditional}</strong>
                </span>
                <span className="bg-blue-50 text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold">
                  Max before adjustment: {maxAttainable}
                </span>
              </div>

              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 self-start sm:self-auto"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Reset to Excel defaults</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Group Marks Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-900 z-10 w-64 border-r border-slate-800">
                  Criteria / Section
                </th>
                {scoredTeamResults.map((tRes) => (
                  <th key={tRes.teamId} className="py-3.5 px-4 text-right min-w-[140px] border-r border-slate-800">
                    <div>Group {tRes.groupNumber}</div>
                    <div className="font-normal text-slate-300 text-xs capitalize truncate max-w-[150px] inline-block">
                      {tRes.teamName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-800">
              
              {/* SECTION 1: Performance KPIs */}
              <tr className="bg-slate-100/90 font-bold text-xs text-slate-700 uppercase tracking-wider">
                <td className="py-2.5 px-4 sticky left-0 bg-slate-100 border-r border-slate-200" colSpan={1}>
                  1. Performance KPIs
                </td>
                <td colSpan={scoredTeamResults.length} className="py-2.5 px-4 text-xs text-slate-500 font-normal">
                  Values &amp; Rank Scores (ranks shown as &quot;rx&quot; next to values: r1 = lowest, r{marksResult?.activeTeamCount} = highest)
                </td>
              </tr>

              {MARK_KPIS.map((kpi) => (
                <tr key={kpi.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-slate-200 font-medium text-slate-700 flex items-center justify-between">
                    <span>{kpi.label}</span>
                    {kpi.key === 'quality' && (
                      <button
                        onClick={() => setExpandedQualityTeamId(expandedQualityTeamId ? null : 'all')}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 ml-2"
                        title="Toggle quality weighting drawer"
                      >
                        <span>Breakdown</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedQualityTeamId ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                  </td>
                  {scoredTeamResults.map((tRes) => {
                    if (!tRes.hasResults) {
                      return <td key={tRes.teamId} className="py-2.5 px-4 text-right text-slate-400 border-r border-slate-200 italic">No results</td>;
                    }
                    const val = tRes.values[kpi.key];
                    const rank = tRes.ranks[kpi.key];
                    const flag = tRes.flags[kpi.key];
                    return (
                      <td key={tRes.teamId} className="py-2.5 px-4 text-right border-r border-slate-200 font-mono text-xs">
                        <div className="flex items-center justify-end gap-2">
                          {flag && (
                            <span title={flag} className="text-amber-500 cursor-help">
                              <AlertTriangle className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                          <span>{formatKpiValue(kpi.key, val)}</span>
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold">
                            r{rank}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Point-in-time Base helper rows (Bank Balance & Missed Sales) */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-slate-200 font-medium text-slate-700">
                  Bank Balance
                </td>
                {scoredTeamResults.map((tRes) => (
                  <td key={tRes.teamId} className="py-2.5 px-4 text-right border-r border-slate-200 font-mono text-xs">
                    {tRes.hasResults ? formatCurrency(tRes.bankBalance, 0) : <span className="text-slate-400 italic">No results</span>}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-slate-200 font-medium text-slate-700">
                  Missed Sales (Units)
                </td>
                {scoredTeamResults.map((tRes) => (
                  <td key={tRes.teamId} className="py-2.5 px-4 text-right border-r border-slate-200 font-mono text-xs">
                    {tRes.hasResults ? formatNumber(tRes.missedSales, 0) : <span className="text-slate-400 italic">No results</span>}
                  </td>
                ))}
              </tr>

              {/* Quality Breakdown Drawer (Expandable) */}
              {expandedQualityTeamId && (
                <tr className="bg-slate-50 border-y border-slate-200">
                  <td colSpan={1 + scoredTeamResults.length} className="p-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span>Supplier Evaluation Quality Breakdown (All Teams)</span>
                        </h4>
                        <button 
                          onClick={() => setExpandedQualityTeamId(null)}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Close breakdown
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {scoredTeamResults.map(tRes => {
                          const qb = tRes.qualityBreakdown;
                          return (
                            <div key={tRes.teamId} className="border border-slate-200 rounded-md p-3 bg-slate-50 text-xs space-y-2">
                              <div className="font-semibold text-slate-900 border-b border-slate-200 pb-1 flex justify-between">
                                <span>{tRes.teamName}</span>
                                <span className="text-blue-600 font-mono">Score: {qb.quality.toFixed(2)}</span>
                              </div>
                              {qb.flagged ? (
                                <p className="text-amber-700 italic">No procurement allocation recorded — quality defaults to 0.</p>
                              ) : (
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="text-[10px] text-slate-500 border-b border-slate-200">
                                      <th className="py-1">Supplier</th>
                                      <th className="py-1 text-right">Weight</th>
                                      <th className="py-1 text-right">Share</th>
                                      <th className="py-1 text-right">Qual</th>
                                      <th className="py-1 text-right">Contrib</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {['Alpha', 'Neepo', 'Zen', 'Cheng'].map(s => {
                                      const sp = qb.perSupplier[s];
                                      if (!sp) return null;
                                      return (
                                        <tr key={s} className="border-b border-slate-100 text-[11px]">
                                          <td className="py-1 font-medium">{s}</td>
                                          <td className="py-1 text-right font-mono">{formatNumber(sp.weight, 0)}</td>
                                          <td className="py-1 text-right font-mono">{formatPercent(sp.weightShare, 1)}</td>
                                          <td className="py-1 text-right font-mono">{sp.quality.toFixed(1)}</td>
                                          <td className="py-1 text-right font-mono font-semibold">{sp.contribution.toFixed(2)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {/* SECTION 2: Base Marks */}
              <tr className="bg-slate-100/90 font-bold text-xs text-slate-700 uppercase tracking-wider border-t border-slate-300">
                <td className="py-2.5 px-4 sticky left-0 bg-slate-100 border-r border-slate-200" colSpan={1}>
                  2. Base Marks ({localConfig.baseMarkPass} if Ok, {localConfig.baseMarkFail} if not)
                </td>
                <td colSpan={scoredTeamResults.length} className="py-2.5 px-4 text-xs text-slate-500 font-normal">
                  5 Pass/Fail Hurdles
                </td>
              </tr>

              {BASE_CRITERIA.map(crit => {
                let displayLabel: string = crit.label;
                if (crit.key === 'csatHurdle') displayLabel = `Customer Satisfaction >= ${(localConfig.csatHurdle * 100).toFixed(0)}%`;
                if (crit.key === 'esatHurdle') displayLabel = `Employee Satisfaction >= ${(localConfig.esatHurdle * 100).toFixed(0)}%`;

                return (
                  <tr key={crit.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-slate-200 font-medium text-slate-700">
                      {displayLabel}
                    </td>
                    {scoredTeamResults.map(tRes => {
                      if (!tRes.hasResults) {
                        return <td key={tRes.teamId} className="py-2.5 px-4 text-right text-slate-400 border-r border-slate-200 italic">-</td>;
                      }
                      const res = tRes.baseResults[crit.key];
                      return (
                        <td key={tRes.teamId} className="py-2.5 px-4 text-right border-r border-slate-200 font-mono text-xs">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            res.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {res.passed ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-amber-600" />}
                            <span>{res.mark}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Total Base Mark Row */}
              <tr className="bg-slate-100 font-bold border-y border-slate-300">
                <td className="py-2.5 px-4 sticky left-0 bg-slate-100 border-r border-slate-300 text-slate-900">
                  Total Base Mark (Max {maxBase})
                </td>
                {scoredTeamResults.map(tRes => (
                  <td key={tRes.teamId} className="py-2.5 px-4 text-right border-r border-slate-300 font-mono text-sm text-slate-900">
                    {tRes.hasResults ? tRes.totalBase : '-'}
                  </td>
                ))}
              </tr>

              {/* SECTION 3: Additional Marks based on Rank */}
              <tr className="bg-slate-100/90 font-bold text-xs text-slate-700 uppercase tracking-wider border-t border-slate-300">
                <td className="py-2.5 px-4 sticky left-0 bg-slate-100 border-r border-slate-200" colSpan={1}>
                  3. Additional Marks based on Rank
                </td>
                <td colSpan={scoredTeamResults.length} className="py-2.5 px-4 text-xs text-slate-500 font-normal">
                  ROUNDDOWN(scale × rank ÷ divisor)
                </td>
              </tr>

              {MARK_KPIS.map(kpi => (
                <tr key={kpi.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-slate-200 text-xs text-slate-600">
                    {kpi.label}
                  </td>
                  {scoredTeamResults.map(tRes => (
                    <td key={tRes.teamId} className="py-2.5 px-4 text-right border-r border-slate-200 font-mono text-xs text-slate-700">
                      {tRes.hasResults ? tRes.additionalMarks[kpi.key] : '-'}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Total Additional Marks Row */}
              <tr className="bg-slate-100 font-bold border-y border-slate-300">
                <td className="py-2.5 px-4 sticky left-0 bg-slate-100 border-r border-slate-300 text-slate-900">
                  Total Additional Marks (Max {maxAdditional})
                </td>
                {scoredTeamResults.map(tRes => (
                  <td key={tRes.teamId} className="py-2.5 px-4 text-right border-r border-slate-300 font-mono text-sm text-slate-900">
                    {tRes.hasResults ? tRes.totalAdditional : '-'}
                  </td>
                ))}
              </tr>

              {/* SECTION 4: Class Adjustments */}
              <tr className="bg-white border-b border-slate-200">
                <td className="py-3 px-4 sticky left-0 bg-white border-r border-slate-200 font-semibold text-slate-800">
                  <div>Class Adjustment (All Teams)</div>
                  <div className="text-xs font-normal text-slate-500">Class-wide mark added to all teams (accepts ±)</div>
                </td>
                {scoredTeamResults.map(tRes => (
                  <td key={tRes.teamId} className="py-3 px-4 text-right border-r border-slate-200">
                    <input
                      type="number"
                      value={localConfig.classAdjustment ?? 0}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' || raw === '-' ? 0 : Number(raw);
                        if (!isNaN(parsed)) handleConfigChange('classAdjustment', parsed);
                      }}
                      className="w-24 px-2 py-1 text-right border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                    />
                  </td>
                ))}
              </tr>

              {/* SECTION 5: TOTAL GROUP MARKS */}
              <tr className="bg-sky-50/90 font-bold border-t-2 border-slate-900">
                <td className="py-4 px-4 sticky left-0 bg-sky-50 border-r border-slate-300 text-slate-900 text-base">
                  TOTAL GROUP MARKS
                </td>
                {scoredTeamResults.map(tRes => (
                  <td key={tRes.teamId} className="py-4 px-4 text-right border-r border-slate-300">
                    <div className="text-lg font-bold text-sky-800 font-mono">
                      {tRes.total}
                    </div>
                    <div className="text-[11px] font-normal text-sky-600">
                      out of {maxAttainable}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Per-team Report Download Action Footer */}
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="py-3 px-4 sticky left-0 bg-slate-50 border-r border-slate-200 font-medium text-xs text-slate-500">
                  Individual Team Report
                </td>
                {scoredTeamResults.map(tRes => (
                  <td key={tRes.teamId} className="py-3 px-4 text-right border-r border-slate-200">
                    <button
                      onClick={() => handleExportSinglePdf(tRes)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium transition-colors shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>PDF</span>
                    </button>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology Audit Trail Panel (Collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div 
          onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-base">
            <Info className="w-5 h-5 text-slate-600" />
            <span>Marking Methodology &amp; Formula Audit Trail</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <span>{isMethodologyOpen ? 'Hide details' : 'Show details'}</span>
            {isMethodologyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isMethodologyOpen && (
          <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h4 className="font-semibold text-slate-800">Formula Breakdown (Excel Provenance):</h4>
              <p><code className="font-mono bg-white px-1.5 py-0.5 rounded border">TOTAL GROUP MARK = Base Mark (D30) + Additional Marks (D42) + Class Adjustment (D43)</code></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">1. Ranking Method</h4>
                <p>
                  Rankings use ascending order (<code className="font-mono text-slate-800">RANK(val, range, 1)</code>).
                  The lowest value receives Rank 1, and the highest performer receives Rank <em>N</em>.
                  Tied values share the same lower rank.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-1">2. Rank Divisor &amp; Additional Marks</h4>
                <p>
                  Divisor formula: <code className="font-mono text-slate-800">(ActiveTeamCount × 9) + 9</code>.
                  Each criterion awards <code className="font-mono text-slate-800">ROUNDDOWN(Scale × Rank ÷ Divisor)</code> marks.
                  Rounding occurs per criterion before summing.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-1">3. Base Mark Pass/Fail Hurdles</h4>
                <p>
                  Evaluates Positive NP%, Positive Cash, No Missed Sales, Customer Satisfaction, and Employee Satisfaction.
                  Meeting a hurdle awards {localConfig.baseMarkPass} marks; missing awards {localConfig.baseMarkFail} marks.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-1">4. Supplier Quality Weighting Sub-Engine</h4>
                <p>
                  Quality is the procurement-spend-weighted average across all 4 suppliers (Alpha, Neepo, Zen, Cheng).
                  Negotiated supplier overrides are automatically honoured. Zen's purchase volume is fully incorporated.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              Note: Historical procurement allocations are not retained by the simulation engine; Quality is calculated using each team&apos;s current procurement allocation decisions.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
