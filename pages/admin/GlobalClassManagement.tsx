import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../../contexts/SimulationContext';
import { Search, Plus, Trash2, ExternalLink, Calendar, Users, KeyRound, Archive, RefreshCw, X, Check } from 'lucide-react';

const GlobalClassManagement: React.FC = () => {
  const { classes, createClass, deleteClass, archiveClass, restoreClass, selectClass, resetClassToYear1 } = useSimulation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classTabFilter, setClassTabFilter] = useState<'active' | 'archived'>('active');
  
  // Custom Modal State (replaces browser confirm/alert)
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'archive' | 'restore' | 'deleteForever' | 'resetYear1' | 'alert' | null;
    targetClass?: { id: string; name: string };
    title: string;
    description: string;
    confirmText?: string;
    confirmStyle?: 'danger' | 'warning' | 'primary' | 'emerald';
  }>({
    isOpen: false,
    type: null,
    title: '',
    description: ''
  });

  // New Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeams, setNewClassTeams] = useState(4);

  const activeClasses = classes.filter(c => !c.isArchived);
  const archivedClasses = classes.filter(c => c.isArchived);

  const filteredClasses = (classTabFilter === 'active' ? activeClasses : archivedClasses).filter(c => 
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

  const promptArchive = (classId: string, className: string) => {
    setModalConfig({
      isOpen: true,
      type: 'archive',
      targetClass: { id: classId, name: className },
      title: 'Archive Class',
      description: `Are you sure you want to archive "${className}"? This will move the class to your Archive tab. All team decisions and history will be preserved.`,
      confirmText: 'Move to Archive',
      confirmStyle: 'warning'
    });
  };

  const promptRestore = (classId: string, className: string) => {
    setModalConfig({
      isOpen: true,
      type: 'restore',
      targetClass: { id: classId, name: className },
      title: 'Restore Class',
      description: `Are you sure you want to restore "${className}" back to Active Classes?`,
      confirmText: 'Restore Class',
      confirmStyle: 'emerald'
    });
  };

  const promptDeleteForever = (classId: string, className: string) => {
    setModalConfig({
      isOpen: true,
      type: 'deleteForever',
      targetClass: { id: classId, name: className },
      title: 'Permanently Delete Class',
      description: `⚠️ DANGER: Are you sure you want to PERMANENTLY delete "${className}"? This action CANNOT be undone and all team decisions will be erased forever.`,
      confirmText: 'Delete Forever',
      confirmStyle: 'danger'
    });
  };

  const promptResetToYear1 = (classId: string, className: string) => {
    setModalConfig({
      isOpen: true,
      type: 'resetYear1',
      targetClass: { id: classId, name: className },
      title: 'Reset Class to Year 1',
      description: `WARNING: Are you sure you want to reset "${className}" to Year 1? This will clear all decisions and calculated results from Year 1 onward. Year 0 history will remain intact.`,
      confirmText: 'Reset to Year 1',
      confirmStyle: 'danger'
    });
  };

  const handleConfirmModalAction = async () => {
    if (!modalConfig.targetClass && modalConfig.type !== 'alert') {
      setModalConfig({ isOpen: false, type: null, title: '', description: '' });
      return;
    }

    const { type, targetClass } = modalConfig;
    setModalConfig({ isOpen: false, type: null, title: '', description: '' });

    if (type === 'archive' && targetClass) {
      await archiveClass(targetClass.id, true);
      setClassTabFilter('archived');
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Class Archived',
        description: `Class "${targetClass.name}" has been moved to Archive.`,
        confirmText: 'OK',
        confirmStyle: 'primary'
      });
    } else if (type === 'restore' && targetClass) {
      await restoreClass(targetClass.id);
      setClassTabFilter('active');
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Class Restored',
        description: `Class "${targetClass.name}" has been restored to Active Classes!`,
        confirmText: 'View Active Classes',
        confirmStyle: 'emerald'
      });
    } else if (type === 'deleteForever' && targetClass) {
      await deleteClass(targetClass.id);
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Class Deleted',
        description: `Class "${targetClass.name}" has been permanently deleted.`,
        confirmText: 'OK',
        confirmStyle: 'danger'
      });
    } else if (type === 'resetYear1' && targetClass) {
      await resetClassToYear1(targetClass.id);
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Class Reset Complete',
        description: `Class "${targetClass.name}" reset to Year 1 successfully.`,
        confirmText: 'OK',
        confirmStyle: 'primary'
      });
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
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search class name, ID or code..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex bg-slate-200/80 p-1 rounded-lg text-xs font-bold gap-1">
                    <button
                        onClick={() => setClassTabFilter('active')}
                        className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${classTabFilter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <span>Active Classes</span>
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
                            {activeClasses.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setClassTabFilter('archived')}
                        className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${classTabFilter === 'archived' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <span>Archive</span>
                        <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full text-[10px]">
                            {archivedClasses.length}
                        </span>
                    </button>
                </div>
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
                          <tr key={c.id} className={`hover:bg-slate-50 ${c.isArchived ? 'bg-red-50/20' : ''}`}>
                              <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900 flex items-center gap-2">
                                      <span>{c.name}</span>
                                      {c.isArchived && (
                                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-bold border border-red-200">
                                              Archived
                                          </span>
                                      )}
                                  </div>
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
                                      {c.teams.filter(t => !t.isArchived).length}
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
                                  <div className="flex items-center justify-end space-x-2">
                                      {c.isArchived ? (
                                          <>
                                              <button 
                                                onClick={() => promptRestore(c.id, c.name)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1"
                                                title="Restore Class"
                                              >
                                                  <RefreshCw size={12} />
                                                  Restore
                                              </button>
                                              <button 
                                                onClick={() => promptDeleteForever(c.id, c.name)}
                                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1"
                                                title="Delete Class Forever"
                                              >
                                                  <Trash2 size={12} />
                                                  Delete Forever
                                              </button>
                                          </>
                                      ) : (
                                          <>
                                              <button 
                                                onClick={() => handleSuperLogin(c.id)}
                                                className="flex items-center px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-900 transition-colors"
                                                title="Access Facilitator Console for this class"
                                              >
                                                  Enter Console <ExternalLink size={12} className="ml-1" />
                                              </button>
                                              <button 
                                                onClick={() => promptResetToYear1(c.id, c.name)}
                                                className="flex items-center px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded shadow-sm transition-colors animate-pulse"
                                                title="Reset Class to Year 1"
                                              >
                                                  Reset to Year 1
                                              </button>
                                              <button 
                                                onClick={() => promptArchive(c.id, c.name)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Archive Class"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </>
                                      )}
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

      {/* Custom Action & Alert Modal Dialog */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in duration-150">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {modalConfig.type === 'archive' && (
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                      <Archive size={20} />
                    </div>
                  )}
                  {modalConfig.type === 'restore' && (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      <RefreshCw size={20} />
                    </div>
                  )}
                  {(modalConfig.type === 'deleteForever' || modalConfig.type === 'resetYear1') && (
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                      <Trash2 size={20} />
                    </div>
                  )}
                  {modalConfig.type === 'alert' && (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      <Check size={20} />
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-slate-900">{modalConfig.title}</h3>
                </div>
                <button 
                  onClick={() => setModalConfig({ isOpen: false, type: null, title: '', description: '' })}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {modalConfig.description}
              </p>

              <div className="flex items-center justify-end space-x-3">
                {modalConfig.type !== 'alert' && (
                  <button
                    onClick={() => setModalConfig({ isOpen: false, type: null, title: '', description: '' })}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={handleConfirmModalAction}
                  className={`px-5 py-2 text-white text-sm font-bold rounded-lg shadow-xs transition-all ${
                    modalConfig.confirmStyle === 'danger'
                      ? 'bg-red-600 hover:bg-red-700'
                      : modalConfig.confirmStyle === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : modalConfig.confirmStyle === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {modalConfig.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GlobalClassManagement;