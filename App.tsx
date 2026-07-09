import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Marketing from './pages/decisions/Marketing';
import Operations from './pages/decisions/Operations';
import Procurement from './pages/decisions/Procurement';
import HR from './pages/decisions/HR';
import Finance from './pages/decisions/Finance';
import FinancialReports from './pages/FinancialReports';
import MarketReports from './pages/MarketReports';
import FacilitatorDashboard from './pages/facilitator/FacilitatorDashboard';
import FacilitatorClasses from './pages/facilitator/FacilitatorClasses';
import ClassManagement from './pages/facilitator/ClassManagement';
import DecisionTable from './pages/facilitator/DecisionTable';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import GlobalClassManagement from './pages/admin/GlobalClassManagement';
import { SimulationProvider, useSimulation } from './contexts/SimulationContext';
import { Role } from './types';
import Survey from './pages/Survey';

// Placeholder components for other routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-slate-400">
    <div className="text-6xl mb-4">🚧</div>
    <h2 className="text-2xl font-bold">{title}</h2>
    <p className="mt-2">This module is under construction.</p>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentRole } = useSimulation();

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const { isAuthenticated } = useSimulation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/survey') {
      return <Navigate to="/login" replace />;
  }

  // Login page layout (no sidebar/header)
  if (location.pathname === '/login') {
      return <Login />;
  }

  // Survey page layout when not authenticated (no sidebar/header)
  if (!isAuthenticated && location.pathname === '/survey') {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 w-full">
              <Survey />
          </div>
      );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isSidebarCollapsed={sidebarCollapsed}
      />
      <main className={`flex-1 mt-16 p-4 md:p-8 overflow-y-auto w-full max-w-full overflow-x-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      }`}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Decision Routes */}
          <Route path="/decisions/marketing" element={<Marketing />} />
          <Route path="/decisions/operations" element={<Operations />} />
          <Route path="/decisions/procurement" element={<Procurement />} />
          <Route path="/decisions/hr" element={<HR />} />
          <Route path="/decisions/finance" element={<Finance />} />
          
          <Route path="/reports" element={<FinancialReports />} />
          <Route path="/market-reports" element={<MarketReports />} />
          <Route path="/survey" element={<Survey />} />
          
          {/* Facilitator Routes */}
          <Route path="/facilitator/classes" element={<ProtectedRoute allowedRoles={['FACILITATOR']}><FacilitatorClasses /></ProtectedRoute>} />
          <Route path="/facilitator/dashboard" element={<ProtectedRoute allowedRoles={['FACILITATOR']}><FacilitatorDashboard /></ProtectedRoute>} />
          <Route path="/facilitator/class" element={<ProtectedRoute allowedRoles={['FACILITATOR']}><ClassManagement /></ProtectedRoute>} />
          <Route path="/facilitator/decision-table" element={<ProtectedRoute allowedRoles={['FACILITATOR']}><DecisionTable /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/facilitators" element={<ProtectedRoute allowedRoles={['ADMIN']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['ADMIN']}><GlobalClassManagement /></ProtectedRoute>} />
          
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['FACILITATOR', 'ADMIN']}><Placeholder title="Settings" /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SimulationProvider>
      <Router>
        <AppLayout />
      </Router>
    </SimulationProvider>
  );
};

export default App;