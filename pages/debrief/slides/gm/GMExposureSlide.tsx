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
import { DebriefDataset } from '../../../../hooks/useDebriefData';
import { SlideFrame } from '../../components/SlideFrame';
import { CustomAxisTick } from '../../components/CustomAxisTick';
import { formatDebriefCurrency } from '../../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const GMExposureSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const exposures = t.record?.gm?.exposures || {};
    const usd = exposures['USD_COSTS']?.counterfactual ?? 0;
    const ngn = exposures['NGN_REVENUE']?.counterfactual ?? 0;
    const kes = exposures['KES_REVENUE']?.counterfactual ?? 0;

    return {
      name: t.name,
      'USD Procurement': Math.round(usd),
      'NGN Revenue': Math.round(ngn),
      'KES Revenue': Math.round(kes)
    };
  });

  return (
    <SlideFrame
      title="Net Open Position by Team"
      eyebrow="Currency Exposure"
      footer="Gross foreign currency exposures converted to ZAR: USD procurement obligations and regional revenue in NGN & KES"
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
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any) => [formatDebriefCurrency(Number(val), true, true), '']}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }} />
            <Bar dataKey="USD Procurement" fill="#3B82F6" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="NGN Revenue" fill="#10B981" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="KES Revenue" fill="#F59E0B" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
