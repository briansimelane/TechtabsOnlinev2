import React, { useState } from 'react';
import { Bell, User, ChevronDown, LogOut, Shield, Menu } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { Role } from '../types';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentRole, setRole, originalRole, currentTeam, currentUser, login, logout } = useSimulation();
  const navigate = useNavigate();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [modalError, setModalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (role: Role) => {
    setRole(role);
    if (role === 'STUDENT') {
      navigate('/dashboard');
    } else if (role === 'FACILITATOR') {
      navigate('/facilitator/classes');
    } else {
      navigate('/admin/dashboard');
    }
  };

  const handleElevateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setLoading(true);
    setModalError('');
    try {
      const result = await login(accessCode.trim());
      if (result.success) {
        setShowModal(false);
        setAccessCode('');
        if (result.role === 'FACILITATOR') {
          navigate('/facilitator/classes');
        } else if (result.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setModalError(result.message || 'Invalid access code');
      }
    } catch (err) {
      console.error('Role elevation failed', err);
      setModalError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-40">
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden outline-none transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <h2 className="text-base md:text-lg font-semibold text-slate-800">
              {currentRole === 'STUDENT' ? 'Team Portal' : currentRole === 'FACILITATOR' ? 'Facilitator Console' : 'Admin'}
          </h2>
        </div>

        <div className="flex items-center space-x-6">
          {originalRole && originalRole !== 'STUDENT' && (
            <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
                {(['STUDENT', 'FACILITATOR', 'ADMIN'] as Role[]).map((r) => {
                    if (r === 'ADMIN' && originalRole !== 'ADMIN') return null;
                    return (
                        <button
                            key={r}
                            onClick={() => handleRoleChange(r)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                currentRole === r 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {r.charAt(0) + r.slice(1).toLowerCase()}
                        </button>
                    );
                })}
            </div>
          )}

          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>

          {/* Profile Dropdown Trigger */}
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 border-l border-slate-200 pl-6 hover:opacity-80 transition-opacity outline-none"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-slate-900">{currentUser?.displayName || 'John Doe'}</p>
                <p className="text-xs text-slate-500">
                  {currentRole === 'STUDENT' ? `${currentTeam.name} CEO` : currentRole === 'FACILITATOR' ? 'Course Instructor' : 'Super Admin'}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 border border-blue-200">
                <User size={16} />
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Logged in as</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{currentUser?.email || 'student@demo.com'}</p>
                    <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-bold">
                      {originalRole || 'STUDENT'} Account
                    </span>
                  </div>

                  <div className="px-1 py-1">
                    {originalRole && originalRole !== 'STUDENT' && currentRole === 'STUDENT' && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleRoleChange(originalRole);
                        }}
                        className="flex w-full items-center px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Shield size={14} className="mr-2" />
                        Exit Student View
                      </button>
                    )}

                    {originalRole === 'STUDENT' && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setShowModal(true);
                        }}
                        className="flex w-full items-center px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Shield size={14} className="mr-2" />
                        Instructor Console
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 my-1"></div>

                  <div className="px-1 py-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="flex w-full items-center px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut size={14} className="mr-2" />
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Elevation Passcode Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => {
              if (!loading) {
                setShowModal(false);
                setAccessCode('');
                setModalError('');
              }
            }}
          ></div>
          
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center text-white">
              <h3 className="text-xl font-bold flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                Instructor Portal
              </h3>
              <p className="text-blue-100 text-xs mt-1">Enter your access code to switch to Facilitator or Admin mode</p>
            </div>

            <form onSubmit={handleElevateSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="modalCode" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  id="modalCode"
                  required
                  disabled={loading}
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setModalError('');
                  }}
                  placeholder="Enter Facilitator/Admin code"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase font-mono tracking-widest text-center text-lg text-slate-800 placeholder:normal-case placeholder:tracking-normal transition-all"
                />
                {modalError && (
                  <p className="mt-2 text-xs font-medium text-red-500 flex items-center">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {modalError}
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setShowModal(false);
                    setAccessCode('');
                    setModalError('');
                  }}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 transition-all outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 text-xs font-bold text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 transition-all outline-none"
                >
                  {loading ? 'Verifying...' : 'Elevate Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;