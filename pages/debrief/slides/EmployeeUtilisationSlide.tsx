import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { CustomAxisTick } from '../components/CustomAxisTick';
import { HRRole } from '../../../types';
import CONFIG from '../../../resources/config.json';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

const staffToConfigKey: Record<HRRole, string> = {
  engineers: 'Engineers',
  technicians: 'Technicians',
  semiSkilled: 'Semi-Skilled',
  adminSales: 'Admin & Sales',
  customerService: 'Customer Service'
};

const getRoleCapacity = (r: HRRole, count: number, level: string) => {
  const configKey = staffToConfigKey[r];
  const baseUnits = (CONFIG as any).employee_productivity?.[configKey]?.base_units_per_employee || 1000;
  const trainingEffect = (CONFIG as any).training_programs?.[level]?.productivity_effect || 0;
  return Math.floor(count * baseUnits * (1 + trainingEffect));
};

const getBandColor = (utilPct: number) => {
  if (utilPct < 80) return '#94A3B8'; // idle (slate)
  if (utilPct <= 110) return '#059669'; // healthy (emerald)
  return '#E11D48'; // over-stretched (rose)
};

export const EmployeeUtilisationSlide: React.FC<SlideProps> = ({
  dataset,
  currentSlide,
  totalSlides
}) => {
  const chartData = dataset.teams.map(t => {
    const perf = t.perf;
    const staff = perf?.staffCounts || { engineers: 50, technicians: 150, semiSkilled: 200, adminSales: 40, customerService: 20 };
    const train = perf?.trainingLevels || { engineers: 'None', technicians: 'None', semiSkilled: 'None', adminSales: 'None', customerService: 'None' };

    const prodCap = getRoleCapacity('technicians', staff.technicians, train.technicians) +
                    getRoleCapacity('semiSkilled', staff.semiSkilled, train.semiSkilled);
    const engCap = getRoleCapacity('engineers', staff.engineers, train.engineers);
    const adminCap = getRoleCapacity('adminSales', staff.adminSales, train.adminSales);
    const csCap = getRoleCapacity('customerService', staff.customerService, train.customerService);

    const unitsProd = perf?.unitsProduced ?? 0;
    const unitsSold = perf?.unitsSold ?? 0;

    const prodUtil = prodCap > 0 ? (unitsProd / prodCap) * 100 : 0;
    const engUtil = engCap > 0 ? (unitsSold / engCap) * 100 : 0;
    const adminUtil = adminCap > 0 ? (unitsSold / adminCap) * 100 : 0;
    const csUtil = csCap > 0 ? (unitsSold / csCap) * 100 : 0;

    return {
      name: t.name,
      'Production Staff': Number(prodUtil.toFixed(1)),
      Engineers: Number(engUtil.toFixed(1)),
      'Admin & Sales': Number(adminUtil.toFixed(1)),
      'Customer Service': Number(csUtil.toFixed(1))
    };
  });

  const seriesKeys: ('Production Staff' | 'Engineers' | 'Admin & Sales' | 'Customer Service')[] = [
    'Production Staff',
    'Engineers',
    'Admin & Sales',
    'Customer Service'
  ];

  return (
    <SlideFrame
      title="Employee Capacity & Utilisation (%)"
      eyebrow="Human Resources & Productivity"
      footer="Production staff measured against units produced · Support staff against units sold · Capacity = headcount × base output × training uplift"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">
        <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 30, right: 30, left: 30, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
              <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => `${v}%`} domain={[0, 150]} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any) => [`${val}%`, 'Utilisation']}
              />
              <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Full Utilisation (100%)', fill: '#475569', fontSize: 14, fontWeight: 700, position: 'top' }} />

              {seriesKeys.map((key) => (
                <Bar key={key} dataKey={key} radius={[4, 4, 0, 0]} isAnimationActive={true}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBandColor((entry as any)[key])} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for Utilisation Status Bands & Roles */}
        <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200 px-6 py-3 rounded-xl shadow-xs text-sm font-medium">
          <div className="flex items-center gap-6">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Role Series:</span>
            {seriesKeys.map(key => (
              <span key={key} className="text-slate-700 font-semibold">{key}</span>
            ))}
          </div>
          <div className="flex items-center gap-5 font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-400 inline-block" />
              <span className="text-slate-600">&lt; 80% Under-utilised</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block" />
              <span className="text-emerald-700">80–110% Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-600 inline-block" />
              <span className="text-rose-700">&gt; 110% Over-stretched</span>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
};
