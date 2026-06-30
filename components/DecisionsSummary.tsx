import React from 'react';
import { DollarSign, TrendingUp, Users, Smile, Percent } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { formatNumber, formatPercent } from '../utils/numberFormat';

const DecisionsSummary: React.FC = () => {
  const { lastPeriodKPIs, currentTeam } = useSimulation();

  // ROE Calculation: Net Profit / Total Equity (Opening Equity of current period)
  const roe = currentTeam.shareholdersEquity !== 0 
    ? (lastPeriodKPIs.netProfit / currentTeam.shareholdersEquity) * 100 
    : 0;

  const metrics = [
    { 
      label: 'Revenue', 
      value: `R ${formatNumber(lastPeriodKPIs.revenue / 1000000, 0)}M`, 
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: 'Net Profit', 
      value: `R ${formatNumber(lastPeriodKPIs.netProfit / 1000000, 0)}M`, 
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      label: 'Cust. Satisfaction', 
      value: formatPercent(lastPeriodKPIs.customerSatisfaction, 2), 
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50'
    },
    { 
      label: 'Emp. Satisfaction', 
      value: formatPercent(lastPeriodKPIs.employeeSatisfaction, 2), 
      icon: Smile,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      label: 'ROE', 
      value: formatPercent(roe, 2, false), 
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{metric.label}</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{metric.value}</p>
          </div>
          <div className={`p-2 rounded-lg ${metric.bg} ${metric.color}`}>
            <metric.icon size={18} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DecisionsSummary;