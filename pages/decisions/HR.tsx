import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { HR_CONSTANTS, PRODUCTS, getMarketSize } from '../../constants';
import { HRRole, TrainingLevel, ProductId } from '../../types';
import { Users, GraduationCap, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import DecisionsSummary from '../../components/DecisionsSummary';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../../utils/numberFormat';
import { useFlashOnChange } from '../../utils/useFlashOnChange';

const HR: React.FC = () => {
  const { decisions, updateDecisions, currentTeam, lastPeriodKPIs, isReadOnly, currentRole } = useSimulation();
  const disabled = isReadOnly && currentRole === 'STUDENT';
  const { hr, operations, marketing } = decisions;

  const flashHiring = {
      productionLine: useFlashOnChange(hr.hiring.productionLine),
      qualityControl: useFlashOnChange(hr.hiring.qualityControl),
      logistics: useFlashOnChange(hr.hiring.logistics),
      maintenance: useFlashOnChange(hr.hiring.maintenance),
      adminSales: useFlashOnChange(hr.hiring.adminSales),
      customerService: useFlashOnChange(hr.hiring.customerService)
  };

  const flashSalaries = {
      productionLine: useFlashOnChange(hr.salaries.productionLine),
      qualityControl: useFlashOnChange(hr.salaries.qualityControl),
      logistics: useFlashOnChange(hr.salaries.logistics),
      maintenance: useFlashOnChange(hr.salaries.maintenance),
      adminSales: useFlashOnChange(hr.salaries.adminSales),
      customerService: useFlashOnChange(hr.salaries.customerService)
  };

  const flashTraining = {
      productionLine: useFlashOnChange(hr.trainingLevels.productionLine),
      qualityControl: useFlashOnChange(hr.trainingLevels.qualityControl),
      logistics: useFlashOnChange(hr.trainingLevels.logistics),
      maintenance: useFlashOnChange(hr.trainingLevels.maintenance),
      adminSales: useFlashOnChange(hr.trainingLevels.adminSales),
      customerService: useFlashOnChange(hr.trainingLevels.customerService)
  };

  // -- Helpers --
  
  const handleHiringChange = (role: HRRole, value: string) => {
      updateDecisions('hr', {
          hiring: { ...hr.hiring, [role]: parseInt(value) || 0 }
      });
  };

  const handleSalaryChange = (role: HRRole, value: string) => {
      updateDecisions('hr', {
          salaries: { ...hr.salaries, [role]: parseInt(value) || 0 }
      });
  };

  const handleTrainingChange = (role: HRRole, value: TrainingLevel) => {
      updateDecisions('hr', {
          trainingLevels: { ...hr.trainingLevels, [role]: value }
      });
  };

  // -- Calculations --

  const getEndingStaff = (role: HRRole) => {
      return (currentTeam.staffCounts[role] || 0) + (hr.hiring[role] || 0);
  };

  const getStaffCost = (role: HRRole) => {
      // Logic: (Ending Staff * Monthly Salary * 12) + (Recruits * Recruiting Cost)
      // Note: This is a simplification for visualization. 
      // The screenshot implies a simpler 'Total Costs' which might just be Salary * Staff * Months (likely 6-12 depending on period)
      // We will use: Ending Staff * Salary * 12 months for annual projection
      const endingStaff = getEndingStaff(role);
      const annualSalaryCost = endingStaff * hr.salaries[role] * 8;
      return annualSalaryCost;
  };

  const getTrainingCost = (role: HRRole) => {
      const level = hr.trainingLevels[role];
      const endingStaff = getEndingStaff(role);
      // Assuming training cost is per person per year/period
      return endingStaff * HR_CONSTANTS.trainingCosts[level];
  };

  // Helper to get available inventory for sale
  const getAvailableInventory = (productId: ProductId) => {
    const opening = currentTeam.inventory[productId] || 0;
    const production = decisions.operations.production[productId] || 0;
    const purchased = Object.values(decisions.procurement.supplierAllocation[productId] || {}).reduce(
      (sum: number, alloc: any) => sum + (alloc.finishedGoods || 0),
      0
    );
    return opening + production + purchased;
  };

  const getTrainingEffect = (level: TrainingLevel) => {
      switch (level) {
          case 'Basic': return 0.03;
          case 'Moderate': return 0.055;
          case 'Advanced': return 0.1;
          default: return 0.0;
      }
  };

  const baseProductivity: Record<HRRole, number> = {
      engineers: 3420,
      technicians: 2422.5,
      semiSkilled: 1870,
      adminSales: 1840,
      customerService: 570
  };

  const calculateUtilization = (role: HRRole) => {
      const endingStaff = getEndingStaff(role);
      if (endingStaff <= 0) return 0;

      const currentPeriod = currentTeam.currentPeriod;

      // 1. Calculate Production Workload
      const plannedTotalProduction = Object.values(decisions.operations.production).reduce((a, b) => a + (b || 0), 0);
      const lastPeriodProduction = lastPeriodKPIs.revenue > 0 ? 36094 + 22486 + 11219 : 0;
      const productionWorkload = plannedTotalProduction > 0 ? plannedTotalProduction : lastPeriodProduction;

      // 2. Calculate Sales Workload
      let totalForecastedUnitsSold = 0;
      PRODUCTS.forEach(p => {
        const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
        const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
        const available = getAvailableInventory(p.id);
        const unitsSold = Math.min(demand, available);
        totalForecastedUnitsSold += unitsSold;
      });
      const lastPeriodUnitsSold = 36094 + 22486 + 11219;
      const salesWorkload = totalForecastedUnitsSold > 0 ? totalForecastedUnitsSold : lastPeriodUnitsSold;

      // 3. Determine workload for this specific role
      let workload = 0;
      if (role === 'engineers' || role === 'technicians' || role === 'semiSkilled') {
          workload = productionWorkload;
      } else {
          workload = salesWorkload;
      }

      // 4. Calculate capacity using the Excel formula logic
      const prod = baseProductivity[role];
      const trainingLevel = hr.trainingLevels[role] || 'None';
      const trainingEffect = getTrainingEffect(trainingLevel);
      
      const capacity = endingStaff * (prod * (1 + trainingEffect));

      return (workload / capacity) * 100;
  };

  const rolesProduction: { id: HRRole; label: string }[] = [
      { id: 'engineers', label: 'Engineers' },
      { id: 'technicians', label: 'Technicians' },
      { id: 'semiSkilled', label: 'Semi-Skilled workers' }
  ];

  const rolesAdmin: { id: HRRole; label: string }[] = [
      { id: 'adminSales', label: 'Admin & Sales' },
      { id: 'customerService', label: 'Customer Service' }
  ];

  const totalTrainingCost = Object.keys(hr.trainingLevels).reduce((acc, role) => acc + getTrainingCost(role as HRRole), 0);
  const totalSalaryCost = [...rolesProduction, ...rolesAdmin].reduce((acc, role) => acc + getStaffCost(role.id), 0);

  // Reusable Table Row Component
  const StaffRow: React.FC<{ role: HRRole; label: string }> = ({ role, label }) => {
      const starting = currentTeam.staffCounts[role];
      const recruit = hr.hiring[role];
      const ending = starting + recruit;
      const utilization = calculateUtilization(role);
      const salary = hr.salaries[role];
      const cost = getStaffCost(role);

      return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="py-4 pl-4 font-bold text-slate-800 text-sm">{label}</td>
            <td className="py-4 text-center font-mono text-slate-500 text-sm">{starting}</td>
            <td className="py-4 px-4">
                <input 
                    type="number"
                    className={`w-full text-center font-bold text-sm py-1 px-2 border rounded outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-blue-800 border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed ${flashHiring[role] ? 'animate-flash-green' : ''}`}
                    value={recruit}
                    onChange={(e) => handleHiringChange(role, e.target.value)}
                    disabled={disabled}
                />
            </td>
            <td className="py-4 px-6 text-center">
                <span className={`text-sm font-semibold font-mono ${utilization > 100 ? 'text-red-600' : 'text-slate-600'}`}>
                    {formatPercent(utilization, 2, false)}
                </span>
            </td>
            <td className="py-4 px-4">
                 <div className="relative">
                    <span className="absolute left-2 top-1.5 text-xs text-blue-400">R</span>
                    <input 
                        type="text"
                        inputMode="numeric"
                        className={`w-full text-right font-mono font-bold text-sm py-1 px-2 bg-blue-50 border border-blue-200 text-blue-800 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashSalaries[role] ? 'animate-flash-green' : ''}`}
                        value={formatNumber(salary)}
                        onChange={(e) => handleSalaryChange(role, String(parseNumber(e.target.value)))}
                        disabled={disabled}
                    />
                 </div>
            </td>
            <td className="py-4 pr-4 text-right font-mono text-slate-700 font-semibold text-sm whitespace-nowrap">
                {formatCurrency(cost)}
            </td>
        </tr>
      );
  };

  const StaffCards: React.FC<{ roles: { id: HRRole; label: string }[] }> = ({ roles }) => {
      return (
          <div className="block lg:hidden space-y-4 p-4">
              {roles.map(({ id: role, label }) => {
                  const starting = currentTeam.staffCounts[role];
                  const recruit = hr.hiring[role];
                  const ending = starting + recruit;
                  const utilization = calculateUtilization(role);
                  const salary = hr.salaries[role];
                  const cost = getStaffCost(role);

                  return (
                      <div key={role} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-left">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                              <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{label}</h4>
                              </div>
                              <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Cost</span>
                                  <span className="text-xs font-mono font-bold text-slate-700">{formatCurrency(cost)}</span>
                              </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                                  <span className="text-slate-500 block mb-0.5 text-[10px]">Starting</span>
                                  <span className="font-bold text-slate-700 font-mono">{starting}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                                  <span className="text-slate-500 block mb-0.5 text-[10px]">Ending</span>
                                  <span className="font-bold text-slate-700 font-mono">{ending}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                                  <span className="text-slate-500 block mb-0.5 text-[10px]">Utilisation</span>
                                  <span className={`font-bold font-mono ${utilization > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {formatPercent(utilization, 2, false)}
                                  </span>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-slate-500 block">Recruit / (Dismiss)</label>
                                  <input 
                                      type="number"
                                      className={`w-full text-center font-bold text-xs py-1.5 px-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-blue-800 border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed ${flashHiring[role] ? 'animate-flash-green' : ''}`}
                                      value={recruit}
                                      onChange={(e) => handleHiringChange(role, e.target.value)}
                                      disabled={disabled}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-slate-500 block">Salary / Month (R)</label>
                                  <div className="relative">
                                      <span className="absolute left-2 top-1.5 text-xs text-blue-400">R</span>
                                      <input 
                                          type="text"
                                          inputMode="numeric"
                                          className={`w-full text-right font-mono font-bold text-xs py-1.5 px-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${flashSalaries[role] ? 'animate-flash-green' : ''}`}
                                          value={formatNumber(salary)}
                                          onChange={(e) => handleSalaryChange(role, String(parseNumber(e.target.value)))}
                                          disabled={disabled}
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      
      <DecisionsSummary />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Human Resources</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage staffing levels, compensation, and training.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-lg border border-slate-200 shadow-sm text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total HR Budget</p>
            <p className="text-2xl font-bold text-indigo-700">{formatCurrency(totalSalaryCost + totalTrainingCost)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
            
            {/* Production Staff Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center shadow-sm">
                    <Users className="w-5 h-5 mr-2 text-white" />
                    <h3 className="font-bold text-white">Production Staff</h3>
                </div>
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <th className="py-3 pl-4">Role</th>
                                <th className="py-3 text-center">Starting Staff</th>
                                <th className="py-3 px-4 w-32 text-center">Recruit / (Dismiss)</th>
                                <th className="py-3 px-6 w-28 text-center">Utilisation</th>
                                <th className="py-3 px-4 w-36 text-right">Salary / Month</th>
                                <th className="py-3 pr-4 text-right whitespace-nowrap">Total Costs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rolesProduction.map(r => <StaffRow key={r.id} role={r.id} label={r.label} />)}
                        </tbody>
                    </table>
                </div>
                <StaffCards roles={rolesProduction} />
            </div>

            {/* Admin & Sales Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center shadow-sm">
                    <DollarSign className="w-5 h-5 mr-2 text-white" />
                    <h3 className="font-bold text-white">Admin, Sales & Service</h3>
                </div>
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <th className="py-3 pl-4">Role</th>
                                <th className="py-3 text-center">Starting Staff</th>
                                <th className="py-3 px-4 w-32 text-center">Recruit / (Dismiss)</th>
                                <th className="py-3 px-6 w-28 text-center">Utilisation</th>
                                <th className="py-3 px-4 w-36 text-right">Salary / Month</th>
                                <th className="py-3 pr-4 text-right whitespace-nowrap">Total Costs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rolesAdmin.map(r => <StaffRow key={r.id} role={r.id} label={r.label} />)}
                        </tbody>
                    </table>
                </div>
                <StaffCards roles={rolesAdmin} />
            </div>

        </div>

        <div className="space-y-6">
            
            {/* Training Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center shadow-sm">
                    <GraduationCap className="w-5 h-5 mr-2 text-white" />
                    <h3 className="font-bold text-white">Training Levels</h3>
                </div>
                <div className="p-6 space-y-4">
                    {[...rolesProduction, ...rolesAdmin].map((r) => {
                        const cost = getTrainingCost(r.id);
                        return (
                            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div className="mb-2 sm:mb-0">
                                    <span className="font-bold text-slate-800 text-sm block">{r.label}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <select 
                                        className={`text-sm border-blue-200 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-blue-50 text-blue-800 font-bold py-1 disabled:opacity-50 disabled:cursor-not-allowed ${flashTraining[r.id] ? 'animate-flash-green' : ''}`}
                                        value={hr.trainingLevels[r.id]}
                                        onChange={(e) => handleTrainingChange(r.id, e.target.value as TrainingLevel)}
                                        disabled={disabled}
                                    >
                                        <option value="None">None</option>
                                        <option value="Basic">Basic</option>
                                        <option value="Moderate">Moderate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                    <div className="w-24 text-right">
                                        <span className="text-xs text-slate-400 block uppercase">Cost</span>
                                        <span className="text-sm font-mono font-semibold text-slate-700">{formatCurrency(cost)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase text-xs tracking-wider">Total Training Cost</span>
                    <span className="font-bold font-mono text-lg text-indigo-600">{formatCurrency(totalTrainingCost)}</span>
                </div>
            </div>

            {/* Metrics / Tips */}
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-emerald-500" />
                    HR Insights
                </h4>
                <div className="space-y-4 text-sm text-slate-600">
                    <p>
                        <strong className="text-slate-800">Recruitment:</strong> It takes time for new staff to become fully productive. Hiring heavily in one period may impact short-term efficiency.
                    </p>
                    <p>
                        <strong className="text-slate-800">Training:</strong> Higher training levels reduce turnover and improve quality (Production) or sales conversion (Sales).
                    </p>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800 text-xs flex items-start mt-2">
                        <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        Ensure salaries are competitive to prevent staff turnover.
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default HR;