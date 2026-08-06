import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';
import { formatDebriefCurrency } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const TotalRevenueSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => ({
    name: t.name,
    value: t.perf?.totalRevenue ?? 0,
    colorIndex: t.colorIndex
  }));

  return (
    <SlideFrame
      title="Total Revenue per Team"
      eyebrow="Financial Performance"
      footer="Total net revenue achieved across all product lines for the year"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between">
        <TeamBarChart
          data={chartData}
          formatter={(v) => formatDebriefCurrency(v, true, false)}
          startFromZero={false}
        />
      </div>
    </SlideFrame>
  );
};
