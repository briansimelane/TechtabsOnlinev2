import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';
import { formatDebriefPercent } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const EmployeeSatisfactionSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const esat = (t.record.kpis?.employeeSatisfaction ?? 0.70) * 100;
    return {
      name: t.name,
      value: Number(esat.toFixed(1)),
      colorIndex: t.colorIndex
    };
  });

  return (
    <SlideFrame
      title="Employee Satisfaction (ESAT)"
      eyebrow="Human Resources & Workplace Culture"
      footer="ESAT index (%) · Simulation Engine caps annual movement at ±5% per year"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="space-y-6">
        <TeamBarChart
          data={chartData}
          formatter={(v) => formatDebriefPercent(v, 1)}
          yUnit="%"
        />

        {/* Delta chips vs prior year */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {dataset.teams.map(t => {
            const curr = (t.record.kpis?.employeeSatisfaction ?? 0.70) * 100;
            const prior = t.prior ? (t.prior.kpis?.employeeSatisfaction ?? 0.70) * 100 : curr;
            const delta = curr - prior;
            const isPositive = delta >= 0;

            return (
              <div key={t.id} className="bg-[#131C2E] border border-[#22304A] p-3 rounded-xl text-center">
                <div className="text-[#8296B4] text-xs font-semibold truncate">{t.name}</div>
                <div className={`text-base font-bold font-mono mt-1 ${isPositive ? 'text-[#37D9A4]' : 'text-[#FF6B8A]'}`}>
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
