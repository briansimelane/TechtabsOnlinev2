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
  revealStep,
  currentSlide,
  totalSlides
}) => {
  // Compute normalized market share percentage for active competing teams
  const totalUnits = dataset.teams.reduce((sum, t) => {
    return sum + (t.record.market?.actualUnits?.[productId] ?? 0);
  }, 0);

  const totalRawShare = dataset.teams.reduce((sum, t) => {
    const raw = t.record.market?.actualShare?.[productId] ?? t.record.kpis?.marketShare?.[productId] ?? 0;
    return sum + (raw > 1 ? raw : raw * 100);
  }, 0);

  const chartData = dataset.teams.map(t => {
    const units = t.record.market?.actualUnits?.[productId];
    const raw = t.record.market?.actualShare?.[productId] ?? t.record.kpis?.marketShare?.[productId] ?? 0;

    let pct = 0;
    if (totalUnits > 0 && units !== undefined) {
      pct = (units / totalUnits) * 100;
    } else if (totalRawShare > 0) {
      const val = raw > 1 ? raw : raw * 100;
      pct = (val / totalRawShare) * 100;
    } else {
      pct = 100 / (dataset.teams.length || 1);
    }

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
      footer={`Realized market share percentage captured in the ${productName} segment`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <TeamPieChart
        data={chartData}
        centerLabel="100%"
        centerSubLabel={`${productName} Segment`}
      />
    </SlideFrame>
  );
};
