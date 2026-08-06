import React from 'react';
import { Award, TrendingUp, Presentation } from 'lucide-react';

interface TitleSlideProps {
  className: string;
  period: number;
}

export const TitleSlide: React.FC<TitleSlideProps> = ({ className, period }) => {
  return (
    <div className="w-full h-full flex flex-col justify-between items-center text-center p-20 debrief-fade-anim bg-gradient-to-b from-slate-100 via-white to-slate-100 border border-slate-200">
      <div className="flex items-center gap-3 bg-white border border-slate-300 px-6 py-3 rounded-full text-blue-700 text-2xl font-bold tracking-widest uppercase shadow-sm">
        <Presentation className="w-8 h-8 text-blue-600" />
        Official Executive Debrief
      </div>

      <div className="space-y-6 my-auto">
        <h1 className="text-slate-900 text-[100px] font-extrabold tracking-tight leading-tight font-['Archivo']">
          {className || 'Business Simulation Class'}
        </h1>
        <div className="text-[54px] font-bold text-blue-900 font-['IBM_Plex_Mono']">
          Year {period} Year-End Results
        </div>
      </div>

      <div className="flex items-center gap-8 text-slate-600 text-2xl font-medium">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          <span>Performance Analytics</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-600" />
          <span>Competitive Standing</span>
        </div>
      </div>
    </div>
  );
};
