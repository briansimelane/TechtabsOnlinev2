import React, { useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
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
  ChevronRight
} from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SimulationConfig } from './SimulationConfig';
import { ParameterTweaker } from './ParameterTweaker';
import { formatNumber, formatPercent, formatCurrency } from '../../utils/numberFormat';
import { Team, HRRole } from '../../types';
import { PRODUCTS, SUPPLIERS, SUPPLIER_METRICS, COMPONENT_COSTS, FINISHED_GOODS_COSTS } from '../../constants';
import { computeMarketShareBackModel } from '../../utils/marketShareBackModel';

const FacilitatorDashboard: React.FC = () => {
  const { currentClassId, classes, runClassSimulation, selectClass, reopenTeamDecisions } = useSimulation();
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'tweaker' | 'teams' | 'marketModel'>('overview');
  const [selectedMarketProduct, setSelectedMarketProduct] = useState<'techbook' | 'zroid' | 'itab'>('techbook');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

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
                                    {cls.teams.length} Teams
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

  const realTeams = currentClass.teams || [];

  const teamsData = realTeams.map(t => {
      const lastPeriod = t.currentPeriod - 1;
      const kpis = t.history?.[lastPeriod]?.kpis;
      return {
          id: t.id,
          name: t.name,
          revenue: kpis?.revenue || 0,
          profit: kpis?.netProfit || 0,
          roe: kpis?.roe !== undefined ? kpis.roe * 100 : 0, // convert decimal to percentage
          status: t.status || 'InProgress'
      };
  });

  const chartData = teamsData.map(t => ({
      name: t.name,
      Revenue: t.revenue,
      Profit: t.profit
  }));

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

  const submittedCount = teamsData.filter(t => t.status === 'Submitted').length;
  const totalTeams = teamsData.length || 1;

  // Calculate average industry ROE
  const totalRoe = teamsData.reduce((acc, curr) => acc + curr.roe, 0);
  const avgIndustryRoe = teamsData.length > 0 ? (totalRoe / teamsData.length) : 0;

  // Find top performer by ROE
  const sortedTeams = [...teamsData].sort((a, b) => b.roe - a.roe);
  const topPerformerName = sortedTeams.length > 0 ? sortedTeams[0].name : 'N/A';
  const topPerformerRoe = sortedTeams.length > 0 ? sortedTeams[0].roe : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Facilitator Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of {currentClass.name} - Period {currentClass.currentPeriod}</p>
        </div>
        <div className="flex space-x-3">
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
            <p className="text-xs text-slate-500 mt-4">ROE: {formatPercent(topPerformerRoe / 100, 2)}</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Team Leaderboard</h3>
                  <button className="text-sm text-blue-600 font-medium hover:underline">View Full Report</button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-3 w-10">#</th>
                              <th className="px-6 py-3">Team Name</th>
                              <th className="px-6 py-3 text-right">Revenue</th>
                              <th className="px-6 py-3 text-right">Net Profit</th>
                              <th className="px-6 py-3 text-right">ROE</th>
                              <th className="px-6 py-3 text-center">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {teamsData.sort((a,b) => b.roe - a.roe).map((team, index) => (
                              <tr key={team.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 text-slate-400 font-mono">{index + 1}</td>
                                  <td className="px-6 py-4 font-medium text-slate-900">{team.name}</td>
                                  <td className="px-6 py-4 text-right font-mono text-slate-600">R {formatNumber(team.revenue/1000000, 0)}M</td>
                                  <td className="px-6 py-4 text-right font-mono text-slate-600">R {formatNumber(team.profit/1000000, 0)}M</td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-800">{formatPercent(team.roe, 2, false)}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          team.status === 'Submitted' ? 'bg-emerald-100 text-emerald-800' :
                                          team.status === 'Saved' ? 'bg-amber-100 text-amber-800' :
                                          'bg-slate-100 text-slate-800'
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

          {/* Industry Overview Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6">Industry Financials</h3>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" hide />
                          <YAxis tickFormatter={(val) => `R${val/1000000}M`} />
                          <Tooltip formatter={(val: number) => `R ${formatNumber(val/1000000, 0)}M`} />
                          <Bar dataKey="Revenue" fill="#3B82F6" stackId="a" />
                          <Bar dataKey="Profit" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                  </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center space-x-6 text-xs">
                  <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm mr-2"></div>
                      <span className="text-slate-600">Revenue</span>
                  </div>
                  <div className="flex items-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm mr-2"></div>
                      <span className="text-slate-600">Net Profit</span>
                  </div>
              </div>
          </div>

      </div>
        </>
      )}

      {/* Teams & Decisions Tab */}
      {activeTab === 'teams' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Teams, Access Codes & Current Decisions</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Manage submissions, view live decisions snapshot, and track active sessions.</p>
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
                            <th className="px-6 py-3.5">Last Active</th>
                            <th className="px-6 py-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {realTeams.map((team) => {
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

                            const decs = team.draftDecisions;

                            return (
                                <React.Fragment key={team.id}>
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            <button 
                                                onClick={() => setExpandedTeams(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                                                className="text-left hover:text-blue-600 focus:outline-none flex items-center gap-1.5"
                                            >
                                                <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-blue-500' : ''}`} />
                                                {team.name}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded select-all font-semibold border border-slate-200">
                                                {teamCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                team.status === 'Submitted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse' :
                                                team.status === 'Saved' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                'bg-slate-100 text-slate-800 border border-slate-200'
                                            }`}>
                                                {team.status || 'InProgress'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {team.ceoName || <span className="text-slate-400 italic text-xs">Not Claimed</span>}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                            {formatLastActive(team)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {team.status === 'Submitted' ? (
                                                <div className="space-y-1.5 flex flex-col items-center">
                                                    {team.reopenRequested && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded-full border border-red-200 animate-pulse">
                                                            ⚠️ Reopen Requested
                                                        </span>
                                                    )}
                                                    <button 
                                                        onClick={() => handleReopenClick(team.id)}
                                                        className={`px-3 py-1 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center justify-center mx-auto ${
                                                            team.reopenRequested 
                                                                ? 'bg-red-600 hover:bg-red-700 animate-bounce' 
                                                                : 'bg-amber-500 hover:bg-amber-600'
                                                        }`}
                                                    >
                                                        Reopen Decisions
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">No action needed</span>
                                            )}
                                        </td>
                                    </tr>
                                    
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={6} className="bg-slate-50/70 px-8 py-4 border-t border-b border-slate-100">
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
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Backend Config Viewer */}
      {activeTab === 'config' && <SimulationConfig />}

      {/* Parameter Tweaker */}
      {activeTab === 'tweaker' && <ParameterTweaker />}

      {/* Market Model (Actual) backModel Viewer */}
      {activeTab === 'marketModel' && (() => {
        const results = computeMarketShareBackModel(currentClass.teams, currentClass.currentPeriod);
        const productResult = results.find(r => r.productId === selectedMarketProduct);
        const sortedTeams = [...currentClass.teams].sort((a, b) => a.id.localeCompare(b.id));

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