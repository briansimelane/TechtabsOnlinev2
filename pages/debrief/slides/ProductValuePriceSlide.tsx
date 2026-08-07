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
  ReferenceLine
} from 'recharts';
import { ProductId } from '../../../types';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { formatDebriefCurrency, formatDebriefUnits } from '../../../utils/debriefFormat';

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
  currentSlide,
  totalSlides
}) => {
  const rawPoints = dataset.teams.map(t => {
    const price = t.perf?.price?.[productId] ?? 2000;
    const value = t.perf?.totalScore?.[productId] ?? 0;
    const units = t.perf?.units?.[productId]?.actual ?? 1000;
    const match = t.id.match(/\d+/);
    const teamNum = match ? match[0] : t.name.match(/\d+/)?.[0] || '?';

    return {
      teamId: t.id,
      name: t.name,
      teamNum,
      price,
      value,
      units,
      colorIndex: t.colorIndex
    };
  });

  const prices = rawPoints.map(p => p.price);
  const values = rawPoints.map(p => p.value);

  const norm = (v: number, valList: number[]) => {
    const mean = valList.reduce((a, b) => a + b, 0) / (valList.length || 1);
    const maxDev = Math.max(...valList.map(x => Math.abs(x - mean)));
    return maxDev === 0 ? 0 : (v - mean) / maxDev;
  };

  const points = rawPoints.map(p => {
    return {
      ...p,
      normX: Number(norm(p.price, prices).toFixed(3)),
      normY: Number(norm(p.value, values).toFixed(3))
    };
  });

  const renderCustomShape = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;

    const fill = TEAM_COLORS[payload.colorIndex % TEAM_COLORS.length];
    const minUnits = Math.min(...rawPoints.map(p => p.units), 1);
    const maxUnits = Math.max(...rawPoints.map(p => p.units), 1);
    const normRadius = maxUnits === minUnits ? 24 : 18 + ((payload.units - minUnits) / (maxUnits - minUnits)) * 16;

    return (
      <g key={`bubble-${payload.teamId}`}>
        <circle
          cx={cx}
          cy={cy}
          r={normRadius}
          fill={fill}
          fillOpacity={0.85}
          stroke="#FFFFFF"
          strokeWidth={3}
        />
        <text
          x={cx}
          y={cy + 7}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="22px"
          fontWeight="800"
          fontFamily="IBM Plex Mono"
        >
          {payload.teamNum}
        </text>
      </g>
    );
  };

  return (
    <SlideFrame
      title={`Value vs Price: ${productName}`}
      eyebrow={`${productName} Positioning Matrix`}
      footer="X-Axis = Price · Y-Axis = Value (Total Score) · Quadrants centered at class average · Bubble size = Units Sold"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative flex flex-col justify-center">
        {/* Quadrant Background Overlay Labels */}
        <div className="absolute inset-x-12 inset-y-12 pointer-events-none flex flex-col justify-between p-6 z-0">
          <div className="flex justify-between items-start text-slate-300 font-extrabold text-2xl tracking-widest uppercase">
            <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 text-emerald-800/60">
              VALUE LEADER<br/>
              <span className="text-xs font-semibold text-slate-400">Low Price · High Value</span>
            </div>
            <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 text-blue-800/60 text-right">
              PREMIUM POSITION<br/>
              <span className="text-xs font-semibold text-slate-400">High Price · High Value</span>
            </div>
          </div>
          <div className="flex justify-between items-end text-slate-300 font-extrabold text-2xl tracking-widest uppercase">
            <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 text-amber-800/60">
              BUDGET PLAY<br/>
              <span className="text-xs font-semibold text-slate-400">Low Price · Low Value</span>
            </div>
            <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 text-rose-800/60 text-right">
              OVERPRICED<br/>
              <span className="text-xs font-semibold text-slate-400">High Price · Low Value</span>
            </div>
          </div>
        </div>

        {/* Prominent Axis Labels */}
        <div className="absolute inset-4 pointer-events-none flex flex-col justify-between items-center z-10">
          <div className="bg-slate-900/90 text-white font-extrabold text-sm tracking-widest uppercase px-5 py-1.5 rounded-full shadow-md font-mono border border-slate-700">
            ▲ VALUE (TOTAL SCORE)
          </div>
          <div className="bg-slate-900/90 text-white font-extrabold text-sm tracking-widest uppercase px-5 py-1.5 rounded-full shadow-md font-mono border border-slate-700">
            PRICE (LOW → HIGH) ▶
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 40, right: 40, left: 40, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              type="number"
              dataKey="normX"
              stroke="#64748B"
              domain={[-1.15, 1.15]}
              tick={false}
              axisLine={false}
              label={{ value: 'Price (Low → High)', position: 'insideBottom', offset: -5, style: { fill: '#475569', fontSize: 16, fontWeight: 800, fontFamily: 'IBM Plex Mono' } }}
            />
            <YAxis
              type="number"
              dataKey="normY"
              stroke="#64748B"
              domain={[-1.15, 1.15]}
              tick={false}
              axisLine={false}
              label={{ value: 'Value (Total Score)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#475569', fontSize: 16, fontWeight: 800, fontFamily: 'IBM Plex Mono' } }}
            />
            <ZAxis type="number" dataKey="units" range={[400, 2400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-slate-900 text-white border border-slate-700 p-3.5 rounded-xl shadow-xl font-mono text-sm space-y-1 z-20">
                    <div className="font-bold text-base text-blue-400">{p.name}</div>
                    <div>Price: <span className="font-bold text-amber-300">{formatDebriefCurrency(p.price, false, true)}</span></div>
                    <div>Total Score: <span className="font-bold">{p.value.toFixed(2)} pts</span></div>
                    <div>Actual Sold: <span className="font-bold">{formatDebriefUnits(p.units)} units</span></div>
                  </div>
                );
              }}
            />
            <ReferenceLine x={0} stroke="#94A3B8" strokeWidth={2} />
            <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={2} />
            <Scatter data={points} shape={renderCustomShape} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
