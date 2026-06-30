
import React, { useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { SUPPLIERS } from '../../constants';
import { MarketEvent } from '../../types';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Plus, 
  Mail,
  Bot,
  Save,
  MessageSquare,
  School,
  ArrowRight,
  Zap,
  AlertTriangle,
  ChevronRight,
  Check,
  Wrench,
  Award,
  FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DEFAULT_SURVEY_CONFIG } from '../../constants';
import { SurveyConfig, SurveyQuestion } from '../../types';

const ClassManagement: React.FC = () => {
  const { currentClassId, classes, updateClassNegotiationConfig, selectClass, injectMarketEvent, updateSurveyConfig, updateClassHideSurvey } = useSimulation();
  const [activeTab, setActiveTab] = useState<'students' | 'ai' | 'godmode' | 'survey'>('students');

  // AI Config State
  const [selectedSupplier, setSelectedSupplier] = useState(SUPPLIERS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [aiInstruction, setAiInstruction] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // God Mode State
  const [selectedEventType, setSelectedEventType] = useState<MarketEvent['effect']>('MATERIAL_COST_HIKE');
  const [eventMagnitude, setEventMagnitude] = useState(0.20);

  // Find current class data
  const currentClass = classes.find(c => c.id === currentClassId);

  // DDF Survey State
  const [surveyTab, setSurveyTab] = useState<'analytics' | 'config'>('analytics');
  const [editingConfig, setEditingConfig] = useState<SurveyConfig | null>(null);
  const [editingSaveStatus, setEditingSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  React.useEffect(() => {
      if (currentClass) {
          setEditingConfig(currentClass.surveyConfig || DEFAULT_SURVEY_CONFIG);
      }
  }, [currentClass]);

  const surveyConfig = currentClass?.surveyConfig || DEFAULT_SURVEY_CONFIG;
  const responses = currentClass?.surveyResponses || [];

  const calculateSurveyData = () => {
        const activeQs = surveyConfig.questions.filter(q => q.isActive);
        const likertQs = activeQs.filter(q => q.type === 'likert');
        
        if (responses.length === 0 || likertQs.length === 0) {
            return {
                overallDDI: 0,
                sectionScores: {} as Record<string, number>,
                teamScores: [] as { name: string; ddi: number; sections: Record<string, number>; count: number }[],
                textResponses: [] as { teamName: string; q13: string[]; q14: string[] }[]
            };
        }

        const processResponse = (r: any) => {
            const scores: Record<string, number> = {};
            const sectionSums: Record<string, number> = {};
            const sectionCounts: Record<string, number> = {};

            likertQs.forEach(q => {
                let val = Number(r.answers[q.id]);
                if (isNaN(val)) return;
                
                if (q.isReverse) {
                    val = 6 - val;
                }
                
                scores[q.id] = val;
                sectionSums[q.sectionId] = (sectionSums[q.sectionId] || 0) + val * q.weight;
                sectionCounts[q.sectionId] = (sectionCounts[q.sectionId] || 0) + q.weight;
            });

            const sectionsAvg: Record<string, number> = {};
            let weightedSectionSum = 0;
            let weightedSectionCount = 0;

            surveyConfig.sections.forEach(sec => {
                const sum = sectionSums[sec.id] || 0;
                const count = sectionCounts[sec.id] || 0;
                if (count > 0) {
                    const avg = sum / count;
                    sectionsAvg[sec.id] = avg;
                    
                    if (sec.weight > 0) {
                        weightedSectionSum += avg * sec.weight;
                        weightedSectionCount += sec.weight;
                    }
                }
            });

            let ddi = 0;
            if (surveyConfig.scoringMethod === 'weighted_average') {
                ddi = weightedSectionCount > 0 ? weightedSectionSum / weightedSectionCount : 0;
            } else {
                let sum = 0;
                let count = 0;
                likertQs.forEach(q => {
                    const val = scores[q.id];
                    if (val !== undefined) {
                        sum += val;
                        count++;
                    }
                });
                ddi = count > 0 ? sum / count : 0;
            }

            return { ddi, sections: sectionsAvg };
        };

        const teamStats: Record<string, { ddiSum: number; count: number; sectionsSum: Record<string, number>; name: string }> = {};
        let classDdiSum = 0;
        const classSectionsSum: Record<string, number> = {};
        const classSectionsCount: Record<string, number> = {};

        responses.forEach(r => {
            const result = processResponse(r);
            if (!result) return;

            classDdiSum += result.ddi;
            Object.entries(result.sections).forEach(([secId, val]) => {
                classSectionsSum[secId] = (classSectionsSum[secId] || 0) + val;
                classSectionsCount[secId] = (classSectionsCount[secId] || 0) + 1;
            });

            if (!teamStats[r.teamId]) {
                teamStats[r.teamId] = {
                    name: r.teamName,
                    ddiSum: 0,
                    count: 0,
                    sectionsSum: {}
                };
            }
            teamStats[r.teamId].ddiSum += result.ddi;
            teamStats[r.teamId].count += 1;
            Object.entries(result.sections).forEach(([secId, val]) => {
                teamStats[r.teamId].sectionsSum[secId] = (teamStats[r.teamId].sectionsSum[secId] || 0) + val;
            });
        });

        const overallDDI = classDdiSum / responses.length;
        
        const sectionScores: Record<string, number> = {};
        surveyConfig.sections.forEach(sec => {
            const sum = classSectionsSum[sec.id] || 0;
            const count = classSectionsCount[sec.id] || 0;
            sectionScores[sec.id] = count > 0 ? sum / count : 0;
        });

        const teamScoresList: { name: string; ddi: number; sections: Record<string, number>; count: number }[] = [];
        Object.entries(teamStats).forEach(([teamId, stats]) => {
            const teamSecs: Record<string, number> = {};
            Object.entries(stats.sectionsSum).forEach(([secId, sum]) => {
                teamSecs[secId] = sum / stats.count;
            });
            teamScoresList.push({
                name: stats.name,
                ddi: stats.ddiSum / stats.count,
                sections: teamSecs,
                count: stats.count
            });
        });

        const textResponsesList: { teamName: string; q13: string[]; q14: string[] }[] = [];
        const textResponsesMap: Record<string, { teamName: string; q13: string[]; q14: string[] }> = {};
        responses.forEach(r => {
            if (!textResponsesMap[r.teamId]) {
                textResponsesMap[r.teamId] = { teamName: r.teamName, q13: [], q14: [] };
            }
            const q13Val = r.answers['q13'];
            const q14Val = r.answers['q14'];
            if (q13Val) textResponsesMap[r.teamId].q13.push(String(q13Val));
            if (q14Val) textResponsesMap[r.teamId].q14.push(String(q14Val));
        });
        Object.values(textResponsesMap).forEach(val => textResponsesList.push(val));

        return {
            overallDDI,
            sectionScores,
            teamScores: teamScoresList,
            textResponses: textResponsesList
        };
  };

  const students = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', team: 'Alpha Innovations', role: 'CEO', lastActive: '2 mins ago' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', team: 'Alpha Innovations', role: 'CFO', lastActive: '1 hour ago' },
    { id: 3, name: 'Charlie Davis', email: 'charlie@example.com', team: 'The Vault', role: 'CEO', lastActive: '5 mins ago' },
  ];

  const handleSaveConfig = () => {
      if (currentClassId) {
          updateClassNegotiationConfig(currentClassId, selectedPeriod, selectedSupplier, aiInstruction);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
      }
  };

  const handleInjectEvent = () => {
      if (!currentClassId || !currentClass) return;
      const newEvent: MarketEvent = {
          id: `evt_${Date.now()}`,
          name: 'Manual Injection',
          description: `Facilitator injected ${selectedEventType}`,
          effect: selectedEventType,
          magnitude: eventMagnitude,
          activePeriod: currentClass.currentPeriod
      };
      injectMarketEvent(currentClassId, newEvent);
      alert("Event Injected! It will affect the simulation when the next turn is processed.");
  };

  React.useEffect(() => {
      if (currentClass && currentClass.negotiationOverrides) {
          const instruction = currentClass.negotiationOverrides[selectedPeriod]?.[selectedSupplier] || '';
          setAiInstruction(instruction);
      } else {
          setAiInstruction('');
      }
  }, [selectedSupplier, selectedPeriod, currentClass]);

  if (!currentClass) {
      return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <div className="text-center mb-10">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <School className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Select a Class to Manage</h1>
                <p className="text-slate-500 mt-2">You need to select a simulation class before accessing management tools.</p>
            </div>
            {classes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(cls => (
                        <button 
                            key={cls.id}
                            onClick={() => selectClass(cls.id)}
                            className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left relative overflow-hidden"
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Class Management</h1>
          <p className="text-slate-500 mt-1">{currentClass.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-1 inline-flex shadow-sm flex-wrap gap-1">
          <button onClick={() => setActiveTab('students')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users size={16} className="mr-2" /> Student Roster
          </button>
          <button onClick={() => setActiveTab('ai')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Bot size={16} className="mr-2" /> AI Tuning
          </button>
          <button onClick={() => setActiveTab('godmode')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'godmode' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Zap size={16} className="mr-2" /> God Mode
          </button>
          <button onClick={() => setActiveTab('survey')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'survey' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <MessageSquare size={16} className="mr-2" /> DDF Survey
          </button>
      </div>

      {activeTab === 'students' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input type="text" placeholder="Search students..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                        <tr><th className="px-6 py-3">Student Name</th><th className="px-6 py-3">Team</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Last Active</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                                <td className="px-6 py-4"><span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">{student.team}</span></td>
                                <td className="px-6 py-4 text-slate-600">{student.role}</td>
                                <td className="px-6 py-4 text-slate-500">{student.lastActive}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Configuration Target</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none">
                                {[1, 2, 3, 4].map(p => <option key={p} value={p}>Period {p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                            <div className="space-y-2">
                                {SUPPLIERS.map(s => (
                                    <button key={s} onClick={() => setSelectedSupplier(s)} className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${selectedSupplier === s ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">System Instruction Prompt</h3>
                        <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700">{saveStatus === 'saved' ? 'Saved' : 'Save Config'}</button>
                    </div>
                    <textarea className="flex-1 w-full border border-slate-300 rounded-xl p-4 text-sm bg-slate-50" placeholder="Enter instructions for the AI..." value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} />
                </div>
            </div>
        </div>
      )}

      {activeTab === 'godmode' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center mb-6 text-amber-600">
                  <AlertTriangle className="mr-3" size={24} />
                  <div>
                      <h2 className="text-xl font-bold">Inject Market Event</h2>
                      <p className="text-sm text-slate-500">Force immediate economic shocks to the simulation.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Event Type</label>
                      <select 
                        className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value as any)}
                      >
                          <option value="MATERIAL_COST_HIKE">Raw Material Cost Hike</option>
                          <option value="DEMAND_BOOM">Market Demand Boom</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Magnitude (Percentage)</label>
                      <input 
                        type="number" 
                        step="0.05"
                        className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                        value={eventMagnitude}
                        onChange={(e) => setEventMagnitude(parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-slate-400 mt-1">0.20 = 20% Increase</p>
                  </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={handleInjectEvent}
                    className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                  >
                      <Zap size={18} className="mr-2" />
                      Inject Event Now
                  </button>
              </div>
              
              <div className="mt-6 bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-bold text-slate-700 mb-2 text-sm">Active Events for Current Period:</h4>
                  {currentClass.activeEvents?.length ? (
                      <ul className="list-disc list-inside text-sm text-slate-600">
                          {currentClass.activeEvents.map(e => (
                              <li key={e.id}>{e.name}: {e.description} ({e.magnitude * 100}%)</li>
                          ))}
                      </ul>
                  ) : (
                      <p className="text-sm text-slate-400 italic">No active events.</p>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'survey' && (
        <div className="space-y-6 animate-in fade-in duration-200">
           {/* Survey Sub-navigation */}
           <div className="border-b border-slate-200 flex justify-between items-center bg-white px-6 py-1 rounded-xl shadow-sm border">
               <div className="flex space-x-6">
                   <button 
                       onClick={() => setSurveyTab('analytics')} 
                       className={`py-3 text-sm font-bold border-b-2 transition-all ${surveyTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                   >
                       Results & Diagnostics
                   </button>
                   <button 
                       onClick={() => setSurveyTab('config')} 
                       className={`py-3 text-sm font-bold border-b-2 transition-all ${surveyTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                   >
                       Configure Questionnaire
                   </button>
               </div>
               <div className="text-xs text-slate-400 font-medium">
                   Responses: {responses.length}
               </div>
           </div>

           {surveyTab === 'analytics' && (() => {
               const { overallDDI, sectionScores, teamScores, textResponses } = calculateSurveyData();
               const totalResponses = responses.length;

               if (totalResponses === 0) {
                   return (
                       <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                           <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                               <FileText className="w-8 h-8 text-indigo-600" />
                           </div>
                           <h3 className="text-lg font-bold text-slate-900 mb-1">No Responses Yet</h3>
                           <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                               Once students log in using their team codes and complete the Team Dynamics Survey, the diagnostic results will be calculated here.
                           </p>
                           <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold">
                               <span>Expected survey link:</span>
                               <code className="bg-white px-2 py-0.5 border rounded font-mono text-slate-800">#/survey</code>
                           </div>
                       </div>
                   );
               }

               // Format data for Recharts Section Chart
               const chartData = surveyConfig.sections
                   .filter(sec => sec.id !== 'sec_reflection')
                   .map(sec => ({
                       name: sec.name.split(' & ')[0], // Shorten name
                       Score: parseFloat((sectionScores[sec.id] || 0).toFixed(2))
                   })) || [];

               return (
                   <div className="space-y-6">
                       {/* Stats Cards */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {/* DDI Card */}
                           <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                               <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/5 rounded-full pointer-events-none"></div>
                               <span className="text-indigo-100 text-xs font-bold uppercase tracking-wider">
                                   Class DDI Index
                               </span>
                               <div className="flex items-baseline gap-2 mt-2">
                                   <span className="text-5xl font-black">{overallDDI.toFixed(2)}</span>
                                   <span className="text-indigo-200 text-sm font-semibold">/ 5.00</span>
                               </div>
                               <p className="text-xs text-indigo-100/90 mt-4 leading-relaxed">
                                   Decision Dynamics Index represents the average decision effectiveness score across all active sections.
                               </p>
                           </div>

                           {/* Submission Stats */}
                           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                               <div>
                                   <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                       Participation
                                   </span>
                                   <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
                                       {totalResponses}
                                   </h3>
                               </div>
                               <p className="text-xs text-slate-500 leading-relaxed mt-4">
                                   Total completed surveys submitted by individual users in the class for the current period.
                               </p>
                           </div>

                           {/* Status Indicator */}
                           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                               <div>
                                   <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                       Diagnostic Status
                                   </span>
                                   <div className="flex items-center gap-2 mt-2">
                                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                                       <span className="text-lg font-bold text-slate-800">Receiving Submissions</span>
                                   </div>
                               </div>
                               <p className="text-xs text-slate-500 leading-relaxed mt-4">
                                   Survey configuration is live. Students can fill out the survey via the sidebar menu.
                               </p>
                           </div>
                       </div>

                       {/* Main Content Grid */}
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           {/* Chart */}
                           <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[350px]">
                               <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-slate-400">Framework Dimension Scores</h3>
                               <div className="h-64 w-full flex-1">
                                   <ResponsiveContainer width="100%" height="100%">
                                       <BarChart
                                           data={chartData}
                                           layout="vertical"
                                           margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                                       >
                                           <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                           <XAxis type="number" domain={[0, 5]} />
                                           <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                                           <Tooltip formatter={(value) => [`${value} / 5`, 'Score']} />
                                           <Bar dataKey="Score" fill="#4f46e5" radius={[0, 4, 4, 0]}>
                                               {chartData.map((entry, index) => {
                                                   const colors = ['#6366f1', '#3b82f6', '#10b981', '#06b6d4'];
                                                   return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                               })}
                                           </Bar>
                                       </BarChart>
                                   </ResponsiveContainer>
                               </div>
                           </div>

                           {/* Team Rankings */}
                           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                               <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-slate-400">Team Leaderboard</h3>
                               <div className="space-y-4">
                                   {teamScores.map((team, idx) => (
                                       <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                           <div>
                                               <h4 className="font-bold text-sm text-slate-800">{team.name}</h4>
                                               <p className="text-xs text-slate-400 mt-0.5">{team.count} response(s)</p>
                                           </div>
                                           <div className="text-right">
                                               <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700">
                                                   DDI: {team.ddi.toFixed(2)}
                                               </span>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       </div>

                       {/* Detailed Team Tables */}
                       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                           <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                               <h3 className="font-bold text-slate-800">Team Score Breakdown</h3>
                           </div>
                           <div className="overflow-x-auto">
                               <table className="w-full text-left text-sm">
                                   <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs">
                                       <tr>
                                           <th className="px-6 py-3.5">Team</th>
                                           {surveyConfig.sections
                                               .filter(sec => sec.id !== 'sec_reflection')
                                               .map(sec => (
                                                   <th key={sec.id} className="px-6 py-3.5 max-w-[120px]">{sec.name.split(' & ')[0]}</th>
                                               ))}
                                           <th className="px-6 py-3.5 text-right">DDI Score</th>
                                       </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100 font-medium">
                                       {teamScores.map((team, idx) => (
                                           <tr key={idx} className="hover:bg-slate-50/50">
                                               <td className="px-6 py-4 font-bold text-slate-900">{team.name}</td>
                                               {surveyConfig.sections
                                                   .filter(sec => sec.id !== 'sec_reflection')
                                                   .map(sec => (
                                                       <td key={sec.id} className="px-6 py-4 text-slate-600">
                                                           {(team.sections[sec.id] || 0).toFixed(2)}
                                                       </td>
                                                   ))}
                                               <td className="px-6 py-4 text-right">
                                                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800">
                                                       {team.ddi.toFixed(2)}
                                                   </span>
                                               </td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           </div>
                       </div>

                       {/* Open Feedback reflections */}
                       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                           <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                               <h3 className="font-bold text-slate-800">Qualitative Insights & Feedback</h3>
                           </div>
                           <div className="p-6 space-y-6">
                               {textResponses.map((team, idx) => (
                                   <div key={idx} className="space-y-4">
                                       <h4 className="font-extrabold text-indigo-700 border-b border-slate-100 pb-2 text-sm">{team.teamName}</h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                                           <div>
                                               <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">What went well:</h5>
                                               {team.q13.length ? (
                                                   <ul className="space-y-2">
                                                       {team.q13.map((text, i) => (
                                                           <li key={i} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 relative italic">
                                                               "{text}"
                                                           </li>
                                                       ))}
                                                   </ul>
                                               ) : (
                                                   <p className="text-xs text-slate-400 italic">No submissions.</p>
                                               )}
                                           </div>
                                           <div>
                                               <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">What to improve:</h5>
                                               {team.q14.length ? (
                                                   <ul className="space-y-2">
                                                       {team.q14.map((text, i) => (
                                                           <li key={i} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 relative italic">
                                                               "{text}"
                                                           </li>
                                                       ))}
                                                   </ul>
                                               ) : (
                                                   <p className="text-xs text-slate-400 italic">No submissions.</p>
                                               )}
                                           </div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
               );
           })()}

           {surveyTab === 'config' && editingConfig && (
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-8">
                   <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                       <div>
                           <h3 className="font-bold text-slate-800 text-lg">Questionnaire Customization</h3>
                           <p className="text-slate-500 text-sm mt-0.5">Edit survey questions, weights, and scoring options.</p>
                       </div>
                       <button 
                           onClick={async () => {
                               setEditingSaveStatus('saving');
                               await updateSurveyConfig(editingConfig);
                               setEditingSaveStatus('saved');
                               setTimeout(() => setEditingSaveStatus('idle'), 2000);
                           }}
                           className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 text-sm transition-all shadow-md flex items-center gap-2"
                       >
                           <Save size={16} />
                           {editingSaveStatus === 'saving' ? 'Saving...' : editingSaveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
                       </button>
                   </div>

                   {/* Scoring & Visibility Config */}
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Scoring Method</label>
                           <select 
                               className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm bg-white"
                               value={editingConfig.scoringMethod}
                               onChange={(e) => setEditingConfig(prev => prev ? ({ ...prev, scoringMethod: e.target.value as any }) : null)}
                           >
                               <option value="simple_average">Simple Average (Avg. of all active Likert questions)</option>
                               <option value="weighted_average">Weighted Section Average (Applies section weights)</option>
                           </select>
                       </div>
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Survey Visibility</label>
                           <label className="flex items-center gap-3 bg-white p-2.5 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors select-none font-medium">
                               <input 
                                   type="checkbox"
                                   checked={currentClass.hideSurvey || false}
                                   onChange={async (e) => {
                                       await updateClassHideSurvey(e.target.checked);
                                   }}
                                   className="rounded h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                               />
                               <div>
                                   <span className="text-sm font-bold text-slate-800">Hide Survey from Delegates</span>
                                   <p className="text-xs text-slate-400 mt-0.5">When checked, delegates will not see or be able to take the survey.</p>
                               </div>
                           </label>
                       </div>
                   </div>

                   {/* Question Customization */}
                   <div className="space-y-6">
                       <h4 className="font-bold text-slate-800 text-md border-b border-slate-100 pb-2">Questions Configuration</h4>
                       <div className="space-y-4">
                           {editingConfig.questions.map((q, idx) => (
                               <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                   <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                       <span className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-xs">
                                           Question {q.number} ({q.type})
                                       </span>
                                       
                                       <div className="flex flex-wrap gap-4 items-center">
                                           {q.type === 'likert' && (
                                               <>
                                                   <label className="flex items-center text-xs font-semibold text-slate-600 gap-1.5 cursor-pointer">
                                                       <input 
                                                           type="checkbox"
                                                           checked={q.isReverse}
                                                           onChange={(e) => {
                                                               const updatedQs = [...editingConfig.questions];
                                                               updatedQs[idx] = { ...q, isReverse: e.target.checked };
                                                               setEditingConfig({ ...editingConfig, questions: updatedQs });
                                                           }}
                                                           className="rounded text-indigo-600 focus:ring-indigo-500"
                                                       />
                                                       Reverse Scored
                                                   </label>

                                                   <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                       <span>Weight:</span>
                                                       <input 
                                                           type="number"
                                                           step="0.1"
                                                           className="w-14 border rounded px-1.5 py-0.5 text-center bg-white"
                                                           value={q.weight}
                                                           onChange={(e) => {
                                                               const updatedQs = [...editingConfig.questions];
                                                               updatedQs[idx] = { ...q, weight: parseFloat(e.target.value) || 0 };
                                                               setEditingConfig({ ...editingConfig, questions: updatedQs });
                                                           }}
                                                       />
                                                   </div>
                                               </>
                                           )}

                                           <label className="flex items-center text-xs font-semibold text-slate-600 gap-1.5 cursor-pointer">
                                               <input 
                                                   type="checkbox"
                                                   checked={q.isActive}
                                                   onChange={(e) => {
                                                       const updatedQs = [...editingConfig.questions];
                                                       updatedQs[idx] = { ...q, isActive: e.target.checked };
                                                       setEditingConfig({ ...editingConfig, questions: updatedQs });
                                                   }}
                                                   className="rounded text-indigo-600 focus:ring-indigo-500"
                                               />
                                               Active
                                           </label>
                                       </div>
                                   </div>

                                   <div>
                                       <input 
                                           type="text"
                                           className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm bg-white focus:ring-1 focus:ring-indigo-500"
                                           value={q.text}
                                           onChange={(e) => {
                                               const updatedQs = [...editingConfig.questions];
                                               updatedQs[idx] = { ...q, text: e.target.value };
                                               setEditingConfig({ ...editingConfig, questions: updatedQs });
                                           }}
                                       />
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
               </div>
           )}
        </div>
      )}

    </div>
  );
};

export default ClassManagement;
