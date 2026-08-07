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

export const EmployeeSatisfactionSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
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
      footer="ESAT index (%) across all competing teams"
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
            const curr = (t.record.kpis?.employeeSatisfaction ?? 0.70) * 100;
            const prior = t.prior ? (t.prior.kpis?.employeeSatisfaction ?? 0.70) * 100 : curr;
            const delta = curr - prior;
            const isPositive = delta >= 0;

            return (
              <div key={t.id} className="bg-white border border-slate-200 p-3 rounded-xl text-center shadow-xs">
                <div className="text-slate-500 text-xs font-semibold truncate">{t.name}</div>
                <div className={`text-base font-bold font-mono mt-1 ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
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
