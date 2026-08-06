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
import { DebriefTeam } from '../../../hooks/useDebriefData';
import { TEAM_COLORS } from './SlideFrame';

interface TeamBarChartProps {
  data: { name: string; value: number; colorIndex: number; [key: string]: any }[];
  formatter?: (val: number) => string;
  showLabels?: boolean;
  layout?: 'horizontal' | 'vertical';
  yUnit?: string;
  height?: number;
}

export const TeamBarChart: React.FC<TeamBarChartProps> = ({
  data,
  formatter = (v) => v.toLocaleString(),
  showLabels = true,
  layout = 'horizontal',
  yUnit = '',
  height = 550
}) => {
  return (
    <div className="w-full bg-[#131C2E] border border-[#22304A] rounded-2xl p-8 shadow-2xl">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 30, right: 40, left: 30, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#22304A" vertical={false} />
          {layout === 'horizontal' ? (
            <>
              <XAxis
                dataKey="name"
                stroke="#8296B4"
                tick={{ fill: '#E8EDF7', fontSize: 24, fontWeight: 600 }}
                axisLine={{ stroke: '#22304A' }}
                tickLine={false}
              />
              <YAxis
                stroke="#8296B4"
                tick={{ fill: '#8296B4', fontSize: 20 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${formatter(v)}${yUnit}`}
              />
            </>
          ) : (
            <>
              <XAxis
                type="number"
                stroke="#8296B4"
                tick={{ fill: '#8296B4', fontSize: 20 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${formatter(v)}${yUnit}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8296B4"
                tick={{ fill: '#E8EDF7', fontSize: 24, fontWeight: 600 }}
                axisLine={{ stroke: '#22304A' }}
                tickLine={false}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#0B1220',
              borderColor: '#22304A',
              borderRadius: '8px',
              color: '#E8EDF7',
              fontSize: '20px',
              fontFamily: 'IBM Plex Mono'
            }}
            formatter={(val: any) => [formatter(Number(val)), 'Value']}
          />
          <Bar
            dataKey="value"
            radius={layout === 'horizontal' ? [8, 8, 0, 0] : [0, 8, 8, 0]}
            isAnimationActive={true}
            animationDuration={700}
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
                formatter={(v: any) => formatter(Number(v))}
                style={{
                  fill: '#E8EDF7',
                  fontSize: '28px',
                  fontWeight: 700,
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
