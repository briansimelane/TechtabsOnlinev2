import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine
} from 'recharts';
import { ProductId } from '../../../types';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { formatDebriefCurrency, formatDebriefUnits } from '../../../utils/debriefFormat';
import { Reveal } from '../components/Reveal';

export const VALUE_AXIS_EXCLUDES_PRICE = true;

interface SlideProps {
  productId: ProductId;
  productName: string;
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const ProductValuePriceSlide: React.FC<SlideProps> = ({
  productId,
  productName,
  dataset,
  revealStep,
  currentSlide,
  totalSlides
}) => {
  const points = dataset.teams.map(t => {
    const price = t.record.prices?.[productId] || 2000;
    const m = t.record.market;
    const rawValueEx = m?.valueScoreExPrice?.[productId] ?? m?.valueScore?.[productId] ?? 50;
    const rawValueInc = m?.valueScore?.[productId] ?? 50;
    const valueScore = VALUE_AXIS_EXCLUDES_PRICE ? rawValueEx : rawValueInc;
    const units = m?.actualUnits?.[productId] ?? 1000;

    return {
      name: t.name,
      x: price,
      y: Number(valueScore.toFixed(1)),
      z: Math.max(200, units),
      colorIndex: t.colorIndex,
      units
    };
  });

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  });

  const slope = n > 1 && (n * sumX2 - sumX * sumX) !== 0
    ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    : 0;
  const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;

  const minX = Math.min(...points.map(p => p.x), 1000) * 0.9;
  const maxX = Math.max(...points.map(p => p.x), 4000) * 1.1;

  const refLinePoints: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];

  return (
    <SlideFrame
      title={`Value vs Price: ${productName}`}
      eyebrow={`${productName} Market Positioning`}
      footer={`X = Selling Price · Y = Value Score (0–100, ex-price) · Bubble size = Units Sold`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">
        <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative flex flex-col justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 25, right: 40, left: 30, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                dataKey="x"
                name="Price"
                stroke="#64748B"
                domain={[Math.floor(minX), Math.ceil(maxX)]}
                tickFormatter={(v) => formatDebriefCurrency(v, true, false)}
                tick={{ fill: '#0F172A', fontSize: 18, fontWeight: 600 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Value Score"
                stroke="#64748B"
                domain={[0, 100]}
                tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }}
              />
              <ZAxis type="number" dataKey="z" range={[250, 2200]} name="Units Sold" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any, name: any, item: any) => {
                  if (name === 'Price') return [formatDebriefCurrency(Number(val), true, false), 'Price'];
                  if (name === 'Value Score') return [`${val} pts`, 'Value Score'];
                  if (name === 'Units Sold') return [formatDebriefUnits(item.payload.units), 'Units Sold'];
                  return [val, name];
                }}
              />
              <ReferenceLine
                segment={refLinePoints}
                stroke="#D97706"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: 'Fair Value Trend', fill: '#D97706', fontSize: 16, position: 'top', fontWeight: 700 }}
              />
              <Scatter data={points} isAnimationActive={true}>
                {points.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={TEAM_COLORS[entry.colorIndex % TEAM_COLORS.length]}
                    stroke="#FFFFFF"
                    strokeWidth={3}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <Reveal step={2} currentStep={revealStep}>
          <div className="flex justify-between items-center bg-white border border-slate-200 px-6 py-4 rounded-xl text-xl text-slate-700 shadow-sm font-medium">
            <div><strong className="text-emerald-700">Above Line:</strong> Over-delivering value for price</div>
            <div><strong className="text-amber-700">Trend Line:</strong> Market fair-value positioning</div>
            <div><strong className="text-rose-700">Below Line:</strong> Premium priced relative to features</div>
          </div>
        </Reveal>
      </div>
    </SlideFrame>
  );
};
