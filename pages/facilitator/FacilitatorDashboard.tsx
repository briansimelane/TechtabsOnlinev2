import React, { useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { scoreCumulative } from '../../utils/leagueScoring';
import { 
  Play, 
  RotateCcw, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  BarChart,
  Award,
  Settings,
  Sliders,
  LayoutDashboard,
  School,
  Plus,
  Shield,
  ChevronRight,
  Trash2,
  Archive,
  RefreshCw,
  Edit2,
  Check,
  X,
  Presentation
} from 'lucide-react';
import { DebriefRemote } from '../debrief/DebriefRemote';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SimulationConfig } from './SimulationConfig';
import { ParameterTweaker } from './ParameterTweaker';
import { formatNumber, formatPercent, formatCurrency } from '../../utils/numberFormat';
import { Team, HRRole } from '../../types';
import { PRODUCTS, SUPPLIERS, SUPPLIER_METRICS, COMPONENT_COSTS, FINISHED_GOODS_COSTS, INITIAL_DECISIONS, STORE_COSTS } from '../../constants';
import { computeMarketShareBackModel } from '../../utils/marketShareBackModel';

const FacilitatorDashboard: React.FC = () => {
  const { currentClassId, classes, runClassSimulation, selectClass, reopenTeamDecisions, archiveTeam, restoreTeam, updateTeamName } = useSimulation();
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'tweaker' | 'teams' | 'marketModel'>('overview');
  const [teamFilterTab, setTeamFilterTab] = useState<'active' | 'archived'>('active');
  const [selectedMarketProduct, setSelectedMarketProduct] = useState<'techbook' | 'zroid' | 'itab'>('techbook');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // Leaderboard Sorting State (default rank on Current Score)
  const [sortField, setSortField] = useState<'name' | 'gpMargin' | 'npMargin' | 'roe' | 'prevScore' | 'score' | 'finalScore' | 'status'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Team Name Edit State
  const [editingTeamNameId, setEditingTeamNameId] = useState<string | null>(null);
  const [tempTeamName, setTempTeamName] = useState('');

  const currentClass = classes.find(c => c.id === currentClassId);

  // If no class is selected, show Class Selection screen
  if (!currentClass) {
      return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <div className="text-center mb-10">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <School className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Select a Class for Dashboard</h1>
                <p className="text-slate-500 mt-2">You need to select a simulation class to view cohort metrics and process rounds.</p>
            </div>
            {classes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(cls => (
                        <button 
                            key={cls.id}
                            onClick={() => selectClass(cls.id)}
                            className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left relative overflow-hidden shadow-sm"
                        >
                            <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 mb-1 transition-colors">{cls.name}</h3>
                            <code className="text-xs text-slate-400 mb-4 bg-slate-50 px-2 py-1 rounded">{cls.id}</code>
                            <div className="w-full mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
                                <span className="flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                                    Period {cls.currentPeriod}
                                </span>
                                <span className="flex items-center text-xs">
                                    <Users size={14} className="mr-1 text-slate-400" />
                                    {cls.teams.filter(t => !t.isArchived).length} Teams
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                    <p className="text-slate-500 mb-6 text-lg">You haven't created any classes yet.</p>
                    <a href="#/facilitator/classes" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus size={18} className="mr-2" /> Create Your First Class
                    </a>
                </div>
            )}
        </div>
      );
  }

  const realTeams = (currentClass.teams || []).filter(t => !t.isArchived);
  const period = currentClass.currentPeriod;
  const backModelResults = computeMarketShareBackModel(realTeams, period);

  const teamsPerformance = realTeams.map((t, tIdx) => {
    const dec = t.draftDecisions || INITIAL_DECISIONS;

    let totalRev = 0;
    let totalCogs = 0;

    const totalProdUnits = (dec.operations?.production?.techbook || 0) + (dec.operations?.production?.zroid || 0) + (dec.operations?.production?.itab || 0);
    const techCount = (t.staffCounts?.technicians || 150) + (dec.hr?.hiring?.technicians || 0);
    const semiCount = (t.staffCounts?.semiSkilled || 200) + (dec.hr?.hiring?.semiSkilled || 0);
    const techSalary = dec.hr?.salaries?.technicians || 38000;
    const semiSalary = dec.hr?.salaries?.semiSkilled || 30000;
    const totalProdStaffCost = (techCount * techSalary + semiCount * semiSalary) * 8;
    const laborCostPerUnit = totalProdUnits > 0 ? (totalProdStaffCost / totalProdUnits) : 350;

    const pKeys: ('techbook' | 'zroid' | 'itab')[] = ['techbook', 'zroid', 'itab'];
    pKeys.forEach(pId => {
      const res = backModelResults.find(r => r.productId === pId);
      const unitsSold = res ? (res.unitsSoldByTeam[tIdx] || 0) : 0;
      const price = dec.marketing?.prices?.[pId] ?? 0;
      const rev = unitsSold * price;

      let componentCost = pId === 'techbook' ? 1200 : (pId === 'zroid' ? 1400 : 1000);
      const alloc = dec.procurement?.supplierAllocation?.[pId];
      if (alloc) {
        let compSum = 0;
        let compCount = 0;
        Object.entries(alloc).forEach(([supId, val]: [string, any]) => {
          if (val && val.components > 0) {
            const supMetric = (SUPPLIER_METRICS as any)[supId];
            const supPrice = supMetric?.unitPrices?.[pId] ?? (pId === 'techbook' ? 1200 : (pId === 'zroid' ? 1400 : 1000));
            compSum += supPrice * val.components;
            compCount += val.components;
          }
        });
        if (compCount > 0) {
          componentCost = compSum / compCount;
        }
      }

      const unitCogs = componentCost + laborCostPerUnit;
      const cogs = unitsSold * unitCogs;

      totalRev += rev;
      totalCogs += cogs;
    });

    const grossProfit = totalRev - totalCogs;

    const adMkt = dec.marketing?.advertisingBudget ?? 12500000;
    const openCloseStores = dec.marketing?.openCloseStores ?? 0;
    const finalStoreCount = Math.max(0, (t.storeCount || 5) + openCloseStores);
    const storeRunCost = finalStoreCount * (STORE_COSTS.running || 5614005);
    const storeTransCost = openCloseStores > 0 ? openCloseStores * (STORE_COSTS.opening || 9353900) : (openCloseStores < 0 ? Math.abs(openCloseStores) * (STORE_COSTS.closing || 2438320) : 0);
    const storeCost = storeRunCost + storeTransCost;

    const agentComm = Math.round(totalRev * 0.52 * (dec.marketing?.agentCommission ?? 0));

    let opexPayroll = 0;
    let opexTraining = 0;
    const hrRoles = ['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'] as const;
    const baseStaffCounts: Record<string, number> = { engineers: 50, technicians: 150, semiSkilled: 200, adminSales: 40, customerService: 20 };
    const baseSalaries: Record<string, number> = { engineers: 55000, technicians: 38000, semiSkilled: 30000, adminSales: 20000, customerService: 9250 };
    const trainingCosts: Record<string, number> = { None: 0, Basic: 5000, Advanced: 15000, Specialized: 30000 };

    hrRoles.forEach(r => {
      const count = (t.staffCounts?.[r] ?? baseStaffCounts[r] ?? 0) + (dec.hr?.hiring?.[r] ?? 0);
      const monthlySalary = dec.hr?.salaries?.[r] ?? baseSalaries[r] ?? 0;
      const trainingLevel = dec.hr?.trainingLevels?.[r] ?? 'None';
      const trCostPer = trainingCosts[trainingLevel] || 0;

      opexTraining += count * trCostPer;
      if (r !== 'technicians' && r !== 'semiSkilled') {
        opexPayroll += count * monthlySalary * 8;
      }
    });

    const rdCost = dec.operations?.innovationBudget ?? dec.operations?.rdBudget ?? 4000000;
    const sumOtherExpenses = adMkt + storeCost + agentComm + opexPayroll + opexTraining + rdCost;
    const otherOpex = Math.round(sumOtherExpenses * 0.0797);
    const totalOpEx = sumOtherExpenses + otherOpex;

    const ebitda = grossProfit - totalOpEx;
    const depr = 1535965;
    const longTermDebt = Math.max(0, (t.longTermDebt || 50000000) + (dec.finance?.debtChange || 0));
    const finCharges = longTermDebt > 0 ? Math.round(longTermDebt * 0.08) : 0;
    const ebt = ebitda - depr - finCharges;
    const taxation = ebt > 0 ? Math.round(ebt * 0.28) : 0;
    const netProfit = ebt - taxation;

    const openEq = t.shareholdersEquity || 286564937;
    const equityChange = dec.finance?.equityChange || 0;
    const dividends = dec.finance?.dividends || 0;
    const equity = openEq + equityChange - dividends + netProfit;

    const gpMargin = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;
    const npMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;
    const roe = equity > 0 ? (netProfit / equity) * 100 : 0;

    return {
      id: t.id,
      name: t.name,
      revenue: totalRev,
      grossProfit,
      netProfit,
      equity,
      gpMargin,
      npMargin,
      roe,
      status: t.status || 'InProgress'
    };
  });

  const nTeams = teamsPerformance.length;

  // Rank by GP% (1 = lowest, nTeams = highest)
  const sortedByGP = [...teamsPerformance].map((t, idx) => ({ id: t.id, val: t.gpMargin, origIdx: idx }))
    .sort((a, b) => a.val - b.val);
  const gpRankMap: Record<string, number> = {};
  sortedByGP.forEach((item, rIdx) => {
    gpRankMap[item.id] = rIdx + 1;
  });

  // Rank by NP% (1 = lowest, nTeams = highest)
  const sortedByNP = [...teamsPerformance].map((t, idx) => ({ id: t.id, val: t.npMargin, origIdx: idx }))
    .sort((a, b) => a.val - b.val);
  const npRankMap: Record<string, number> = {};
  sortedByNP.forEach((item, rIdx) => {
    npRankMap[item.id] = rIdx + 1;
  });

  // Rank by ROE (1 = lowest, nTeams = highest)
  const sortedByROE = [...teamsPerformance].map((t, idx) => ({ id: t.id, val: t.roe, origIdx: idx }))
    .sort((a, b) => a.val - b.val);
  const roeRankMap: Record<string, number> = {};
  sortedByROE.forEach((item, rIdx) => {
    roeRankMap[item.id] = rIdx + 1;
  });

  const maxScore = nTeams > 0 ? nTeams * 3 : 3;

  // Calculate Previous Score for each team across past periods using shared leagueScoring
  const cumScores = scoreCumulative(realTeams, Math.max(0, period - 1));
  const prevScoresMap: Record<string, number> = {};
  cumScores.forEach(c => {
    prevScoresMap[c.teamId] = c.total;
  });

  const leaderboardTeams = teamsPerformance.map(t => {
    const gpPoints = gpRankMap[t.id] || 1;
    const npPoints = npRankMap[t.id] || 1;
    const roePoints = roeRankMap[t.id] || 1;
    const score = gpPoints + npPoints + roePoints;  // Current Score
    const prevScore = prevScoresMap[t.id] || 0;     // Previous Score (starts at 0 for Year 1)
    const finalScore = prevScore + score;           // Final Score (Previous + Current)

    return {
      ...t,
      gpPoints,
      npPoints,
      roePoints,
      prevScore,
      score,
      finalScore,
      maxScore
    };
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedLeaderboard = [...leaderboardTeams].sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (typeof valA === 'string') {
      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    }
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  const handleProcessRound = async () => {
      if (!currentClassId) return;
      if (confirm(`Are you sure you want to close submissions and run the simulation for Class "${currentClass.name}" (advancing to Period ${currentClass.currentPeriod + 1})?`)) {
          setProcessing(true);
          try {
              await runClassSimulation(currentClassId);
              alert(`Simulation executed successfully! Advanced class to Period ${currentClass.currentPeriod + 1}.`);
          } catch (err: any) {
              console.error(err);
              alert("Failed to process simulation: " + (err.message || err));
          } finally {
              setProcessing(false);
          }
      }
  };

  const submittedCount = leaderboardTeams.filter(t => t.status === 'Submitted').length;
  const totalTeams = leaderboardTeams.length || 1;

  // Calculate average industry ROE
  const totalRoe = leaderboardTeams.reduce((acc, curr) => acc + curr.roe, 0);
  const avgIndustryRoe = leaderboardTeams.length > 0 ? (totalRoe / leaderboardTeams.length) : 0;

  // Find top performer based ALWAYS on Final Score
  const sortedByFinalScore = [...leaderboardTeams].sort((a, b) => b.finalScore - a.finalScore || b.score - a.score);
  const topPerformer = sortedByFinalScore.length > 0 ? sortedByFinalScore[0] : null;
  const topPerformerName = topPerformer ? topPerformer.name : 'N/A';
  const topPerformerFinalScore = topPerformer ? topPerformer.finalScore : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Facilitator Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of {currentClass.name} - Period {currentClass.currentPeriod}</p>
        </div>
        <div className="flex space-x-3">
             <button 
                onClick={() => {
                  const popupUrl = `${window.location.origin}${window.location.pathname}#/debrief/${currentClass.id}`;
                  window.open(popupUrl, 'techtabs-debrief', 'popup,width=1600,height=900');
                }}
                disabled={period <= 1}
                title={period <= 1 ? "Run Year 1 to unlock the debrief presentation" : "Open Debrief Presenter"}
                className={`flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold shadow-sm transition-all ${
                  period <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
             >
                <Presentation size={18} className="mr-2" />
                Open Debrief
             </button>
             <button className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors">
                <RotateCcw size={18} className="mr-2" />
                Reset Round
             </button>
             <button 
                onClick={handleProcessRound}
                disabled={processing}
                className={`flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all ${processing ? 'opacity-70 cursor-wait' : ''}`}
             >
                {processing ? 'Processing...' : (
                    <>
                        <Play size={18} className="mr-2 fill-current" />
                        Run Simulation
                    </>
                )}
             </button>
        </div>
      </div>

      {/* Debrief Remote Controller Panel */}
      {period > 1 && (
        <DebriefRemote classId={currentClass.id} currentPeriod={currentClass.currentPeriod} />
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard size={18} />
          Team Overview
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
            activeTab === 'teams'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Shield size={18} />
          Teams & Decisions
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
            activeTab === 'config'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings size={18} />
          Backend Config
        </button>
        <button
          onClick={() => setActiveTab('tweaker')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
            activeTab === 'tweaker'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders size={18} />
          Parameter Tweaker
        </button>
        <button
          onClick={() => setActiveTab('marketModel')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
            activeTab === 'marketModel'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp size={18} />
          Market Model (Actual)
        </button>
      </div>

      {/* Conditional Content */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">Submission Status</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{submittedCount}/{totalTeams}</h3>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <CheckCircle2 size={24} />
                </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(submittedCount/totalTeams)*100}%` }}></div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">Active Teams</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalTeams}</h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Users size={24} />
                </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">100% Participation</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">Avg. Industry ROE</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{formatPercent(avgIndustryRoe / 100, 2)}</h3>
                </div>
                <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                    <TrendingUp size={24} />
                </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Average of all active teams</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">Top Performer</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 truncate">{topPerformerName}</h3>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
                    <Award size={24} />
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 font-medium">Final Score: <strong className="text-slate-900 font-bold">{topPerformerFinalScore} pts</strong></p>
        </div>

      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Award className="text-amber-500" size={20} />
                  Team Leaderboard
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by default on <strong>Current Score</strong> (GP%, NP%, and ROE performance - Max Score: <strong>{maxScore} pts</strong>). Click any header to re-sort.
                </p>
              </div>
              <span className="text-xs bg-slate-100 font-mono text-slate-600 px-3 py-1 rounded-full font-bold">
                  {nTeams} Active Teams
              </span>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-5 py-3.5 w-12 text-center select-none">Rank</th>
                          
                          <th 
                            onClick={() => handleSort('name')}
                            className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>Team Name</span>
                              {sortField === 'name' && (
                                <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleSort('gpMargin')}
                            className="px-5 py-3.5 text-right bg-blue-50/50 text-blue-900 cursor-pointer hover:bg-blue-100/60 transition-colors select-none"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>GP %</span>
                              {sortField === 'gpMargin' && (
                                <span className="text-blue-700 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleSort('npMargin')}
                            className="px-5 py-3.5 text-right bg-emerald-50/50 text-emerald-900 cursor-pointer hover:bg-emerald-100/60 transition-colors select-none"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>NP %</span>
                              {sortField === 'npMargin' && (
                                <span className="text-emerald-700 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleSort('roe')}
                            className="px-5 py-3.5 text-right bg-purple-50/50 text-purple-900 cursor-pointer hover:bg-purple-100/60 transition-colors select-none"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>ROE</span>
                              {sortField === 'roe' && (
                                <span className="text-purple-700 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleSort('prevScore')}
                            className="px-5 py-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>Previous Score</span>
                              {sortField === 'prevScore' && (
                                <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleSort('score')}
                            className="px-5 py-3.5 text-center bg-indigo-50/60 text-indigo-950 font-bold cursor-pointer hover:bg-indigo-100/70 transition-colors select-none"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>Current Score</span>
                              {sortField === 'score' && (
                                <span className="text-indigo-700 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleSort('finalScore')}
                            className="px-5 py-3.5 text-center bg-amber-50/60 text-amber-950 font-bold cursor-pointer hover:bg-amber-100/70 transition-colors select-none"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>Final Score</span>
                              {sortField === 'finalScore' && (
                                <span className="text-amber-700 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleSort('status')}
                            className="px-5 py-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>Status</span>
                              {sortField === 'status' && (
                                <span className="text-blue-600 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {sortedLeaderboard.map((team, index) => (
                          <tr key={team.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-4 text-center font-bold font-mono text-slate-700">
                                  {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `${index + 1}`}
                              </td>
                              <td className="px-5 py-4 font-bold text-slate-900">{team.name}</td>
                              <td className="px-5 py-4 text-right font-mono text-slate-800 font-semibold bg-blue-50/20">{formatPercent(team.gpMargin / 100, 1)}</td>
                              <td className="px-5 py-4 text-right font-mono text-slate-800 font-semibold bg-emerald-50/20">{formatPercent(team.npMargin / 100, 1)}</td>
                              <td className="px-5 py-4 text-right font-mono text-slate-800 font-semibold bg-purple-50/20">{formatPercent(team.roe / 100, 1)}</td>
                              <td className="px-5 py-4 text-center font-mono text-slate-700 font-semibold">
                                  {team.prevScore} pts
                              </td>
                              <td className="px-5 py-4 text-center bg-indigo-50/20">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-xs">
                                      {team.score} / {maxScore} pts
                                  </span>
                              </td>
                              <td className="px-5 py-4 text-center bg-amber-50/20">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                                      {team.finalScore} pts
                                  </span>
                              </td>
                              <td className="px-5 py-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                      team.status === 'Submitted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                      team.status === 'Saved' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                      'bg-slate-100 text-slate-800 border border-slate-200'
                                  }`}>
                                      {team.status}
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
        </>
      )}

      {/* Teams & Decisions Tab */}
      {activeTab === 'teams' && (() => {
        const allTeams = currentClass.teams || [];
        const activeTeamsList = allTeams.filter(t => !t.isArchived);
        const archivedTeamsList = allTeams.filter(t => t.isArchived);
        const displayedTeams = teamFilterTab === 'active' ? activeTeamsList : archivedTeamsList;

        return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Teams, Access Codes & Current Decisions</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Manage submissions, view live decisions snapshot, and remove/restore teams.</p>
                </div>
                <div className="flex bg-slate-200/70 p-1 rounded-lg text-xs font-bold gap-1">
                    <button
                        onClick={() => setTeamFilterTab('active')}
                        className={`px-3 py-1.5 rounded-md transition-all ${teamFilterTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Active Teams ({activeTeamsList.length})
                    </button>
                    <button
                        onClick={() => setTeamFilterTab('archived')}
                        className={`px-3 py-1.5 rounded-md transition-all ${teamFilterTab === 'archived' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Archived Teams ({archivedTeamsList.length})
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3.5">Team Name</th>
                            <th className="px-6 py-3.5">Access Code</th>
                            <th className="px-6 py-3.5">Status</th>
                            <th className="px-6 py-3.5">Claimed CEO</th>
                            <th className="px-6 py-3.5">CEO PIN</th>
                            <th className="px-6 py-3.5">Last Active</th>
                            <th className="px-6 py-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayedTeams.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    No {teamFilterTab === 'active' ? 'active' : 'archived'} teams found.
                                </td>
                            </tr>
                        ) : (
                        displayedTeams.map((team) => {
                            const isExpanded = !!expandedTeams[team.id];
                            const teamCode = currentClass.teamCodes?.[team.id] || 'N/A';
                            
                            const formatLastActive = (t: Team) => {
                                if (!t.updatedAt) return 'Never';
                                try {
                                    const date = (t.updatedAt as any).toDate ? (t.updatedAt as any).toDate() : new Date(t.updatedAt as any);
                                    return date.toLocaleString();
                                } catch (e) {
                                    return 'Invalid Date';
                                }
                            };

                            const handleReopenClick = async (teamId: string) => {
                                if (confirm(`Are you sure you want to reopen decisions for ${team.name}? This will change their status back to InProgress and allow editing.`)) {
                                    try {
                                        await reopenTeamDecisions(currentClass.id, teamId);
                                        alert("Decisions successfully reopened!");
                                    } catch (err: any) {
                                        alert("Failed to reopen decisions: " + err.message);
                                    }
                                }
                            };

                            const handleArchiveClick = async (teamId: string) => {
                                if (confirm(`Are you sure you want to remove "${team.name}" from the game? The team will be archived and can be restored at any time.`)) {
                                    try {
                                        await archiveTeam(currentClass.id, teamId);
                                    } catch (err: any) {
                                        alert("Failed to remove team: " + err.message);
                                    }
                                }
                            };

                            const handleRestoreClick = async (teamId: string) => {
                                if (confirm(`Are you sure you want to restore "${team.name}" back to the game?`)) {
                                    try {
                                        await restoreTeam(currentClass.id, teamId);
                                    } catch (err: any) {
                                        alert("Failed to restore team: " + err.message);
                                    }
                                }
                            };

                            const decs = team.draftDecisions;

                            return (
                                <React.Fragment key={team.id}>
                                    <tr className={`hover:bg-slate-50/50 transition-colors ${team.isArchived ? 'bg-red-50/20' : ''}`}>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {editingTeamNameId === team.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="text"
                                                        className="font-bold text-slate-800 text-sm border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                        value={tempTeamName}
                                                        onChange={(e) => setTempTeamName(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button 
                                                        onClick={async () => {
                                                            if (tempTeamName.trim()) {
                                                                await updateTeamName(currentClass.id, team.id, tempTeamName.trim());
                                                            }
                                                            setEditingTeamNameId(null);
                                                        }}
                                                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                                                        title="Save Team Name"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingTeamNameId(null)}
                                                        className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 group/name">
                                                    <button 
                                                        onClick={() => setExpandedTeams(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                                                        className="text-left hover:text-blue-600 focus:outline-none flex items-center gap-1.5"
                                                    >
                                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-blue-500' : ''}`} />
                                                        <span>{team.name}</span>
                                                        {team.isArchived && (
                                                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-bold">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setEditingTeamNameId(team.id);
                                                            setTempTeamName(team.name);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors opacity-0 group-hover/name:opacity-100 focus:opacity-100"
                                                        title="Edit Team Name"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded select-all font-semibold border border-slate-200">
                                                {teamCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                team.isArchived ? 'bg-red-100 text-red-800 border border-red-200' :
                                                team.status === 'Submitted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse' :
                                                team.status === 'Saved' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                'bg-slate-100 text-slate-800 border border-slate-200'
                                            }`}>
                                                {team.isArchived ? 'Archived' : (team.status || 'InProgress')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {team.ceoName || <span className="text-slate-400 italic text-xs">Not Claimed</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {team.ceoPin ? (
                                                <span className="font-mono bg-amber-50 text-amber-900 text-xs px-2.5 py-1 rounded font-extrabold border border-amber-200 tracking-wider">
                                                    {team.ceoPin}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">Not Set</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                            {formatLastActive(team)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {team.isArchived ? (
                                                    <button 
                                                        onClick={() => handleRestoreClick(team.id)}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                                        title="Restore team back to game"
                                                    >
                                                        <RefreshCw size={13} />
                                                        Restore Team
                                                    </button>
                                                ) : (
                                                    <>
                                                        {team.status === 'Submitted' && (
                                                            <button 
                                                                onClick={() => handleReopenClick(team.id)}
                                                                className={`px-3 py-1 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center justify-center ${
                                                                    team.reopenRequested 
                                                                        ? 'bg-red-600 hover:bg-red-700 animate-bounce' 
                                                                        : 'bg-amber-500 hover:bg-amber-600'
                                                                }`}
                                                            >
                                                                Reopen
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleArchiveClick(team.id)}
                                                            className="px-2.5 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                                                            title="Remove/archive team from game"
                                                        >
                                                            <Trash2 size={13} />
                                                            Remove
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} className="bg-slate-50/70 px-8 py-4 border-t border-b border-slate-100">
                                                <div className="space-y-4">
                                                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Live Turn Decisions Snapshot</h4>
                                                    
                                                    {decs ? (() => {
                                                        const getForecastedFeatures = (pId: 'techbook' | 'zroid' | 'itab') => {
                                                            const currentFeatures = team.history?.[team.currentPeriod - 1]?.features?.[pId] ?? 0;
                                                            const splitVal = Number(decs.operations?.rdSplits?.[pId]) || 0;
                                                            const investment = (decs.operations?.rdBudget || 0) * splitVal;
                                                            
                                                            const alloc = decs.procurement?.supplierAllocation?.[pId] || {};
                                                            let totalAlloc = 0;
                                                            let sumInnov = 0;
                                                            
                                                            SUPPLIERS.forEach(s => {
                                                                const compVal = Number(alloc[s]?.components) || 0;
                                                                const fgVal = Number(alloc[s]?.finishedGoods) || 0;
                                                                const totalVal = compVal + fgVal;
                                                                if (totalVal > 0) {
                                                                    const supplierInnov = (SUPPLIER_METRICS as any)[s]?.innovation || 5.0;
                                                                    sumInnov += supplierInnov * totalVal;
                                                                    totalAlloc += totalVal;
                                                                }
                                                            });
                                                            const supplierInnovScore = totalAlloc > 0 ? (sumInnov / totalAlloc) : 6.0;
                                                            const baseFeatures = investment / 2000000;
                                                            const featuresDeveloped = baseFeatures * (supplierInnovScore / 6.0);
                                                            const forecastedNewFeatures = Math.min(10, Math.ceil(featuresDeveloped));
                                                            return Math.ceil(currentFeatures + forecastedNewFeatures);
                                                        };

                                                        const getNegotiatedCost = (baseCost: number, supplierId: string) => {
                                                            if (decs.negotiation?.status === 'AGREED' && decs.negotiation?.selectedSupplierId === supplierId) {
                                                                return baseCost * (1 - (decs.negotiation?.agreedDiscount || 0));
                                                            }
                                                            return baseCost;
                                                        };

                                                        return (
                                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-mono text-slate-700">
                                                                <div className="space-y-1.5">
                                                                    <p className="font-bold text-blue-800 uppercase tracking-wider text-[10px] border-b pb-1">Marketing</p>
                                                                    <p><span className="text-slate-400">T Price:</span> R {formatNumber(decs.marketing?.prices?.techbook || 0)}</p>
                                                                    <p><span className="text-slate-400">Z Price:</span> R {formatNumber(decs.marketing?.prices?.zroid || 0)}</p>
                                                                    <p><span className="text-slate-400">I Price:</span> R {formatNumber(decs.marketing?.prices?.itab || 0)}</p>
                                                                    <p><span className="text-slate-400">Ad Budget:</span> R {formatNumber(decs.marketing?.advertisingBudget || 0)}</p>
                                                                    <p><span className="text-slate-400">Commission:</span> {formatPercent((decs.marketing?.agentCommission || 0), 2)}</p>
                                                                    
                                                                    <div className="pt-1.5 border-t border-slate-100 mt-1.5">
                                                                        <p className="font-bold text-blue-900 uppercase text-[9px]">Ad Splits</p>
                                                                        <p className="pl-1"><span className="text-slate-400">T Split:</span> {formatPercent(decs.marketing?.adSplits?.techbook || 0, 1)}</p>
                                                                        <p className="pl-1"><span className="text-slate-400">Z Split:</span> {formatPercent(decs.marketing?.adSplits?.zroid || 0, 1)}</p>
                                                                        <p className="pl-1"><span className="text-slate-400">I Split:</span> {formatPercent(decs.marketing?.adSplits?.itab || 0, 1)}</p>
                                                                        <p className="pl-1"><span className="text-slate-400">Gen Split:</span> {formatPercent(decs.marketing?.generalAdSplit || 0, 1)}</p>
                                                                    </div>
                                                                    
                                                                    <div className="pt-1.5 border-t border-slate-100 mt-1.5">
                                                                        <p><span className="text-slate-400">Stores:</span> {decs.marketing?.openCloseStores > 0 ? `+${decs.marketing.openCloseStores}` : decs.marketing?.openCloseStores || 0} stores</p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <p className="font-bold text-indigo-800 uppercase tracking-wider text-[10px] border-b pb-1">Operations</p>
                                                                    <p><span className="text-slate-400">T Prod:</span> {formatNumber(decs.operations?.production?.techbook || 0)}</p>
                                                                    <p><span className="text-slate-400">Z Prod:</span> {formatNumber(decs.operations?.production?.zroid || 0)}</p>
                                                                    <p><span className="text-slate-400">I Prod:</span> {formatNumber(decs.operations?.production?.itab || 0)}</p>
                                                                    <p><span className="text-slate-400">R&D Budget:</span> R {formatNumber(decs.operations?.rdBudget || 0)}</p>
                                                                    <p><span className="text-slate-400">CAPEX:</span> {formatNumber(decs.operations?.capacityChange || 0)} units</p>
                                                                    
                                                                    <div className="pt-1.5 border-t border-slate-100 mt-1.5">
                                                                        <p className="font-bold text-indigo-900 uppercase text-[9px]">FG Purchase</p>
                                                                        <p className="pl-1"><span className="text-slate-400">T FG:</span> {formatNumber(decs.operations?.reqFinishedGoods?.techbook || 0)}</p>
                                                                        <p className="pl-1"><span className="text-slate-400">Z FG:</span> {formatNumber(decs.operations?.reqFinishedGoods?.zroid || 0)}</p>
                                                                        <p className="pl-1"><span className="text-slate-400">I FG:</span> {formatNumber(decs.operations?.reqFinishedGoods?.itab || 0)}</p>
                                                                    </div>

                                                                    <div className="pt-1.5 border-t border-slate-100 mt-1.5">
                                                                        <p className="font-bold text-indigo-900 uppercase text-[9px]">R&D Split & Feat.</p>
                                                                        <p className="pl-1"><span className="text-slate-400">T:</span> {formatPercent(decs.operations?.rdSplits?.techbook || 0, 1)} (F: {getForecastedFeatures('techbook')})</p>
                                                                        <p className="pl-1"><span className="text-slate-400">Z:</span> {formatPercent(decs.operations?.rdSplits?.zroid || 0, 1)} (F: {getForecastedFeatures('zroid')})</p>
                                                                        <p className="pl-1"><span className="text-slate-400">I:</span> {formatPercent(decs.operations?.rdSplits?.itab || 0, 1)} (F: {getForecastedFeatures('itab')})</p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <p className="font-bold text-teal-800 uppercase tracking-wider text-[10px] border-b pb-1">Procurement</p>
                                                                    
                                                                    <div className="pb-1.5 border-b border-slate-100">
                                                                        <p className="font-bold text-teal-900 uppercase text-[9px]">Negotiation Deal</p>
                                                                        {decs.negotiation?.selectedSupplierId ? (
                                                                            <div className="pl-1 space-y-0.5 text-[10px]">
                                                                                <p><span className="text-slate-400">Partner:</span> {decs.negotiation.selectedSupplierId}</p>
                                                                                <p><span className="text-slate-400">Status:</span> <span className={decs.negotiation.status === 'AGREED' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{decs.negotiation.status}</span></p>
                                                                                {decs.negotiation.status === 'AGREED' && (
                                                                                    <>
                                                                                        <p><span className="text-slate-400">Discount:</span> {formatPercent(decs.negotiation.agreedDiscount || 0, 2)}</p>
                                                                                        <p><span className="text-slate-400">Terms:</span> {decs.negotiation.agreedPaymentTerms} Days</p>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="pl-1 text-slate-400 italic text-[10px]">No supplier selected</p>
                                                                        )}
                                                                    </div>

                                                                    {decs.negotiation?.sessionScores && (
                                                                        <div className="py-1.5 border-b border-slate-100 text-[10px]">
                                                                            <p className="font-bold text-teal-900 uppercase text-[9px]">Negotiation KPIs</p>
                                                                            <div className="pl-1 space-y-0.5">
                                                                                <p><span className="text-slate-400">Prep:</span> {decs.negotiation.sessionScores.preparation}/5</p>
                                                                                <p><span className="text-slate-400">Interests:</span> {decs.negotiation.sessionScores.interests}/5</p>
                                                                                <p><span className="text-slate-400">Trading:</span> {decs.negotiation.sessionScores.trading}/5</p>
                                                                                <p><span className="text-slate-400">Concessions:</span> {decs.negotiation.sessionScores.concessions}/5</p>
                                                                                <p><span className="text-slate-400">Professionalism:</span> {decs.negotiation.sessionScores.professionalism}/5</p>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="py-1.5 border-b border-slate-100">
                                                                        <p className="font-bold text-teal-900 uppercase text-[9px] mb-1">Negotiated Prices</p>
                                                                        <div className="space-y-1">
                                                                            {SUPPLIERS.map(s => {
                                                                                const isAgreed = decs.negotiation?.status === 'AGREED' && decs.negotiation?.selectedSupplierId === s;
                                                                                const m = (SUPPLIER_METRICS as any)[s] || {};
                                                                                
                                                                                const tb_cp = getNegotiatedCost(COMPONENT_COSTS.techbook[s], s);
                                                                                const zr_cp = getNegotiatedCost(COMPONENT_COSTS.zroid[s], s);
                                                                                const it_cp = getNegotiatedCost(COMPONENT_COSTS.itab[s], s);
                                                                                
                                                                                const tb_fg = getNegotiatedCost(FINISHED_GOODS_COSTS.techbook[s], s);
                                                                                const zr_fg = getNegotiatedCost(FINISHED_GOODS_COSTS.zroid[s], s);
                                                                                const it_fg = getNegotiatedCost(FINISHED_GOODS_COSTS.itab[s], s);
                                                                                
                                                                                return (
                                                                                    <div key={s} className={`p-1 rounded text-[10px] ${isAgreed ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50/50'}`}>
                                                                                        <p className="font-bold text-[9px] text-slate-800 flex justify-between items-center">
                                                                                            <span>{s} {isAgreed && '✓'}</span>
                                                                                            <span className="text-[7.5px] font-normal text-slate-400">Terms:{m.terms}d</span>
                                                                                        </p>
                                                                                        <p className="text-[7.5px] text-slate-500 font-semibold leading-none mb-0.5">
                                                                                            Q:{m.quality} LT:{m.leadTime}d S:{m.service} C:{m.capacity} I:{m.innovation}
                                                                                        </p>
                                                                                        <div className="pl-1 text-[9px] space-y-0.5 leading-tight">
                                                                                            <p><span className="text-slate-400 font-semibold text-[8px]">Comp:</span> TB:R{tb_cp} / ZR:R{zr_cp} / IT:R{it_cp}</p>
                                                                                            <p><span className="text-slate-400 font-semibold text-[8px]">FinG:</span> TB:R{tb_fg} / ZR:R{zr_fg} / IT:R{it_fg}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    <div className="pt-1.5">
                                                                        <p className="font-bold text-teal-900 uppercase text-[9px]">Allocations</p>
                                                                        {decs.procurement?.supplierAllocation ? (
                                                                            Object.entries(decs.procurement?.supplierAllocation || {}).map(([prod, suppliers]: any) => (
                                                                                <div key={prod} className="text-[10px] space-y-0.5">
                                                                                    <p className="font-semibold text-slate-500 uppercase text-[9px]">{prod}:</p>
                                                                                    {Object.entries(suppliers || {}).map(([supp, alloc]: any) => (
                                                                                        <p key={supp} className="pl-1.5">
                                                                                            {supp}: C:{alloc.components || 0} / FG:{alloc.finishedGoods || 0}
                                                                                        </p>
                                                                                    ))}
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="text-slate-400 italic">No allocations</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <p className="font-bold text-pink-800 uppercase tracking-wider text-[10px] border-b pb-1">HR & Staffing</p>
                                                                    {decs.hr ? (
                                                                        Object.keys(decs.hr.hiring || {}).map((roleKey) => {
                                                                            const role = roleKey as HRRole;
                                                                            const hiringVal = decs.hr.hiring?.[role] || 0;
                                                                            const salaryVal = decs.hr.salaries?.[role] || 0;
                                                                            const trainingVal = decs.hr.trainingLevels?.[role] || 'None';
                                                                            const roleName = role.replace(/([A-Z])/g, ' $1').trim();
                                                                            return (
                                                                                <div key={role} className="text-[10px] space-y-0.5 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                                                                    <p className="font-bold text-slate-800 uppercase text-[9px]">{roleName}</p>
                                                                                    <p className="pl-1.5"><span className="text-slate-400">Hiring:</span> {hiringVal > 0 ? `+${hiringVal}` : hiringVal}</p>
                                                                                    <p className="pl-1.5"><span className="text-slate-400">Salary:</span> R {formatNumber(salaryVal)}</p>
                                                                                    <p className="pl-1.5"><span className="text-slate-400">Training:</span> {trainingVal}</p>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <p className="text-slate-400 italic">No staffing info</p>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <p className="font-bold text-amber-800 uppercase tracking-wider text-[10px] border-b pb-1">Finance</p>
                                                                    <p><span className="text-slate-400">Debt Change:</span> R {formatNumber(decs.finance?.debtChange || 0)}</p>
                                                                    <p><span className="text-slate-400">Equity Change:</span> R {formatNumber(decs.finance?.equityChange || 0)}</p>
                                                                    <p><span className="text-slate-400">T Debtors Days:</span> {decs.finance?.debtorsDays?.techbook || 0} days</p>
                                                                    <p><span className="text-slate-400">Z Debtors Days:</span> {decs.finance?.debtorsDays?.zroid || 0} days</p>
                                                                    <p><span className="text-slate-400">I Debtors Days:</span> {decs.finance?.debtorsDays?.itab || 0} days</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })() : (
                                                        <div className="text-slate-400 text-xs italic bg-white p-3 rounded-lg border border-slate-200">
                                                            No decision snapshots saved yet. Values will display once the team interacts with the simulation.
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        }))}
                    </tbody>
                </table>
            </div>
        </div>
        );
      })()}

      {/* Backend Config Viewer */}
      {activeTab === 'config' && <SimulationConfig />}

      {/* Parameter Tweaker */}
      {activeTab === 'tweaker' && <ParameterTweaker />}

      {/* Market Model (Actual) backModel Viewer */}
      {activeTab === 'marketModel' && (() => {
        const activeClassTeams = (currentClass.teams || []).filter(t => !t.isArchived);
        const results = computeMarketShareBackModel(activeClassTeams, currentClass.currentPeriod);
        const productResult = results.find(r => r.productId === selectedMarketProduct);
        const sortedTeams = [...activeClassTeams].sort((a, b) => a.id.localeCompare(b.id));

        if (!productResult) return null;

        return (
          <div className="space-y-6 mt-6">
            {/* Product selection sub-tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-px">
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedMarketProduct(p.id)}
                  className={`px-4 py-2 border-b-2 font-semibold text-sm transition-all ${
                    selectedMarketProduct === p.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Explanatory banner */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-3 items-start">
              <AlertCircle size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-500 space-y-1">
                <p>
                  This view recreates the Excel-based <strong>backModel</strong> market share engine. It standardises team inputs using population standard deviation (&sigma;) across all slots to compute a Normal Cumulative distribution (z-score-style relative performance score in 0–1).
                </p>
                <p>
                  Price is scaled as <em>lower-is-better</em>, other criteria as <em>higher-is-better</em>.
                  Inactive teams (market share forecast &lt; 0.000001) are excluded and score 0.
                </p>
              </div>
            </div>

            {/* Criteria Scores Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-w-full">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                    <th scope="col" className="py-2.5 px-4 font-semibold text-slate-600 sticky left-0 z-30 bg-slate-50 min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      Customer buying criteria
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-slate-600 text-center w-20 border-r border-slate-200 bg-slate-50">
                      Mean (&mu;)
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-slate-600 text-center w-20 border-r border-slate-200 bg-slate-50">
                      Std Dev (&sigma;)
                    </th>
                    {sortedTeams.map((t, idx) => {
                      const isActive = productResult.activeByTeam[idx];
                      return (
                        <th key={t.id} scope="col" className={`py-2.5 px-4 font-semibold border-r border-slate-200 min-w-[150px] ${!isActive ? 'bg-slate-50 text-slate-400' : 'text-slate-800 bg-white'}`}>
                          <div className="flex flex-col">
                            <span className="font-bold">{t.name}</span>
                            {!isActive && <span className="text-[9px] text-amber-600 font-medium">(Inactive)</span>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productResult.criteria.map(c => {
                    const winnerIdx = getCriterionWinnerIndex(c.id, c.rawByTeam, productResult.activeByTeam);
                    
                    return (
                      <React.Fragment key={c.id}>
                        {/* 1. Raw Input Row */}
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-1.5 px-4 font-medium text-slate-700 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {c.name} (Raw)
                          </td>
                          <td className="py-1.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500 bg-slate-50/30">
                            {getFormattedRaw(c.id, c.mu)}
                          </td>
                          <td className="py-1.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500 bg-slate-50/30">
                            {getFormattedSigma(c.id, c.sigma)}
                          </td>
                          {sortedTeams.map((t, idx) => {
                            const isActive = productResult.activeByTeam[idx];
                            const isWinner = winnerIdx === idx;
                            return (
                              <td
                                key={t.id}
                                className={`py-1.5 px-4 border-r border-slate-200 font-mono ${
                                  !isActive 
                                    ? 'text-slate-300 bg-slate-50/40' 
                                    : (isWinner ? 'bg-yellow-50/80 text-slate-900 font-bold' : 'text-slate-600')
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span>{getFormattedRaw(c.id, c.rawByTeam[idx])}</span>
                                  {isActive && isWinner && <span className="text-[10px] text-amber-600">👑</span>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                        {/* 2. NormCdf Score Row */}
                        <tr className="bg-slate-50/20 text-slate-500 hover:bg-slate-50/50 transition-colors">
                          <td className="py-1 px-4 text-slate-400 pl-6 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r">
                            &bull; Score (0-1)
                          </td>
                          <td className="py-1 px-3 text-center border-r border-slate-200 bg-slate-50/50 font-mono">—</td>
                          <td className="py-1 px-3 text-center border-r border-slate-200 bg-slate-50/50 font-mono">—</td>
                          {sortedTeams.map((t, idx) => {
                            const isActive = productResult.activeByTeam[idx];
                            return (
                              <td
                                key={t.id}
                                className={`py-1 px-4 border-r border-slate-200 font-mono text-[10px] ${
                                  !isActive ? 'text-slate-300 bg-slate-50/40' : 'text-slate-500'
                                }`}
                              >
                                {isActive ? c.scoreByTeam[idx].toFixed(3) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* Divider section for Weighted calculations */}
                  <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                    <td colSpan={sortedTeams.length + 3} className="py-1.5 px-4 sticky left-0 bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                      Weighted Score Calculations
                    </td>
                  </tr>

                  {productResult.criteria.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors text-slate-600">
                      <td className="py-1.5 px-4 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-medium">
                        {c.name}
                      </td>
                      <td className="py-1.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500 bg-slate-50/30">
                        Weight: {c.rating}
                      </td>
                      <td className="py-1.5 px-3 text-center border-r border-slate-200 bg-slate-50/30 font-mono text-slate-400">—</td>
                      {sortedTeams.map((t, idx) => {
                        const isActive = productResult.activeByTeam[idx];
                        return (
                          <td
                            key={t.id}
                            className={`py-1.5 px-4 border-r border-slate-200 font-mono ${
                              !isActive ? 'text-slate-300 bg-slate-50/40' : 'text-slate-700'
                            }`}
                          >
                            {isActive ? c.weightedByTeam[idx].toFixed(3) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Summary calculations section */}
                  <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-200">
                    <td colSpan={3} className="py-2 px-4 sticky left-0 bg-slate-100 text-sm">
                      Total Buying Score
                    </td>
                    {sortedTeams.map((t, idx) => {
                      const isActive = productResult.activeByTeam[idx];
                      return (
                        <td
                          key={t.id}
                          className={`py-2 px-4 border-r border-slate-200 font-mono font-bold text-sm bg-slate-100 ${
                            !isActive ? 'text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {isActive ? productResult.totalScoreByTeam[idx].toFixed(3) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="bg-indigo-50 font-bold text-indigo-900 border-t border-indigo-200">
                    <td colSpan={3} className="py-2 px-4 sticky left-0 bg-indigo-50 text-sm">
                      Calculated Market Share (%)
                    </td>
                    {sortedTeams.map((t, idx) => {
                      const isActive = productResult.activeByTeam[idx];
                      return (
                        <td
                          key={t.id}
                          className={`py-2 px-4 border-r border-indigo-200 font-mono font-extrabold text-sm bg-indigo-50 ${
                            !isActive ? 'text-indigo-400' : 'text-indigo-900'
                          }`}
                        >
                          {isActive ? formatPercent(productResult.marketShareByTeam[idx], 1, true) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Demand distribution working */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td colSpan={3} className="py-2 px-4 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-semibold text-slate-700">
                      Market Demand (Units: {formatNumber(productResult.marketDemand, 0)})
                    </td>
                    {sortedTeams.map((t, idx) => {
                      const isActive = productResult.activeByTeam[idx];
                      return (
                        <td
                          key={t.id}
                          className={`py-2 px-4 border-r border-slate-200 font-mono font-semibold text-slate-600 ${
                            !isActive ? 'text-slate-300 bg-slate-50/40' : ''
                          }`}
                        >
                          {isActive ? formatNumber(productResult.demandUnitsByTeam[idx], 0) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td colSpan={3} className="py-2 px-4 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-semibold text-slate-700">
                      Available for Sale
                    </td>
                    {sortedTeams.map((t, idx) => {
                      const isActive = productResult.activeByTeam[idx];
                      return (
                        <td
                          key={t.id}
                          className={`py-2 px-4 border-r border-slate-200 font-mono font-semibold text-slate-600 ${
                            !isActive ? 'text-slate-300 bg-slate-50/40' : ''
                          }`}
                        >
                          {isActive ? formatNumber(productResult.availableByTeam[idx], 0) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="bg-emerald-50 border-y border-emerald-200 font-bold text-emerald-950">
                    <td colSpan={3} className="py-2.5 px-4 sticky left-0 bg-emerald-50 text-sm">
                      Units Sold (Min(Demand, Available))
                    </td>
                    {sortedTeams.map((t, idx) => {
                      const isActive = productResult.activeByTeam[idx];
                      return (
                        <td
                          key={t.id}
                          className={`py-2.5 px-4 border-r border-emerald-200 font-mono font-bold text-sm bg-emerald-50 ${
                            !isActive ? 'text-emerald-400 bg-slate-50/40 border-r-slate-200' : 'text-emerald-950'
                          }`}
                        >
                          {isActive ? formatNumber(productResult.unitsSoldByTeam[idx], 0) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Helper functions for market model actual z-score engine calculations
const getCriterionWinnerIndex = (criterionId: number, rawValues: number[], activeByTeam: boolean[]) => {
  let winnerIdx = -1;
  let bestVal = criterionId === 1 ? Infinity : -Infinity;
  rawValues.forEach((val, idx) => {
    if (!activeByTeam[idx]) return;
    if (criterionId === 1) { // Price - lower is better
      if (val > 0 && val < bestVal) {
        bestVal = val;
        winnerIdx = idx;
      }
    } else { // higher is better
      if (val > bestVal) {
        bestVal = val;
        winnerIdx = idx;
      }
    }
  });
  return winnerIdx;
};

const getFormattedRaw = (criterionId: number, value: number) => {
  if (value === 0 || value === null || value === undefined) return '—';
  switch (criterionId) {
    case 1: // Price
      return formatNumber(value, 0);
    case 2: // Payment Terms
      return `${value} days`;
    case 3: // Availability
    case 4: // Stores
      return formatNumber(value, 0);
    case 5: // Agents
      return formatPercent(value, 2, true);
    case 6: // CS Headcount
      return formatNumber(value, 0);
    case 7: // Features
      return formatNumber(value, 0);
    case 8: // Company Ad
    case 9: // Product Ad
      return formatCurrency(value, 0);
    case 10: // Other
      return formatNumber(value, 0);
    default:
      return String(value);
  }
};

const getFormattedSigma = (criterionId: number, value: number) => {
  if (value === 0 || value === null || value === undefined) return '0.000';
  switch (criterionId) {
    case 5: // Agents
      return formatPercent(value, 3, true);
    case 8: // Ad
    case 9: // Ad
      return formatCurrency(value, 0);
    default:
      return formatNumber(value, 3);
  }
};

export default FacilitatorDashboard;