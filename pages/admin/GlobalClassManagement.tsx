import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../../contexts/SimulationContext';
import { Search, Plus, Trash2, ExternalLink, Calendar, Users, KeyRound } from 'lucide-react';

const GlobalClassManagement: React.FC = () => {
  const { classes, createClass, deleteClass, selectClass, resetClassToYear1 } = useSimulation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // New Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeams, setNewClassTeams] = useState(4);

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.facilitatorCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      createClass(newClassName, newClassTeams);
      setNewClassName('');
      setNewClassTeams(4);
      setIsCreateModalOpen(false);
    }
  };

  const handleSuperLogin = (classId: string) => {
      // Super power: Login as facilitator for this class
      selectClass(classId);
      navigate('/facilitator/dashboard');
  };

  const handleDelete = (classId: string) => {
      if (confirm('WARNING: Are you sure you want to delete this class? This action cannot be undone and all student progress will be lost.')) {
          deleteClass(classId);
      }
  };

  const handleResetToYear1 = async (classId: string) => {
      if (confirm('WARNING: Are you sure you want to reset this class to Year 1? This will clear all team decisions, transactions, and calculated results for Year 1 onward. Year 0 history will remain intact. This action cannot be undone.')) {
          await resetClassToYear1(classId);
          alert('Class reset to Year 1 successfully.');
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Global Class Management</h1>
          <p className="text-slate-500 mt-1">Monitor and manage all simulation instances across the platform.</p>
        </div>
        <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm transition-colors"
        >
            <Plus size={18} className="mr-2" />
            Create System Class
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search class name, ID or code..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="text-sm text-slate-500">
                Total Classes: {classes.length}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Class Name / ID</th>
                          <th className="px-6 py-4">Facilitator Code</th>
                          <th className="px-6 py-4">Teams</th>
                          <th className="px-6 py-4">Round</th>
                          <th className="px-6 py-4">Created</th>
                          <th className="px-6 py-4 text-right">Super Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredClasses.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{c.name}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">{c.id}</div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                     <KeyRound size={14} className="text-slate-400"/>
                                     <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">{c.facilitatorCode}</code>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center text-slate-600">
                                      <Users size={16} className="mr-2 text-slate-400" />
                                      {c.teams.length}
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Period {c.currentPeriod}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-slate-500">
                                  {new Date(c.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-3">
                                      <button 
                                        onClick={() => handleSuperLogin(c.id)}
                                        className="flex items-center px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-900 transition-colors"
                                        title="Access Facilitator Console for this class"
                                      >
                                          Enter Console <ExternalLink size={12} className="ml-1" />
                                      </button>
                                      <button 
                                        onClick={() => handleResetToYear1(c.id)}
                                        className="flex items-center px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded shadow-sm transition-colors animate-pulse"
                                        title="Reset Class to Year 1"
                                      >
                                          Reset to Year 1
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(c.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        title="Delete Class"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {filteredClasses.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                  No classes found.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

       {/* Create Modal */}
       {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                      <h3 className="font-bold text-lg text-slate-800">Create System Class</h3>
                  </div>
                  <form onSubmit={handleCreate} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                          <input 
                              type="text" 
                              required
                              placeholder="e.g. Master Simulation Template"
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                              value={newClassName}
                              onChange={e => setNewClassName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Number of Teams</label>
                          <select 
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                            className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
                          >
                              Create Class
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default GlobalClassManagement;