import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { TEAM_COLORS } from './SlideFrame';
import { formatDebriefPercent } from '../../../utils/debriefFormat';

interface TeamPieChartProps {
  data: { name: string; value: number; colorIndex: number; [key: string]: any }[];
  centerLabel?: string;
  centerSubLabel?: string;
  isAnimationActive?: boolean;
}

export const TeamPieChart: React.FC<TeamPieChartProps> = ({
  data,
  centerLabel = '100%',
  centerSubLabel = 'Market Share',
  isAnimationActive = false
}) => {
  // Ensure data is sorted by colorIndex so Team 1 is first
  const sortedData = [...data].sort((a, b) => a.colorIndex - b.colorIndex);

  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, name, value, index }: any) => {
    if (!value || value <= 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const colorIdx = sortedData[index]?.colorIndex ?? index;
    const labelColor = TEAM_COLORS[colorIdx % TEAM_COLORS.length] || '#0F172A';

    return (
      <text
        x={x}
        y={y}
        fill={labelColor}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={18}
        fontWeight={800}
      >
        {`${name} (${value.toFixed(1)}%)`}
      </text>
    );
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center overflow-hidden relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 35, right: 180, left: 180, bottom: 35 }}>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              borderRadius: '12px',
              color: '#F8FAFC',
              fontSize: '18px',
              fontFamily: 'IBM Plex Mono',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
            }}
            formatter={(val: any) => [formatDebriefPercent(Number(val), 1), 'Actual Market Share']}
          />
          <Pie
            data={sortedData}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius="28%"
            outerRadius="50%"
            paddingAngle={3}
            dataKey="value"
            label={renderCustomizedLabel}
            labelLine={{ stroke: '#94A3B8', strokeWidth: 1.5 }}
            isAnimationActive={isAnimationActive}
            animationDuration={isAnimationActive ? 700 : 0}
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={TEAM_COLORS[entry.colorIndex % TEAM_COLORS.length]}
                stroke="#FFFFFF"
                strokeWidth={3}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
