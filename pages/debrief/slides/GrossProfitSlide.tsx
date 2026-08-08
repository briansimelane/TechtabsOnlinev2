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
    const gp = t.perf?.grossProfit ?? 0;
    const gpPct = t.perf?.gpMargin ?? 0;
    return {
      name: t.name,
      value: gp,
      colorIndex: t.colorIndex,
      gpPct
    };
  });

  return (
    <SlideFrame
      title="Gross Profit & Margin (%)"
      eyebrow="Financial Performance"
      footer="Total gross profit (revenue minus COGS) with gross margin percentages per team"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">
        <TeamBarChart
          data={chartData}
          formatter={(v) => formatDebriefCurrency(v, true, false)}
          startFromZero={false}
        />
        
        {/* GP% Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {dataset.teams.map((t) => {
            const gpPct = t.perf?.gpMargin ?? 0;
            return (
              <div key={t.id} className="bg-white border border-slate-200 py-3.5 px-3 rounded-2xl text-center shadow-xs flex flex-col justify-between min-h-[75px]">
                <div className="text-slate-500 text-xs sm:text-sm font-extrabold truncate leading-snug">{t.name}</div>
                <div className="text-blue-800 text-xl sm:text-2xl font-black font-mono leading-none mt-1">
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
