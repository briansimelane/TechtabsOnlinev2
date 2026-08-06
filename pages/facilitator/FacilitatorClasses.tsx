import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../../contexts/SimulationContext';
import { Plus, Users, Calendar, ArrowRight, Copy, Check, Search, KeyRound, Eye, MoreHorizontal, Trash2, Edit2, Save, X, Shield, Lock, Archive, RefreshCw } from 'lucide-react';

const FacilitatorClasses: React.FC = () => {
  const { classes, currentRole, currentClassId, createClass, selectClass, deleteClass, archiveClass, restoreClass, updateClassFacilitatorCode, updateTeamCode, updateTeamCeoPin, restoreTeam } = useSimulation();
  const navigate = useNavigate();

  // Master accounts (ADMIN, FAC-8819 / currentClassId === null) see ALL classes.
  // Class-specific facilitators see ONLY their assigned class.
  const userClasses = (currentRole === 'FACILITATOR' && currentClassId) 
    ? classes.filter(c => c.id === currentClassId)
    : classes;

  const activeClasses = userClasses.filter(c => !c.isArchived);
  const archivedClasses = userClasses.filter(c => c.isArchived);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCodesModalOpen, setIsCodesModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classTabFilter, setClassTabFilter] = useState<'active' | 'archived'>('active');
  
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeams, setNewClassTeams] = useState(4);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Edit states inside Access Codes modal
  const [editingFacCode, setEditingFacCode] = useState(false);
  const [tempFacCode, setTempFacCode] = useState('');

  const [editingTeamCodeId, setEditingTeamCodeId] = useState<string | null>(null);
  const [tempTeamCode, setTempTeamCode] = useState('');

  const [editingCeoPinId, setEditingCeoPinId] = useState<string | null>(null);
  const [tempCeoPin, setTempCeoPin] = useState('');

  // Custom Modal State (replaces browser confirm/alert)
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'archive' | 'restore' | 'deleteForever' | 'alert' | null;
    simClass?: { id: string; name: string };
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

  const promptArchive = (simClass: { id: string; name: string }) => {
    setModalConfig({
      isOpen: true,
      type: 'archive',
      simClass,
      title: 'Archive Class',
      description: `Are you sure you want to archive "${simClass.name}"? This will move the class to your Archive tab. All team decisions, access codes, and history will be safely preserved.`,
      confirmText: 'Move to Archive',
      confirmStyle: 'warning'
    });
  };

  const promptRestore = (simClass: { id: string; name: string }) => {
    setModalConfig({
      isOpen: true,
      type: 'restore',
      simClass,
      title: 'Restore Class',
      description: `Are you sure you want to restore "${simClass.name}" back to Active Classes?`,
      confirmText: 'Restore Class',
      confirmStyle: 'emerald'
    });
  };

  const promptDeleteForever = (simClass: { id: string; name: string }) => {
    setModalConfig({
      isOpen: true,
      type: 'deleteForever',
      simClass,
      title: 'Permanently Delete Class',
      description: `⚠️ DANGER: Are you sure you want to PERMANENTLY delete "${simClass.name}"? This action CANNOT be undone and all team decisions will be lost forever.`,
      confirmText: 'Delete Forever',
      confirmStyle: 'danger'
    });
  };

  const handleConfirmModalAction = async () => {
    if (!modalConfig.simClass && modalConfig.type !== 'alert') {
      setModalConfig({ isOpen: false, type: null, title: '', description: '' });
      return;
    }

    const { type, simClass } = modalConfig;
    setModalConfig({ isOpen: false, type: null, title: '', description: '' });

    if (type === 'archive' && simClass) {
      await archiveClass(simClass.id, true);
      setClassTabFilter('archived');
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Class Archived',
        description: `Class "${simClass.name}" has been moved to the Archive tab. All student decisions and history were safely preserved.`,
        confirmText: 'Got It',
        confirmStyle: 'primary'
      });
    } else if (type === 'restore' && simClass) {
      await restoreClass(simClass.id);
      setClassTabFilter('active');
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Class Restored',
        description: `Class "${simClass.name}" has been successfully restored back to Active Classes!`,
        confirmText: 'View Active Classes',
        confirmStyle: 'emerald'
      });
    } else if (type === 'deleteForever' && simClass) {
      await deleteClass(simClass.id);
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Class Deleted',
        description: `Class "${simClass.name}" has been permanently deleted.`,
        confirmText: 'Done',
        confirmStyle: 'danger'
      });
    }
  };

  const displayedClasses = (classTabFilter === 'active' ? activeClasses : archivedClasses).filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="max-w-7xl mx-auto p-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">My Classes</h1>
            <p className="text-slate-500 mt-1">Manage your simulation instances, access codes, and archived classes.</p>
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
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search classes..." 
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
                
                <div className="text-sm text-slate-500 hidden md:block">
                    Showing {displayedClasses.length} classes
                </div>
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
                    {displayedClasses.length === 0 ? (
                         <tr>
                             <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center">
                                    <Users size={48} className="mb-4 text-slate-300" />
                                    <p className="text-lg font-medium text-slate-600">No {classTabFilter === 'active' ? 'active' : 'archived'} classes found</p>
                                    <p className="text-sm">{classTabFilter === 'active' ? 'Create a new class to get started' : 'Archived classes will appear here'}</p>
                                </div>
                             </td>
                         </tr>
                    ) : (
                        displayedClasses.map((simClass) => (
                            <tr key={simClass.id} className={`hover:bg-slate-50 transition-colors ${simClass.isArchived ? 'bg-red-50/20' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>{simClass.name}</span>
                                        {simClass.isArchived && (
                                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-bold border border-red-200">
                                                Archived
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{simClass.id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-slate-600">
                                        <Users size={16} className="mr-2 text-slate-400" />
                                        {simClass.teams.filter(t => !t.isArchived).length}
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
                                    <div className="flex items-center justify-end space-x-2">
                                        {simClass.isArchived ? (
                                            <>
                                                <button 
                                                    onClick={() => promptRestore(simClass)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                                                    title="Restore class back to active classes"
                                                >
                                                    <RefreshCw size={14} />
                                                    Restore
                                                </button>
                                                <button 
                                                    onClick={() => promptDeleteForever(simClass)}
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                                                    title="Delete class permanently forever"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete Forever
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => openCodesModal(simClass.id)}
                                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Access Codes"
                                                >
                                                    <KeyRound size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => promptArchive(simClass)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Archive Class"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEnterClass(simClass.id)}
                                                    className="flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                                                >
                                                    Enter <ArrowRight size={14} className="ml-1" />
                                                </button>
                                            </>
                                        )}
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
                        <p className="text-xs text-slate-500">Student & Facilitator Access Controls</p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsCodesModalOpen(false);
                          setEditingFacCode(false);
                          setEditingTeamCodeId(null);
                          setEditingCeoPinId(null);
                        }}
                        className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                      >
                          <Plus size={24} className="rotate-45" />
                      </button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(selectedClass.teamCodes).map(([teamId, code], idx) => {
                              const teamObj = selectedClass.teams.find(t => t.id === teamId);
                              const teamName = teamObj?.name || `Team ${idx+1}`;
                              const ceoName = teamObj?.ceoName || 'Not Claimed';
                              const ceoPin = teamObj?.ceoPin || '';

                              const isEditingTeamCode = editingTeamCodeId === teamId;
                              const isEditingCeoPin = editingCeoPinId === teamId;

                              return (
                                  <div key={teamId} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 hover:border-blue-300 transition-all">
                                      <div className="flex justify-between items-center border-b pb-2">
                                          <div className="font-bold text-slate-800 flex items-center gap-2">
                                              <Users size={16} className="text-blue-500" />
                                              {teamName}
                                              {teamObj?.isArchived && (
                                                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">
                                                      Archived
                                                  </span>
                                              )}
                                          </div>
                                          {teamObj?.isArchived ? (
                                              <button
                                                  onClick={async () => {
                                                      if (confirm(`Restore "${teamName}" back to active simulation?`)) {
                                                          await restoreTeam(selectedClass.id, teamId);
                                                      }
                                                  }}
                                                  className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md font-bold transition-colors shadow-sm"
                                              >
                                                  Restore
                                              </button>
                                          ) : (
                                              <span className="text-xs text-slate-400 font-mono">ID: {teamId}</span>
                                          )}
                                      </div>

                                      {/* Team Access Code */}
                                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                                          <div>
                                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Team Access Code</span>
                                              {isEditingTeamCode ? (
                                                  <input 
                                                      type="text"
                                                      className="font-mono font-bold text-sm text-slate-800 px-2 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                      value={tempTeamCode}
                                                      onChange={(e) => setTempTeamCode(e.target.value.toUpperCase())}
                                                      autoFocus
                                                  />
                                              ) : (
                                                  <span className="font-mono font-bold text-base text-slate-800 tracking-wider">{code}</span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                              {isEditingTeamCode ? (
                                                  <>
                                                      <button 
                                                          onClick={async () => {
                                                              if (tempTeamCode.trim()) {
                                                                  await updateTeamCode(selectedClass.id, teamId, tempTeamCode.trim());
                                                              }
                                                              setEditingTeamCodeId(null);
                                                          }}
                                                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                                                          title="Save Team Code"
                                                      >
                                                          <Check size={14} />
                                                      </button>
                                                      <button 
                                                          onClick={() => setEditingTeamCodeId(null)}
                                                          className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                                                          title="Cancel"
                                                      >
                                                          <X size={14} />
                                                      </button>
                                                  </>
                                              ) : (
                                                  <>
                                                      <button 
                                                          onClick={() => {
                                                              setEditingTeamCodeId(teamId);
                                                              setTempTeamCode(code as string);
                                                          }}
                                                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors"
                                                          title="Edit Team Code"
                                                      >
                                                          <Edit2 size={14} />
                                                      </button>
                                                      <button 
                                                          onClick={() => copyToClipboard(code as string)}
                                                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors"
                                                          title="Copy Code"
                                                      >
                                                          {copiedCode === code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                      </button>
                                                  </>
                                              )}
                                          </div>
                                      </div>

                                      {/* CEO Name & PIN */}
                                      <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-100 flex items-center justify-between">
                                          <div>
                                              <span className="text-[10px] uppercase font-bold text-amber-700 block">
                                                  CEO: <strong className="text-slate-800">{ceoName}</strong>
                                              </span>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                  <Lock size={12} className="text-amber-600" />
                                                  {isEditingCeoPin ? (
                                                      <input 
                                                          type="text"
                                                          maxLength={4}
                                                          placeholder="4-digit PIN"
                                                          className="font-mono font-bold text-xs text-amber-900 px-2 py-0.5 border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white w-24"
                                                          value={tempCeoPin}
                                                          onChange={(e) => setTempCeoPin(e.target.value.replace(/\D/g, ''))}
                                                          autoFocus
                                                      />
                                                  ) : (
                                                      <span className="font-mono font-extrabold text-sm text-amber-900 tracking-widest">
                                                          {ceoPin || <span className="text-amber-500 font-normal italic text-xs">No PIN set</span>}
                                                      </span>
                                                  )}
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                              {isEditingCeoPin ? (
                                                  <>
                                                      <button 
                                                          onClick={async () => {
                                                              await updateTeamCeoPin(selectedClass.id, teamId, tempCeoPin.trim());
                                                              setEditingCeoPinId(null);
                                                          }}
                                                          className="p-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                                                          title="Save CEO PIN"
                                                      >
                                                          <Check size={14} />
                                                      </button>
                                                      <button 
                                                          onClick={() => setEditingCeoPinId(null)}
                                                          className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                                                          title="Cancel"
                                                      >
                                                          <X size={14} />
                                                      </button>
                                                  </>
                                              ) : (
                                                  <>
                                                      <button 
                                                          onClick={() => {
                                                              setEditingCeoPinId(teamId);
                                                              setTempCeoPin(ceoPin);
                                                          }}
                                                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors text-xs font-semibold flex items-center gap-1"
                                                          title="Edit CEO PIN"
                                                      >
                                                          <Edit2 size={13} />
                                                          <span>{ceoPin ? 'Edit PIN' : 'Set PIN'}</span>
                                                      </button>
                                                      {ceoPin && (
                                                          <button 
                                                              onClick={() => copyToClipboard(ceoPin)}
                                                              className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
                                                              title="Copy CEO PIN"
                                                          >
                                                              {copiedCode === ceoPin ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                          </button>
                                                      )}
                                                  </>
                                              )}
                                          </div>
                                      </div>

                                  </div>
                              );
                          })}
                      </div>

                      {/* Facilitator Access Code Section */}
                      <div className="pt-4 border-t border-slate-100">
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                              <div>
                                  <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                                      <Shield size={16} className="text-indigo-600" />
                                      Facilitator Access Code
                                  </h4>
                                  <p className="text-indigo-600 text-xs mt-1">Use this code to log in as a facilitator for this class.</p>
                              </div>
                              <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm">
                                  {editingFacCode ? (
                                      <div className="flex items-center gap-2">
                                          <input 
                                              type="text"
                                              className="font-mono font-bold text-indigo-700 text-base px-2 py-0.5 border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                              value={tempFacCode}
                                              onChange={(e) => setTempFacCode(e.target.value.toUpperCase())}
                                              autoFocus
                                          />
                                          <button 
                                              onClick={async () => {
                                                  if (tempFacCode.trim()) {
                                                      await updateClassFacilitatorCode(selectedClass.id, tempFacCode.trim());
                                                  }
                                                  setEditingFacCode(false);
                                              }}
                                              className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                                              title="Save Facilitator Code"
                                          >
                                              <Check size={16} />
                                          </button>
                                          <button 
                                              onClick={() => setEditingFacCode(false)}
                                              className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                                              title="Cancel"
                                          >
                                              <X size={16} />
                                          </button>
                                      </div>
                                  ) : (
                                      <>
                                          <span className="font-mono font-bold text-indigo-700 text-lg">{selectedClass.facilitatorCode}</span>
                                          <button 
                                              onClick={() => {
                                                  setEditingFacCode(true);
                                                  setTempFacCode(selectedClass.facilitatorCode);
                                              }}
                                              className="text-indigo-400 hover:text-indigo-700 transition-colors p-1"
                                              title="Change Facilitator Code"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                          <button 
                                              onClick={() => copyToClipboard(selectedClass.facilitatorCode)}
                                              className="text-indigo-300 hover:text-indigo-600 transition-colors p-1"
                                              title="Copy Code"
                                          >
                                              {copiedCode === selectedClass.facilitatorCode ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                          </button>
                                      </>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => {
                          setIsCodesModalOpen(false);
                          setEditingFacCode(false);
                          setEditingTeamCodeId(null);
                          setEditingCeoPinId(null);
                        }}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm"
                      >
                          Close
                      </button>
                  </div>
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
                  {modalConfig.type === 'deleteForever' && (
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

export default FacilitatorClasses;