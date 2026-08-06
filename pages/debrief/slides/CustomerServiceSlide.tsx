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
      <div className="grid grid-cols-3 gap-8">
        {/* Headcount Chart */}
        <div className="col-span-2 bg-[#131C2E] border border-[#22304A] rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-[#E8EDF7] mb-4">CS Headcount vs Required</h3>
          <ResponsiveContainer width="100%" height={440}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22304A" vertical={false} />
              <XAxis dataKey="name" stroke="#8296B4" tick={{ fill: '#E8EDF7', fontSize: 18, fontWeight: 600 }} tickLine={false} />
              <YAxis stroke="#8296B4" tick={{ fill: '#8296B4', fontSize: 16 }} tickFormatter={(v) => formatDebriefUnits(v)} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1220', borderColor: '#22304A', borderRadius: '8px', color: '#E8EDF7', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any) => [formatDebriefUnits(Number(val)), 'Staff']}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '16px', fontWeight: 'bold' }} />
              <Bar dataKey="Actual CS Staff" fill="#37D9A4" radius={[6, 6, 0, 0]} isAnimationActive={true} />
              <Bar dataKey="Required CS Staff" fill="#FFC24C" radius={[6, 6, 0, 0]} isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Coverage Ratio Chart */}
        <div className="col-span-1 bg-[#131C2E] border border-[#22304A] rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-[#E8EDF7] mb-4">Coverage Ratio (Target 1.0)</h3>
          <ResponsiveContainer width="100%" height={440}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 30, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22304A" horizontal={false} />
              <XAxis type="number" stroke="#8296B4" domain={[0, 2]} tick={{ fill: '#8296B4', fontSize: 14 }} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="#8296B4" tick={{ fill: '#E8EDF7', fontSize: 16, fontWeight: 600 }} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1220', borderColor: '#22304A', borderRadius: '8px', color: '#E8EDF7', fontSize: '16px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any) => [`${val}×`, 'Coverage Ratio']}
              />
              <ReferenceLine x={1.0} stroke="#F2994A" strokeDasharray="3 3" strokeWidth={2} label={{ value: '1.0 Target', fill: '#F2994A', fontSize: 14, position: 'top' }} />
              <Bar dataKey="coverageRatio" fill="#9B8CFF" radius={[0, 6, 6, 0]} isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SlideFrame>
  );
};
