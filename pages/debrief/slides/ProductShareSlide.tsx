import React from 'react';
import { ProductId } from '../../../types';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';
import { formatDebriefPercent } from '../../../utils/debriefFormat';

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
  const chartData = dataset.teams.map(t => {
    const rawShare = t.record.market?.actualShare?.[productId] ?? t.record.kpis?.marketShare?.[productId] ?? 0;
    const pct = rawShare > 1 ? rawShare : rawShare * 100;
    return {
      name: t.name,
      value: Number(pct.toFixed(1)),
      colorIndex: t.colorIndex
    };
  });

  return (
    <SlideFrame
      title={`Actual Market Share: ${productName}`}
      eyebrow={`${productName} Market Competition`}
      footer={`Realized market share percentage captured in the ${productName} segment`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <TeamBarChart
        data={chartData}
        formatter={(v) => formatDebriefPercent(v, 1)}
        yUnit="%"
      />
    </SlideFrame>
  );
};
