import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
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
  payroll: '#2563EB',
  marketing: '#D97706',
  store: '#059669',
  agents: '#7C3AED',
  training: '#E11D48',
  rd: '#EA580C',
  other: '#64748B'
};

export const OpexSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const o = t.record.opex;
    return {
      name: t.name,
      Payroll: o.payroll,
      Marketing: o.marketing,
      Store: o.store,
      Agents: o.agents,
      Training: o.training,
      'R&D': o.rd,
      Other: o.other,
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
          <BarChart data={chartData} margin={{ top: 25, right: 30, left: 30, bottom: 65 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
            <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => formatDebriefCurrency(v, true, false)} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any) => [formatDebriefCurrency(Number(val), true, true), '']}
            />
            <Legend wrapperStyle={{ paddingTop: '35px', fontSize: '18px', fontWeight: 'bold' }} />
            <Bar dataKey="Payroll" stackId="a" fill={OPEX_COLORS.payroll} isAnimationActive={true} />
            <Bar dataKey="Marketing" stackId="a" fill={OPEX_COLORS.marketing} isAnimationActive={true} />
            <Bar dataKey="Store" stackId="a" fill={OPEX_COLORS.store} isAnimationActive={true} />
            <Bar dataKey="Agents" stackId="a" fill={OPEX_COLORS.agents} isAnimationActive={true} />
            <Bar dataKey="Training" stackId="a" fill={OPEX_COLORS.training} isAnimationActive={true} />
            <Bar dataKey="R&D" stackId="a" fill={OPEX_COLORS.rd} isAnimationActive={true} />
            <Bar dataKey="Other" stackId="a" fill={OPEX_COLORS.other} radius={[6, 6, 0, 0]} isAnimationActive={true} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
