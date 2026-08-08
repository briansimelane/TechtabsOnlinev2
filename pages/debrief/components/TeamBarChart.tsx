import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList
} from 'recharts';
import { TEAM_COLORS } from './SlideFrame';

import { CustomAxisTick } from './CustomAxisTick';

interface TeamBarChartProps {
  data: { name: string; value: number; colorIndex: number; [key: string]: any }[];
  formatter?: (val: number) => string;
  showLabels?: boolean;
  layout?: 'horizontal' | 'vertical';
  yUnit?: string;
  height?: number;
  startFromZero?: boolean;
  isAnimationActive?: boolean;
}

export const TeamBarChart: React.FC<TeamBarChartProps> = ({
  data,
  formatter = (v) => v.toLocaleString(),
  showLabels = true,
  layout = 'horizontal',
  yUnit = '',
  height = 550,
  startFromZero = true,
  isAnimationActive = true
}) => {
  let domain: [any, any] = [0, (dataMax: number) => Math.ceil(dataMax * 1.18)];
  if (!startFromZero && data.length > 0) {
    const values = data.map(d => Number(d.value) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    if (minVal > 0) {
      const floor = Math.floor(minVal * 0.82);
      const ceil = Math.ceil(maxVal * 1.18);
      domain = [floor, ceil];
    }
  }

  return (
    <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 60, right: 45, left: 45, bottom: 45 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          {layout === 'horizontal' ? (
            <>
              <XAxis
                dataKey="name"
                stroke="#64748B"
                interval={0}
                tick={<CustomAxisTick fontSize={20} maxCharsPerLine={13} />}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748B"
                domain={domain}
                tick={{ fill: '#475569', fontSize: 20, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${formatter(v)}${yUnit}`}
              />
            </>
          ) : (
            <>
              <XAxis
                type="number"
                stroke="#64748B"
                domain={domain}
                tick={{ fill: '#475569', fontSize: 20, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${formatter(v)}${yUnit}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748B"
                interval={0}
                tick={<CustomAxisTick fontSize={20} maxCharsPerLine={14} textAnchor="end" />}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              borderRadius: '12px',
              color: '#F8FAFC',
              fontSize: '22px',
              fontFamily: 'IBM Plex Mono',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
            }}
            formatter={(val: any) => [`${formatter(Number(val))}${yUnit}`, 'Value']}
          />
          <Bar
            dataKey="value"
            radius={layout === 'horizontal' ? [8, 8, 0, 0] : [0, 8, 8, 0]}
            isAnimationActive={isAnimationActive}
            animationDuration={isAnimationActive ? 700 : 0}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={TEAM_COLORS[entry.colorIndex % TEAM_COLORS.length]}
              />
            ))}
            {showLabels && (
              <LabelList
                dataKey="value"
                position={layout === 'horizontal' ? 'top' : 'right'}
                dy={layout === 'horizontal' ? -8 : 0}
                formatter={(v: any) => `${formatter(Number(v))}${yUnit}`}
                style={{
                  fill: '#0F172A',
                  fontSize: '28px',
                  fontWeight: 900,
                  fontFamily: 'IBM Plex Mono',
                  fontVariantNumeric: 'tabular-nums'
                }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
