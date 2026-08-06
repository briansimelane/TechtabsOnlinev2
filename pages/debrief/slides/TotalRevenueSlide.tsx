import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';
import { formatDebriefCurrency } from '../../../utils/debriefFormat';
import { Reveal } from '../components/Reveal';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const TotalRevenueSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => ({
    name: t.name,
    value: t.record.revenue.total,
    colorIndex: t.colorIndex
  }));

  const maxTeam = [...dataset.teams].sort((a, b) => b.record.revenue.total - a.record.revenue.total)[0];

  return (
    <SlideFrame
      title="Total Revenue per Team"
      eyebrow="Financial Performance"
      footer="Total net revenue achieved across all product lines for the year"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">
        <TeamBarChart
          data={chartData}
          formatter={(v) => formatDebriefCurrency(v, true, false)}
          height={660}
          startFromZero={false}
        />
        
        <Reveal step={3} currentStep={revealStep}>
          {maxTeam && (
            <div className="bg-emerald-50/90 border border-emerald-300 p-4 rounded-xl text-emerald-950 text-2xl font-bold flex items-center justify-between shadow-sm">
              <span>🏆 Top Revenue Generator: <strong>{maxTeam.name}</strong></span>
              <span className="font-mono text-emerald-700 font-extrabold text-3xl">
                {formatDebriefCurrency(maxTeam.record.revenue.total, true, false)}
              </span>
            </div>
          )}
        </Reveal>
      </div>
    </SlideFrame>
  );
};
