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
      colorIndex: t.colorIndex,
      readMarketGap: demand - forecast,
      supplyGap: actual - demand
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
        <div className="w-full bg-[#131C2E] border border-[#22304A] rounded-2xl p-12 text-center text-[#8296B4] text-2xl font-semibold">
          Plan vs Actual is available from the next simulated year.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="w-full bg-[#131C2E] border border-[#22304A] rounded-2xl p-8 shadow-2xl">
            <ResponsiveContainer width="100%" height={440}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22304A" vertical={false} />
                <XAxis dataKey="name" stroke="#8296B4" tick={{ fill: '#E8EDF7', fontSize: 22, fontWeight: 600 }} tickLine={false} />
                <YAxis stroke="#8296B4" tick={{ fill: '#8296B4', fontSize: 18 }} tickFormatter={(v) => formatDebriefUnits(v)} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1220', borderColor: '#22304A', borderRadius: '8px', color: '#E8EDF7', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                  formatter={(val: any) => [formatDebriefUnits(Number(val)), 'Units']}
                />
                <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '20px', fontWeight: 'bold' }} />
                <Bar dataKey="Forecast" fill="#9B8CFF" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} />
                <Bar dataKey="Demand" fill="#FFC24C" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} />
                <Bar dataKey="Actual" fill="#37D9A4" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Reveal step={2} currentStep={revealStep}>
            <div className="grid grid-cols-2 gap-6 bg-[#131C2E] border border-[#22304A] p-6 rounded-2xl">
              <div className="border-r border-[#22304A] pr-6">
                <div className="text-[#FFC24C] text-xl font-bold uppercase tracking-wider mb-1">
                  1. Forecast → Demand Gap ("Read the Market?")
                </div>
                <p className="text-[#8296B4] text-lg">
                  Difference between planned forecast and market share won. Positive = won more market demand than expected.
                </p>
              </div>
              <div className="pl-2">
                <div className="text-[#F2994A] text-xl font-bold uppercase tracking-wider mb-1">
                  2. Demand → Actual Gap ("Capacity / Supply Constraint?")
                </div>
                <p className="text-[#8296B4] text-lg">
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
