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
import { SlideFrame, PRODUCT_COLORS } from '../components/SlideFrame';
import { CustomAxisTick } from '../components/CustomAxisTick';
import { formatDebriefPercent } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const RevenueMixSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const tot = t.perf?.totalRevenue || 1;
    const tb = ((t.perf?.revenueByProduct?.techbook || 0) / tot) * 100;
    const zr = ((t.perf?.revenueByProduct?.zroid || 0) / tot) * 100;
    const it = ((t.perf?.revenueByProduct?.itab || 0) / tot) * 100;

    return {
      name: t.name,
      TechBook: Number(tb.toFixed(1)),
      Zroid: Number(zr.toFixed(1)),
      iTab: Number(it.toFixed(1))
    };
  });

  return (
    <SlideFrame
      title="Revenue Contribution per Product (%)"
      eyebrow="Portfolio Mix"
      footer="100% Stacked revenue distribution by product line for each team"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 30, left: 30, bottom: 65 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
            <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any) => [formatDebriefPercent(Number(val)), '']}
            />
            <Legend wrapperStyle={{ paddingTop: '35px', fontSize: '20px', fontWeight: 'bold' }} />
            <Bar dataKey="TechBook" stackId="a" fill={PRODUCT_COLORS.techbook} isAnimationActive={false} animationDuration={0}>
              <LabelList
                dataKey="TechBook"
                position="inside"
                formatter={(v: any) => (Number(v) > 4 ? `${v}%` : '')}
                style={{ fill: '#FFFFFF', fontSize: '18px', fontWeight: 800, fontFamily: 'IBM Plex Mono' }}
              />
            </Bar>
            <Bar dataKey="Zroid" stackId="a" fill={PRODUCT_COLORS.zroid} isAnimationActive={false} animationDuration={0}>
              <LabelList
                dataKey="Zroid"
                position="inside"
                formatter={(v: any) => (Number(v) > 4 ? `${v}%` : '')}
                style={{ fill: '#FFFFFF', fontSize: '18px', fontWeight: 800, fontFamily: 'IBM Plex Mono' }}
              />
            </Bar>
            <Bar dataKey="iTab" stackId="a" fill={PRODUCT_COLORS.itab} radius={[6, 6, 0, 0]} isAnimationActive={false} animationDuration={0}>
              <LabelList
                dataKey="iTab"
                position="inside"
                formatter={(v: any) => (Number(v) > 4 ? `${v}%` : '')}
                style={{ fill: '#FFFFFF', fontSize: '18px', fontWeight: 800, fontFamily: 'IBM Plex Mono' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
