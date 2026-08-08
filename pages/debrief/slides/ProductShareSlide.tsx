import React from 'react';
import { ProductId } from '../../../types';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamPieChart } from '../components/TeamPieChart';

interface SlideProps {
  productId: ProductId;
  productName: string;
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const ProductShareSlide: React.FC<SlideProps> = ({
  productId,
  productName,
  dataset,
  currentSlide,
  totalSlides
}) => {
  const totalUnits = dataset.teams.reduce((sum, t) => {
    return sum + (t.perf?.units?.[productId]?.actual ?? 0);
  }, 0);

  const chartData = dataset.teams.map(t => {
    const units = t.perf?.units?.[productId]?.actual ?? 0;
    const pct = totalUnits > 0 ? (units / totalUnits) * 100 : 100 / (dataset.teams.length || 1);

    return {
      name: t.name,
      value: Number(pct.toFixed(1)),
      colorIndex: t.colorIndex
    };
  });

  return (
    <SlideFrame
      title={`Actual Market Share: ${productName}`}
      eyebrow={`${productName} Market Share Distribution`}
      footer={`Share of total active units sold in the ${productName} segment across competing teams`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <TeamPieChart
        data={chartData}
        centerLabel="100%"
        centerSubLabel={`${productName} Segment`}
        isAnimationActive={false}
      />
    </SlideFrame>
  );
};
