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
  LayoutDashboard
} from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SimulationConfig } from './SimulationConfig';
import { ParameterTweaker } from './ParameterTweaker';
import { formatNumber, formatPercent } from '../../utils/numberFormat';

const FacilitatorDashboard: React.FC = () => {
  const { currentTeam } = useSimulation();
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'tweaker'>('overview');

  // Mock Data for the Cohort
  const teamsData = [
    { id: 1, name: 'Alpha Innovations', revenue: 582869074, profit: 101800696, roe: 23.1, status: 'Submitted' },
    { id: 2, name: 'The Vault', revenue: 443777662, profit: 63009103, roe: 18.0, status: 'Saved' },
    { id: 3, name: 'CTRL + ALT + ELITE', revenue: 658957883, profit: 142522139, roe: 33.2, status: 'Submitted' },
    { id: 4, name: 'The Exchange', revenue: 603170146, profit: 151676318, roe: 34.6, status: 'Submitted' },
    { id: 5, name: 'Maverick Minds', revenue: 519179038, profit: 108865964, roe: 30.6, status: 'InProgress' },
  ];

  const chartData = teamsData.map(t => ({
      name: t.name,
      Revenue: t.revenue,
      Profit: t.profit
  }));

  const handleProcessRound = () => {
      setProcessing(true);
      setTimeout(() => {
          alert("Period processed successfully! Reports generated.");
          setProcessing(false);
      }, 2000);
  };

  const submittedCount = teamsData.filter(t => t.status === 'Submitted').length;
  const totalTeams = teamsData.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Facilitator Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of MBA Cohort 2024 - Period {currentTeam.currentPeriod}</p>
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
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">25.90%</h3>
                </div>
                <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                    <TrendingUp size={24} />
                </div>
            </div>
            <p className="text-xs text-emerald-600 mt-4 flex items-center">
                <TrendingUp size={12} className="mr-1" />
                +4.20% vs last period
            </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">Top Performer</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 truncate">The Exchange</h3>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
                    <Award size={24} />
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">ROE: 34.6%</p>
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

      {/* Backend Config Viewer */}
      {activeTab === 'config' && <SimulationConfig />}

      {/* Parameter Tweaker */}
      {activeTab === 'tweaker' && <ParameterTweaker />}
    </div>
  );
};

export default FacilitatorDashboard;