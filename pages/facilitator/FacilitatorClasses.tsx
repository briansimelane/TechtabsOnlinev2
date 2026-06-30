import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../../contexts/SimulationContext';
import { Plus, Users, Calendar, ArrowRight, Copy, Check, Search, KeyRound, Eye, MoreHorizontal } from 'lucide-react';

const FacilitatorClasses: React.FC = () => {
  const { classes, createClass, selectClass } = useSimulation();
  const navigate = useNavigate();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCodesModalOpen, setIsCodesModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeams, setNewClassTeams] = useState(4);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      createClass(newClassName, newClassTeams);
      setNewClassName('');
      setNewClassTeams(4);
      setIsCreateModalOpen(false);
    }
  };

  const handleEnterClass = (classId: string) => {
      selectClass(classId);
      navigate('/facilitator/dashboard');
  };

  const openCodesModal = (classId: string) => {
      setSelectedClassId(classId);
      setIsCodesModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="max-w-7xl mx-auto p-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">My Classes</h1>
            <p className="text-slate-500 mt-1">Manage your simulation instances and access codes.</p>
        </div>
        <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors"
        >
            <Plus size={18} className="mr-2" />
            Create New Class
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search classes..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="text-sm text-slate-500">
                Showing {filteredClasses.length} classes
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Class Name</th>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Teams</th>
                        <th className="px-6 py-4">Current Round</th>
                        <th className="px-6 py-4">Facilitator Code</th>
                        <th className="px-6 py-4">Created</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredClasses.length === 0 ? (
                         <tr>
                             <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center">
                                    <Users size={48} className="mb-4 text-slate-300" />
                                    <p className="text-lg font-medium text-slate-600">No classes found</p>
                                    <p className="text-sm">Create a new class to get started</p>
                                </div>
                             </td>
                         </tr>
                    ) : (
                        filteredClasses.map((simClass) => (
                            <tr key={simClass.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{simClass.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{simClass.id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-slate-600">
                                        <Users size={16} className="mr-2 text-slate-400" />
                                        {simClass.teams.length}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        Period {simClass.currentPeriod}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                     <div className="flex items-center space-x-2">
                                        <code className="font-mono font-bold text-slate-700">{simClass.facilitatorCode}</code>
                                        <button 
                                            onClick={() => copyToClipboard(simClass.facilitatorCode)}
                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Copy Code"
                                        >
                                            {copiedCode === simClass.facilitatorCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </button>
                                     </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(simClass.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-3">
                                        <button 
                                            onClick={() => openCodesModal(simClass.id)}
                                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View Access Codes"
                                        >
                                            <KeyRound size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleEnterClass(simClass.id)}
                                            className="flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            Enter <ArrowRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Create Class Modal */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                      <h3 className="font-bold text-lg text-slate-800">Create New Class</h3>
                  </div>
                  <form onSubmit={handleCreate} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                          <input 
                              type="text" 
                              required
                              placeholder="e.g. MBA Cohort 2024 - Group A"
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={newClassName}
                              onChange={e => setNewClassName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Number of Teams</label>
                          <select 
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={newClassTeams}
                              onChange={e => setNewClassTeams(Number(e.target.value))}
                          >
                              {[2, 3, 4, 5, 6, 7, 8].map(n => (
                                  <option key={n} value={n}>{n} Teams</option>
                              ))}
                          </select>
                      </div>
                      <div className="pt-4 flex justify-end space-x-3">
                          <button 
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                          >
                              Create Class
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Access Codes Modal */}
      {isCodesModalOpen && selectedClass && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{selectedClass.name}</h3>
                        <p className="text-xs text-slate-500">Student Access Codes</p>
                      </div>
                      <button 
                        onClick={() => setIsCodesModalOpen(false)}
                        className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                      >
                          <Plus size={24} className="rotate-45" />
                      </button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(selectedClass.teamCodes).map(([teamId, code], idx) => {
                              const teamName = selectedClass.teams.find(t => t.id === teamId)?.name || `Team ${idx+1}`;
                              return (
                                  <div key={teamId} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 hover:shadow-md transition-all">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="text-sm font-medium text-slate-500">{teamName}</div>
                                          <Users size={16} className="text-slate-300" />
                                      </div>
                                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                          <span className="font-mono font-bold text-xl text-slate-800 tracking-wider">{code}</span>
                                          <button 
                                            onClick={() => copyToClipboard(code as string)}
                                            className="p-2 bg-white rounded-md shadow-sm text-slate-400 hover:text-blue-600 hover:shadow transition-all"
                                            title="Copy Code"
                                          >
                                              {copiedCode === code ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100">
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                              <div>
                                  <h4 className="font-bold text-indigo-900 text-sm">Facilitator Access Code</h4>
                                  <p className="text-indigo-600 text-xs mt-1">Use this code to log in as a facilitator for this class.</p>
                              </div>
                              <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm">
                                  <span className="font-mono font-bold text-indigo-700 text-lg">{selectedClass.facilitatorCode}</span>
                                   <button 
                                        onClick={() => copyToClipboard(selectedClass.facilitatorCode)}
                                        className="text-indigo-300 hover:text-indigo-600 transition-colors"
                                    >
                                        {copiedCode === selectedClass.facilitatorCode ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                    </button>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => setIsCodesModalOpen(false)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default FacilitatorClasses;