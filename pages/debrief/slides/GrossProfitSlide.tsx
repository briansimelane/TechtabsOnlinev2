import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';
import { formatDebriefCurrency, formatDebriefPercent } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const GrossProfitSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const rev = t.record.revenue.total || 1;
    const gp = t.record.grossProfit.total || 0;
    const gpPct = (gp / rev) * 100;
    return {
      name: t.name,
      value: gp,
      colorIndex: t.colorIndex,
      gpPct
    };
  });

  return (
    <SlideFrame
      title="Gross Profit (R) & GP Margin (%)"
      eyebrow="Financial Performance"
      footer="Total gross profit (revenue minus COGS) with gross margin percentages per team"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="space-y-6">
        <TeamBarChart
          data={chartData}
          formatter={(v) => formatDebriefCurrency(v, true)}
        />
        
        {/* GP% Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {dataset.teams.map((t, idx) => {
            const rev = t.record.revenue.total || 1;
            const gpPct = ((t.record.grossProfit.total || 0) / rev) * 100;
            return (
              <div key={t.id} className="bg-[#131C2E] border border-[#22304A] p-3 rounded-xl text-center">
                <div className="text-[#8296B4] text-xs font-semibold truncate">{t.name}</div>
                <div className="text-[#37D9A4] text-xl font-bold font-mono mt-1">
                  {formatDebriefPercent(gpPct)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideFrame>
  );
};
