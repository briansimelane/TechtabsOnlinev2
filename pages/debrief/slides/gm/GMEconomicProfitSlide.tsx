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
import { formatDebriefCurrency } from '../../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const GMEconomicProfitSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const byMarket = t.record?.gm?.byMarket || {};
    const zaEP = byMarket['za']?.economicProfit ?? 0;
    const ngEP = byMarket['ng']?.economicProfit ?? 0;
    const keEP = byMarket['ke']?.economicProfit ?? 0;

    return {
      name: t.name,
      'South Africa (ZA)': Math.round(zaEP),
      'Nigeria (NG)': Math.round(ngEP),
      'Kenya (KE)': Math.round(keEP)
    };
  });

  return (
    <SlideFrame
      title="Economic Profit by Market"
      eyebrow="Value Creation"
      footer="Stacked by territory: NOPAT minus capital charge (IC × WACC). Negative values render below the axis, exposing value-destroying operations."
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
            <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any, name: any) => [formatDebriefCurrency(Number(val), true, true), name]}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }} />
            <Bar dataKey="South Africa (ZA)" stackId="a" fill="#2563EB" isAnimationActive={false} />
            <Bar dataKey="Nigeria (NG)" stackId="a" fill="#059669" isAnimationActive={false} />
            <Bar dataKey="Kenya (KE)" stackId="a" fill="#D97706" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
