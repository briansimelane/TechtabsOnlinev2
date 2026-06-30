import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Factory, 
  Truck, 
  Users, 
  DollarSign, 
  FileText, 
  Settings,
  BrainCircuit,
  BarChart2,
  Presentation,
  GraduationCap,
  Library,
  ShieldAlert,
  Globe,
  X,
  ClipboardCheck
} from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { currentTeam, currentRole, classes, currentClassId } = useSimulation();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-medium'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const isStudent = currentRole === 'STUDENT';
  const isAdmin = currentRole === 'ADMIN';
  const currentClass = classes.find(c => c.id === currentClassId);

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}

      <div className={`w-64 bg-white text-slate-800 h-screen flex flex-col fixed top-0 overflow-y-auto border-r border-slate-200 z-50 transition-all duration-300 ${
        isOpen ? 'left-0' : '-left-64'
      } md:left-0`}>
        <div className="p-6 flex justify-between items-center border-b border-slate-100 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Techtabs
            </h1>
            <p className="text-xs text-slate-400 mt-1">Business Simulation v2.0</p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden outline-none transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              {isStudent && (
                <>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Current Team</p>
                  <p className="font-bold text-sm truncate mt-1 text-slate-800">{currentTeam.name}</p>
                  <div className="flex justify-between items-center mt-2">
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                          Period {currentTeam.currentPeriod}
                      </span>
                  </div>
                </>
              )}
              {!isStudent && !isAdmin && (
                <>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Simulation Status</p>
                  <p className="font-bold text-sm truncate mt-1 text-slate-800">
                      {currentClass ? currentClass.name : 'No Class Selected'}
                  </p>
                  {currentClass && (
                      <div className="flex justify-between items-center mt-2">
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium">
                              Round {currentClass.currentPeriod} Active
                          </span>
                      </div>
                  )}
                </>
              )}
              {isAdmin && (
                 <>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">System Status</p>
                  <p className="font-bold text-sm truncate mt-1 text-emerald-600 font-semibold">Operational</p>
                  <div className="mt-2 text-xs text-slate-400">
                      Logged in as Super Admin
                  </div>
                 </>
              )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {isStudent && (
            // --- STUDENT NAVIGATION ---
            <>
              <NavLink to="/dashboard" className={navItemClass} onClick={handleLinkClick}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </NavLink>

              <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Decisions
              </div>

              <NavLink to="/decisions/marketing" className={navItemClass} onClick={handleLinkClick}>
                <Target size={20} />
                <span>Marketing & Sales</span>
              </NavLink>
              <NavLink to="/decisions/operations" className={navItemClass} onClick={handleLinkClick}>
                <Factory size={20} />
                <span>Operations</span>
              </NavLink>
              <NavLink to="/decisions/procurement" className={navItemClass} onClick={handleLinkClick}>
                <Truck size={20} />
                <span>Procurement</span>
              </NavLink>
              <NavLink to="/decisions/hr" className={navItemClass} onClick={handleLinkClick}>
                <Users size={20} />
                <span>Human Resources</span>
              </NavLink>
              <NavLink to="/decisions/finance" className={navItemClass} onClick={handleLinkClick}>
                <DollarSign size={20} />
                <span>Finance</span>
              </NavLink>
              <NavLink to="/decisions/negotiations" className={navItemClass} onClick={handleLinkClick}>
                <BrainCircuit size={20} />
                <span>AI Negotiations</span>
              </NavLink>

              <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Analysis
              </div>

              <NavLink to="/reports" className={navItemClass} onClick={handleLinkClick}>
                <FileText size={20} />
                <span>Financial Reports</span>
              </NavLink>
              <NavLink to="/market-reports" className={navItemClass} onClick={handleLinkClick}>
                <BarChart2 size={20} />
                <span>Market Reports</span>
              </NavLink>
              {!currentClass?.hideSurvey && (
                <NavLink to="/survey" className={navItemClass} onClick={handleLinkClick}>
                  <ClipboardCheck size={20} />
                  <span>Team Dynamics Survey</span>
                </NavLink>
              )}
            </>
          )}
          
          {!isStudent && !isAdmin && (
            // --- FACILITATOR NAVIGATION ---
            <>
               <div className="pt-2 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Management
              </div>

              <NavLink to="/facilitator/classes" className={navItemClass} onClick={handleLinkClick}>
                <Library size={20} />
                <span>My Classes</span>
              </NavLink>

              <NavLink to="/facilitator/dashboard" className={navItemClass} onClick={handleLinkClick}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/facilitator/class" className={navItemClass} onClick={handleLinkClick}>
                <GraduationCap size={20} />
                <span>Class Management</span>
              </NavLink>

              <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Industry Data
              </div>

              <NavLink to="/market-reports" className={navItemClass} onClick={handleLinkClick}>
                <Presentation size={20} />
                <span>Industry Reports</span>
              </NavLink>
              
              <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Control
              </div>

              <NavLink to="/settings" className={navItemClass} onClick={handleLinkClick}>
                <Settings size={20} />
                <span>Sim Settings</span>
              </NavLink>
            </>
          )}

          {isAdmin && (
             // --- ADMIN NAVIGATION ---
             <>
                <div className="pt-2 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  System Overview
                </div>
                
                <NavLink to="/admin/dashboard" className={navItemClass} onClick={handleLinkClick}>
                  <LayoutDashboard size={20} />
                  <span>Admin Dashboard</span>
                </NavLink>

                <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  User Management
                </div>

                <NavLink to="/admin/facilitators" className={navItemClass} onClick={handleLinkClick}>
                  <Users size={20} />
                  <span>Facilitators</span>
                </NavLink>
                
                <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Simulation Control
                </div>

                <NavLink to="/admin/classes" className={navItemClass} onClick={handleLinkClick}>
                  <Globe size={20} />
                  <span>Global Classes</span>
                </NavLink>

                <NavLink to="/settings" className={navItemClass} onClick={handleLinkClick}>
                  <ShieldAlert size={20} />
                  <span>System Settings</span>
                </NavLink>
             </>
          )}
        </nav>

        {!isStudent && (
          <div className="p-4 border-t border-slate-100 mt-auto bg-slate-50/50">
            <NavLink 
              to="/settings" 
              onClick={handleLinkClick}
              className="flex items-center space-x-3 px-4 py-2 text-slate-500 hover:text-slate-900 rounded-lg transition-colors font-medium text-sm"
            >
              <Settings size={20} />
              <span>{isAdmin ? 'System Config' : 'Global Config'}</span>
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;