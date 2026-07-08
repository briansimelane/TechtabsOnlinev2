import React, { useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { Search, Plus, Mail, Shield, Trash2, Check, X, Clipboard } from 'lucide-react';
import { Facilitator, Administrator } from '../../types';

const UserManagement: React.FC = () => {
  const { facilitators, administrators = [], addFacilitator, removeFacilitator, addAdministrator, removeAdministrator } = useSimulation();
  const [activeTab, setActiveTab] = useState<'FACILITATOR' | 'ADMIN'>('FACILITATOR');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // New Form State
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      organization: '',
      status: 'Active' as 'Active' | 'Inactive',
      licenseType: 'Standard' as 'Standard' | 'Enterprise' | 'Trial'
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredFacilitators = facilitators.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.organization || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAdmins = administrators.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (activeTab === 'FACILITATOR') {
          addFacilitator({
              name: formData.name,
              email: formData.email,
              organization: formData.organization,
              status: formData.status,
              licenseType: formData.licenseType
          });
      } else {
          addAdministrator({
              name: formData.name,
              email: formData.email
          });
      }
      setIsModalOpen(false);
      setFormData({ name: '', email: '', organization: '', status: 'Active', licenseType: 'Standard' });
  };

  const handleDelete = (id: string) => {
      const typeLabel = activeTab === 'FACILITATOR' ? 'facilitator' : 'administrator';
      if (confirm(`Are you sure you want to remove this ${typeLabel}?`)) {
          if (activeTab === 'FACILITATOR') {
              removeFacilitator(id);
          } else {
              removeAdministrator(id);
          }
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage facilitator and administrator accounts and codes.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors"
        >
            <Plus size={18} className="mr-2" />
            Add {activeTab === 'FACILITATOR' ? 'Facilitator' : 'Administrator'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('FACILITATOR'); setSearchTerm(''); }}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'FACILITATOR' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Facilitators ({facilitators.length})
        </button>
        <button
          onClick={() => { setActiveTab('ADMIN'); setSearchTerm(''); }}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'ADMIN' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Administrators ({administrators.length})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder={`Search ${activeTab === 'FACILITATOR' ? 'facilitator' : 'administrator'}...`}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {activeTab === 'FACILITATOR' ? (
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Name / Email</th>
                          <th className="px-6 py-4">Access Code</th>
                          <th className="px-6 py-4">Organization</th>
                          <th className="px-6 py-4">License</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Joined</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredFacilitators.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{f.name}</div>
                                  <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                      <Mail size={12} className="mr-1" /> {f.email}
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  {f.accessCode ? (
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-bold">
                                        {f.accessCode}
                                      </span>
                                      <button 
                                        onClick={() => handleCopyCode(f.accessCode!)}
                                        className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                                        title="Copy Access Code"
                                      >
                                        {copiedCode === f.accessCode ? <Check size={14} className="text-emerald-600" /> : <Clipboard size={14} />}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">DEMO ACCOUNT</span>
                                  )}
                              </td>
                              <td className="px-6 py-4 text-slate-600">{f.organization}</td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                      f.licenseType === 'Enterprise' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                      f.licenseType === 'Standard' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                      'bg-amber-50 text-amber-700 border-amber-100'
                                  }`}>
                                      {f.licenseType}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                   <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      f.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                   }`}>
                                      {f.status}
                                   </span>
                              </td>
                              <td className="px-6 py-4 text-slate-500">{f.joinedDate}</td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                      <button 
                                        onClick={() => handleDelete(f.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {filteredFacilitators.length === 0 && (
                          <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                  No facilitators found.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Name / Email</th>
                          <th className="px-6 py-4">Access Code</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Joined</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredAdmins.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{a.name}</div>
                                  <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                      <Mail size={12} className="mr-1" /> {a.email}
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-bold">
                                      {a.accessCode}
                                    </span>
                                    <button 
                                      onClick={() => handleCopyCode(a.accessCode)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                                      title="Copy Access Code"
                                    >
                                      {copiedCode === a.accessCode ? <Check size={14} className="text-emerald-600" /> : <Clipboard size={14} />}
                                    </button>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                  System Admin
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-500">{a.joinedDate}</td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                      <button 
                                        onClick={() => handleDelete(a.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {filteredAdmins.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                  No administrators found.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
            )}
          </div>
      </div>

       {/* Create Modal */}
       {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800">Add New {activeTab === 'FACILITATOR' ? 'Facilitator' : 'Administrator'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                              <input 
                                  type="text" 
                                  required
                                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={formData.name}
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                              />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                              <input 
                                  type="email" 
                                  required
                                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={formData.email}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                              />
                          </div>
                          
                          {activeTab === 'FACILITATOR' && (
                            <>
                              <div className="col-span-2">
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                                  <input 
                                      type="text" 
                                      required
                                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={formData.organization}
                                      onChange={e => setFormData({...formData, organization: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">License Type</label>
                                  <select 
                                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={formData.licenseType}
                                      onChange={e => setFormData({...formData, licenseType: e.target.value as any})}
                                  >
                                      <option value="Standard">Standard</option>
                                      <option value="Enterprise">Enterprise</option>
                                      <option value="Trial">Trial</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                  <select 
                                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={formData.status}
                                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                                  >
                                      <option value="Active">Active</option>
                                      <option value="Inactive">Inactive</option>
                                  </select>
                              </div>
                            </>
                          )}
                      </div>
                      <div className="pt-6 flex justify-end space-x-3 border-t border-slate-100 mt-2">
                          <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                          >
                              Create Account
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default UserManagement;