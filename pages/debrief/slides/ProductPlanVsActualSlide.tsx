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
import { Reveal } from '../components/Reveal';

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
  revealStep,
  currentSlide,
  totalSlides
}) => {
  const chartData = dataset.teams.map(t => {
    const m = t.record.market;
    const forecast = m?.forecastUnits?.[productId] ?? 0;
    const demand = m?.demandUnits?.[productId] ?? 0;
    const actual = m?.actualUnits?.[productId] ?? 0;

    return {
      name: t.name,
      Forecast: forecast,
      Demand: demand,
      Actual: actual,
      colorIndex: t.colorIndex
    };
  });

  const hasData = dataset.teams.some(t => t.record.market && t.record.market.forecastUnits?.[productId] !== undefined);

  return (
    <SlideFrame
      title={`Plan vs Actual Units: ${productName}`}
      eyebrow={`${productName} Execution Gap Analysis`}
      footer={`Unit comparison: Forecast (plan) vs Market Demand (won) vs Actual Units Sold`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      {!hasData ? (
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-2xl font-semibold">
          Plan vs Actual is available from the next simulated year.
        </div>
      ) : (
        <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">
          <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 25, right: 30, left: 30, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
                <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => formatDebriefUnits(v)} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                  formatter={(val: any) => [formatDebriefUnits(Number(val)), 'Units']}
                />
                <Legend wrapperStyle={{ paddingTop: '35px', fontSize: '20px', fontWeight: 'bold' }} />
                <Bar dataKey="Forecast" fill="#7C3AED" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} />
                <Bar dataKey="Demand" fill="#D97706" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} />
                <Bar dataKey="Actual" fill="#059669" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Reveal step={2} currentStep={revealStep}>
            <div className="grid grid-cols-2 gap-6 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <div className="border-r border-slate-200 pr-6">
                <div className="text-amber-700 text-xl font-bold uppercase tracking-wider mb-1">
                  1. Forecast → Demand Gap ("Read the Market?")
                </div>
                <p className="text-slate-600 text-lg">
                  Difference between planned forecast and market share won. Positive = won more market demand than expected.
                </p>
              </div>
              <div className="pl-2">
                <div className="text-orange-700 text-xl font-bold uppercase tracking-wider mb-1">
                  2. Demand → Actual Gap ("Capacity / Supply Constraint?")
                </div>
                <p className="text-slate-600 text-lg">
                  Difference between market demand won and actual units delivered. Shortfalls indicate stockouts or production limits.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      )}
    </SlideFrame>
  );
};
