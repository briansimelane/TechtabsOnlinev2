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
import { ProductId } from '../../../types';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { CustomAxisTick } from '../components/CustomAxisTick';
import { formatDebriefUnits } from '../../../utils/debriefFormat';

interface SlideProps {
  productId: ProductId;
  productName: string;
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const ProductPlanVsActualSlide: React.FC<SlideProps> = ({
  productId,
  productName,
  dataset,
  currentSlide,
  totalSlides
}) => {
  const chartData = dataset.teams.map(t => {
    const u = t.perf?.units?.[productId];
    const forecast = u?.forecast ?? 0;
    const actual = u?.actual ?? 0;
    const accuracy = forecast > 0 ? (actual / forecast) * 100 : 0;

    return {
      name: t.name,
      'Plan (Forecast)': forecast,
      Demand: u?.demand ?? 0,
      Actual: actual,
      accuracy,
      accuracyText: forecast > 0 ? `${accuracy.toFixed(1)}%` : '0%',
      colorIndex: t.colorIndex
    };
  });

  return (
    <SlideFrame
      title={`Plan vs Actual Units: ${productName}`}
      eyebrow={`${productName} Execution Gap Analysis`}
      footer="Forecasting Accuracy = Actual Units Sold ÷ Forecasted Units · Plan = forecast share × market size · Demand = share earned × market size"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">
        {/* Forecasting Accuracy Chips per Team */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {chartData.map((d) => (
            <div key={d.name} className="bg-white border border-slate-200 py-3.5 px-2.5 rounded-2xl text-center shadow-xs flex flex-col justify-center items-center min-h-[88px] space-y-1 overflow-visible">
              <div className="text-slate-600 text-xs sm:text-sm font-extrabold truncate w-full leading-normal pb-1">{d.name}</div>
              <div className="text-emerald-700 text-xl sm:text-2xl font-black font-mono leading-normal pb-1">
                {d.accuracyText}
              </div>
              <div className="text-xs text-slate-400 font-extrabold uppercase tracking-wider leading-normal pb-0.5">Accuracy</div>
            </div>
          ))}
        </div>

        {/* Chart taking full vertical remaining space */}
        <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 25, right: 30, left: 30, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
              <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => formatDebriefUnits(v)} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any, name: any) => [formatDebriefUnits(Number(val)), name]}
              />
              <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '18px', fontWeight: 'bold' }} />
              <Bar dataKey="Plan (Forecast)" fill="#7C3AED" radius={[6, 6, 0, 0]} isAnimationActive={false} animationDuration={0} />
              <Bar dataKey="Demand" fill="#D97706" radius={[6, 6, 0, 0]} isAnimationActive={false} animationDuration={0} />
              <Bar dataKey="Actual" fill="#059669" radius={[6, 6, 0, 0]} isAnimationActive={false} animationDuration={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SlideFrame>
  );
};
