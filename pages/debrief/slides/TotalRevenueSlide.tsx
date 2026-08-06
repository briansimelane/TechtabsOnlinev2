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
      <div className="space-y-6">
        <TeamBarChart
          data={chartData}
          formatter={(v) => formatDebriefCurrency(v, true)}
        />
        
        <Reveal step={3} currentStep={revealStep}>
          {maxTeam && (
            <div className="bg-[#131C2E] border border-[#37D9A4] p-4 rounded-xl text-[#E8EDF7] text-2xl font-bold flex items-center justify-between">
              <span>🏆 Top Revenue Generator: <strong>{maxTeam.name}</strong></span>
              <span className="font-mono text-[#37D9A4]">{formatDebriefCurrency(maxTeam.record.revenue.total)}</span>
            </div>
          )}
        </Reveal>
      </div>
    </SlideFrame>
  );
};
