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
import { SlideFrame, PRODUCT_COLORS } from '../components/SlideFrame';
import { formatDebriefPercent } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const RevenueMixSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const tot = t.record.revenue.total || 1;
    const tb = ((t.record.revenue.byProduct.techbook || 0) / tot) * 100;
    const zr = ((t.record.revenue.byProduct.zroid || 0) / tot) * 100;
    const it = ((t.record.revenue.byProduct.itab || 0) / tot) * 100;

    return {
      name: t.name,
      TechBook: Number(tb.toFixed(1)),
      Zroid: Number(zr.toFixed(1)),
      iTab: Number(it.toFixed(1))
    };
  });

  return (
    <SlideFrame
      title="Revenue Contribution per Product (%)"
      eyebrow="Portfolio Mix"
      footer="100% Stacked revenue distribution by product line for each team"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full bg-[#131C2E] border border-[#22304A] rounded-2xl p-8 shadow-2xl">
        <ResponsiveContainer width="100%" height={520}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#22304A" vertical={false} />
            <XAxis dataKey="name" stroke="#8296B4" tick={{ fill: '#E8EDF7', fontSize: 22, fontWeight: 600 }} tickLine={false} />
            <YAxis stroke="#8296B4" tick={{ fill: '#8296B4', fontSize: 18 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0B1220', borderColor: '#22304A', borderRadius: '8px', color: '#E8EDF7', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any) => [formatDebriefPercent(Number(val)), '']}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '20px', fontWeight: 'bold' }} />
            <Bar dataKey="TechBook" stackId="a" fill={PRODUCT_COLORS.techbook} isAnimationActive={true} animationDuration={700} />
            <Bar dataKey="Zroid" stackId="a" fill={PRODUCT_COLORS.zroid} isAnimationActive={true} animationDuration={700} />
            <Bar dataKey="iTab" stackId="a" fill={PRODUCT_COLORS.itab} radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
