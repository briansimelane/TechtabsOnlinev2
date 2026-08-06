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
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { scoreCumulative } from '../../../utils/leagueScoring';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

const YEAR_SHADES = ['#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

export const LeagueOverallSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const teamsInput = dataset.teams.map(t => ({
    id: t.id,
    name: t.name,
    history: { [dataset.period]: t.record, ...(t.prior ? { [dataset.period - 1]: t.prior } : {}) }
  }));

  const cumScores = scoreCumulative(teamsInput, dataset.period);
  const sortedCum = [...cumScores].sort((a, b) => b.total - a.total);

  const yearsList = Array.from({ length: dataset.period }, (_, i) => i + 1);

  const chartData = sortedCum.map(c => {
    const row: any = { name: c.teamName, total: c.total };
    yearsList.forEach(yr => {
      row[`Year ${yr}`] = c.byYear[yr] || 0;
    });
    return row;
  });

  return (
    <SlideFrame
      title="Cumulative League Leaderboard"
      eyebrow="Overall Tournament Standings"
      footer={`Cumulative points accumulated across all completed years (Year 1 to Year ${dataset.period})`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 25, right: 40, left: 40, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis type="number" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickLine={false} />
            <YAxis type="category" dataKey="name" stroke="#64748B" interval={0} tick={{ fill: '#0F172A', fontSize: 24, fontWeight: 700 }} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any) => [`${val} pts`, 'Points']}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '18px', fontWeight: 'bold' }} />
            {yearsList.map((yr, idx) => (
              <Bar
                key={yr}
                dataKey={`Year ${yr}`}
                stackId="a"
                fill={YEAR_SHADES[idx % YEAR_SHADES.length]}
                isAnimationActive={true}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
