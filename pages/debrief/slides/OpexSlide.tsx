import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { CustomAxisTick } from '../components/CustomAxisTick';
import { formatDebriefCurrency } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

const OPEX_COLORS = {
  marketing: '#D97706',
  store: '#059669',
  payroll: '#2563EB',
  rd: '#EA580C',
  agents: '#7C3AED',
  training: '#E11D48',
  other: '#64748B'
};

export const OpexSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const o = t.perf?.opex || {
      marketing: 0,
      store: 0,
      payroll: 0,
      rd: 0,
      agents: 0,
      training: 0,
      other: 0,
      total: 0
    };

    return {
      name: t.name,
      'Advertising & Marketing': o.marketing,
      'Store Costs': o.store,
      'Payroll (Salaries)': o.payroll,
      'R & D (Innovation)': o.rd,
      'Agent Commissions': o.agents,
      'Staff Development (Training)': o.training,
      'Other Operational Expenses': o.other,
      total: o.total
    };
  });

  return (
    <SlideFrame
      title="Operating Expenses Breakdown"
      eyebrow="Cost Management"
      footer="Stacked operating expenses by cost category for each team"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 35, right: 30, left: 30, bottom: 65 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
            <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => formatDebriefCurrency(v, true, false)} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any) => [formatDebriefCurrency(Number(val), true, true), '']}
            />
            <Legend wrapperStyle={{ paddingTop: '35px', fontSize: '16px', fontWeight: 'bold' }} />
            <Bar dataKey="Advertising & Marketing" stackId="a" fill={OPEX_COLORS.marketing} isAnimationActive={true} />
            <Bar dataKey="Store Costs" stackId="a" fill={OPEX_COLORS.store} isAnimationActive={true} />
            <Bar dataKey="Payroll (Salaries)" stackId="a" fill={OPEX_COLORS.payroll} isAnimationActive={true} />
            <Bar dataKey="R & D (Innovation)" stackId="a" fill={OPEX_COLORS.rd} isAnimationActive={true} />
            <Bar dataKey="Agent Commissions" stackId="a" fill={OPEX_COLORS.agents} isAnimationActive={true} />
            <Bar dataKey="Staff Development (Training)" stackId="a" fill={OPEX_COLORS.training} isAnimationActive={true} />
            <Bar dataKey="Other Operational Expenses" stackId="a" fill={OPEX_COLORS.other} radius={[6, 6, 0, 0]} isAnimationActive={true}>
              <LabelList
                dataKey="total"
                position="top"
                formatter={(v: any) => formatDebriefCurrency(Number(v), true, false)}
                style={{ fill: '#0F172A', fontSize: '16px', fontWeight: 800, fontFamily: 'IBM Plex Mono' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
