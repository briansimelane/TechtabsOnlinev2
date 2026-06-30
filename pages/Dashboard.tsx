import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  PieChart 
} from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatNumber, formatPercent } from '../utils/numberFormat';

const Dashboard: React.FC = () => {
  const { lastPeriodKPIs, decisions } = useSimulation();

  const metrics = [
    { 
      label: 'Revenue (Last Period)', 
      value: `R ${formatNumber(lastPeriodKPIs.revenue / 1000000, 0)}M`, 
      change: '+12.50%', 
      isPositive: true,
      icon: DollarSign,
      color: 'bg-blue-500'
    },
    { 
      label: 'Net Profit', 
      value: `R ${formatNumber(lastPeriodKPIs.netProfit / 1000000, 0)}M`, 
      change: '+8.20%', 
      isPositive: true,
      icon: TrendingUp,
      color: 'bg-emerald-500'
    },
    { 
      label: 'Customer Satisfaction', 
      value: formatPercent(lastPeriodKPIs.customerSatisfaction, 2), 
      change: '-1.50%', 
      isPositive: false,
      icon: Users,
      color: 'bg-violet-500'
    },
    { 
      label: 'Planned Ad Spend', 
      value: `R ${formatNumber(decisions.marketing.advertisingBudget / 1000000, 0)}M`, 
      change: 'Current Period', 
      isPositive: true,
      icon: PieChart,
      color: 'bg-amber-500'
    },
  ];

  // Mock Data for charts
  const salesData = [
    { name: 'TechBook', sales: 4000, revenue: 12000000 },
    { name: 'Zroid', sales: 3000, revenue: 14400000 },
    { name: 'iTab', sales: 2000, revenue: 13000000 },
  ];

  const trendData = [
    { period: 'Y0', profit: 50 },
    { period: 'Y1', profit: 80 },
    { period: 'Y2', profit: 101 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Overview</h1>
          <p className="text-slate-500">Performance summary for Period 2</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Download Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{metric.value}</h3>
              </div>
              <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10 text-${metric.color.replace('bg-', '')}`}>
                <metric.icon size={20} className={metric.color.replace('bg-', 'text-')} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {metric.isPositive ? (
                <TrendingUp size={16} className="text-emerald-500 mr-1" />
              ) : (
                <TrendingDown size={16} className="text-rose-500 mr-1" />
              )}
              <span className={metric.isPositive ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                {metric.change}
              </span>
              <span className="text-slate-400 ml-2">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Product Performance (Revenue)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R ${formatNumber(value / 1000000, 0)}M`} />
                <Tooltip 
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`R ${formatNumber(value as number, 0)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Profit Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`R ${value}M`, 'Net Profit']}
                />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
