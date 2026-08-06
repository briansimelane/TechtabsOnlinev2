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

  // Calculate least-squares trend line for fair value reference
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
      footer={`X = Selling Price (R) · Y = Value Score (0–100, ex-price) · Bubble size = Units Sold`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="space-y-6">
        <div className="w-full bg-[#131C2E] border border-[#22304A] rounded-2xl p-8 shadow-2xl relative">
          <ResponsiveContainer width="100%" height={460}>
            <ScatterChart margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
              <XAxis
                type="number"
                dataKey="x"
                name="Price"
                unit=" R"
                stroke="#8296B4"
                domain={[Math.floor(minX), Math.ceil(maxX)]}
                tickFormatter={(v) => formatDebriefCurrency(v, true)}
                tick={{ fill: '#E8EDF7', fontSize: 18 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Value Score"
                stroke="#8296B4"
                domain={[0, 100]}
                tick={{ fill: '#8296B4', fontSize: 18 }}
              />
              <ZAxis type="number" dataKey="z" range={[200, 2000]} name="Units Sold" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#0B1220', borderColor: '#22304A', borderRadius: '8px', color: '#E8EDF7', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
                formatter={(val: any, name: any, item: any) => {
                  if (name === 'Price') return [formatDebriefCurrency(Number(val)), 'Price'];
                  if (name === 'Value Score') return [`${val} pts`, 'Value Score'];
                  if (name === 'Units Sold') return [formatDebriefUnits(item.payload.units), 'Units Sold'];
                  return [val, name];
                }}
              />
              <ReferenceLine
                segment={refLinePoints}
                stroke="#FFC24C"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: 'Fair Value Trend', fill: '#FFC24C', fontSize: 16, position: 'top' }}
              />
              <Scatter data={points} isAnimationActive={true}>
                {points.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={TEAM_COLORS[entry.colorIndex % TEAM_COLORS.length]}
                    stroke="#E8EDF7"
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <Reveal step={2} currentStep={revealStep}>
          <div className="flex justify-between items-center bg-[#131C2E] border border-[#22304A] px-6 py-4 rounded-xl text-xl text-[#8296B4]">
            <div><strong className="text-[#37D9A4]">Above Line:</strong> Over-delivering value for price</div>
            <div><strong className="text-[#FFC24C]">Trend Line:</strong> Market fair-value positioning</div>
            <div><strong className="text-[#FF6B8A]">Below Line:</strong> Premium priced relative to features</div>
          </div>
        </Reveal>
      </div>
    </SlideFrame>
  );
};
