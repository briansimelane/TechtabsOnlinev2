import React from 'react';
import { Award, TrendingUp, Presentation } from 'lucide-react';

interface TitleSlideProps {
  className: string;
  period: number;
}

export const TitleSlide: React.FC<TitleSlideProps> = ({ className, period }) => {
  return (
    <div className="w-full h-full flex flex-col justify-between items-center text-center p-20 debrief-fade-anim bg-gradient-to-b from-[#0B1220] via-[#131C2E] to-[#0B1220]">
      <div className="flex items-center gap-3 bg-[#131C2E] border border-[#22304A] px-6 py-3 rounded-full text-[#37D9A4] text-2xl font-bold tracking-widest uppercase">
        <Presentation className="w-8 h-8 text-[#37D9A4]" />
        Official Executive Debrief
      </div>

      <div className="space-y-6 my-auto">
        <h1 className="text-[#E8EDF7] text-[100px] font-extrabold tracking-tight leading-tight font-['Archivo']">
          {className || 'Business Simulation Class'}
        </h1>
        <div className="text-[54px] font-bold text-[#8296B4] font-['IBM_Plex_Mono']">
          Year {period} Year-End Results
        </div>
      </div>

      <div className="flex items-center gap-8 text-[#8296B4] text-2xl font-medium">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#37D9A4]" />
          <span>Performance Analytics</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-[#FFC24C]" />
          <span>Competitive Standing</span>
        </div>
      </div>
    </div>
  );
};
