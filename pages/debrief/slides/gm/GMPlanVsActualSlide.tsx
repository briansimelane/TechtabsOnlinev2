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
import { DebriefDataset } from '../../../../hooks/useDebriefData';
import { SlideFrame } from '../../components/SlideFrame';
import { CustomAxisTick } from '../../components/CustomAxisTick';
import { formatDebriefCurrency, formatDebriefPercent } from '../../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const GMPlanVsActualSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const planned = t.record?.gm?.scorecard?.plannedNetProfit ?? t.draftDecisions?.treasury?.plannedNetProfit ?? 0;
    const actual = t.record?.netProfit ?? 0;
    const score = t.record?.gm?.scorecard?.planVariance ?? (
      planned !== 0 ? Math.max(0, 1 - Math.abs(actual - planned) / Math.max(Math.abs(planned), 1)) : 0
    );

    return {
      name: t.name,
      'Planned Net Profit': Math.round(planned),
      'Actual Net Profit': Math.round(actual),
      deliveryScore: score
    };
  });

  return (
    <SlideFrame
      title="Delivery Against Plan"
      eyebrow="Strategic Execution"
      footer="Period 1 Committed Target vs. Actual Net Profit delivered. Plan Delivery contributes 25% to overall championship scoring."
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 30, left: 30, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
            <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => formatDebriefCurrency(v, true, false)} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="#94A3B8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any, name: any) => [formatDebriefCurrency(Number(val), true, true), name]}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }} />
            <Bar dataKey="Planned Net Profit" fill="#64748B" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="Actual Net Profit" fill="#2563EB" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
