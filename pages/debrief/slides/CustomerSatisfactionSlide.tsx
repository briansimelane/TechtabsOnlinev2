import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const CustomerSatisfactionSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const csat = (t.record.kpis?.customerSatisfaction ?? 0.70) * 100;
    return {
      name: t.name,
      value: Number(csat.toFixed(1)),
      colorIndex: t.colorIndex
    };
  });

  return (
    <SlideFrame
      title="Customer Satisfaction (CSAT)"
      eyebrow="Market Impact & Service"
      footer="CSAT index (%) across all competing teams"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">
        <TeamBarChart
          data={chartData}
          formatter={(v) => `${v.toFixed(1)}%`}
          isAnimationActive={false}
          showLabels={true}
        />

        {/* Delta chips vs prior year */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {dataset.teams.map(t => {
            const curr = (t.record.kpis?.customerSatisfaction ?? 0.70) * 100;
            const prior = t.prior ? (t.prior.kpis?.customerSatisfaction ?? 0.70) * 100 : curr;
            const delta = curr - prior;
            const isPositive = delta >= 0;

            return (
              <div key={t.id} className="bg-white border border-slate-200 py-3.5 px-2.5 rounded-2xl text-center shadow-xs flex flex-col justify-center items-center min-h-[75px] space-y-1">
                <div className="text-slate-600 text-xs sm:text-sm font-extrabold truncate w-full leading-normal px-1">{t.name}</div>
                <div className={`text-base sm:text-lg font-black font-mono leading-none ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isPositive ? '▲ +' : '▼ '}{delta.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideFrame>
  );
};
