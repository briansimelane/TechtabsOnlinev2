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
import { formatDebriefCurrency } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

const OPEX_COLORS = {
  payroll: '#4CC3FF',
  marketing: '#FFC24C',
  store: '#37D9A4',
  agents: '#9B8CFF',
  training: '#FF6B8A',
  rd: '#FF9560',
  other: '#8296B4'
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
      <div className="w-full bg-[#131C2E] border border-[#22304A] rounded-2xl p-8 shadow-2xl">
        <ResponsiveContainer width="100%" height={520}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#22304A" vertical={false} />
            <XAxis dataKey="name" stroke="#8296B4" tick={{ fill: '#E8EDF7', fontSize: 22, fontWeight: 600 }} tickLine={false} />
            <YAxis stroke="#8296B4" tick={{ fill: '#8296B4', fontSize: 18 }} tickFormatter={(v) => formatDebriefCurrency(v, true)} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0B1220', borderColor: '#22304A', borderRadius: '8px', color: '#E8EDF7', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any) => [formatDebriefCurrency(Number(val)), '']}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '18px', fontWeight: 'bold' }} />
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
