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
  ReferenceLine
} from 'recharts';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { formatDebriefUnits } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const CustomerServiceSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const actualCS = t.record.staffCounts?.customerService || 20;
    const requiredCS = t.record.requiredCS || 20;
    const coverageRatio = Number((actualCS / (requiredCS || 1)).toFixed(2));

    return {
      name: t.name,
      'Actual CS Staff': actualCS,
      'Required CS Staff': requiredCS,
      coverageRatio
    };
  });

  return (
    <SlideFrame
      title="Customer Service Headcount vs Requirement"
      eyebrow="Operations & Service Quality"
      footer="Comparison of actual customer service staff against workload requirements (1 staff per 1,000 units sold)"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="grid grid-cols-3 gap-6 w-full h-full flex-1 min-h-0">
        {/* Headcount Chart */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center min-h-0 h-full">
          <h3 className="text-xl font-bold text-slate-900 mb-2 shrink-0">CS Headcount vs Required</h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" interval={0} tick={{ fill: '#0F172A', fontSize: 18, fontWeight: 700 }} tickLine={false} />
              <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 16, fontWeight: 600 }} tickFormatter={(v) => formatDebriefUnits(v)} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any) => [formatDebriefUnits(Number(val)), 'Staff']}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '16px', fontWeight: 'bold' }} />
              <Bar dataKey="Actual CS Staff" fill="#059669" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Required CS Staff" fill="#D97706" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Coverage Ratio Chart */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center min-h-0 h-full">
          <h3 className="text-xl font-bold text-slate-900 mb-2 shrink-0">Coverage Ratio (Target 1.0)</h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 30, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" stroke="#64748B" domain={[0, 2]} tick={{ fill: '#64748B', fontSize: 14 }} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="#64748B" interval={0} tick={{ fill: '#0F172A', fontSize: 16, fontWeight: 700 }} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '16px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any) => [`${val}×`, 'Coverage Ratio']}
              />
              <ReferenceLine x={1.0} stroke="#EA580C" strokeDasharray="3 3" strokeWidth={2} label={{ value: '1.0 Target', fill: '#EA580C', fontSize: 14, position: 'top', fontWeight: 700 }} />
              <Bar dataKey="coverageRatio" fill="#7C3AED" radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
};
