import React from 'react';

interface TitleSlideProps {
  className: string;
  period: number;
}

export const TitleSlide: React.FC<TitleSlideProps> = ({ className, period }) => {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-20 debrief-fade-anim bg-gradient-to-b from-slate-100 via-white to-slate-100 border border-slate-200">
      <div className="space-y-6">
        <h1 className="text-slate-900 text-[100px] font-extrabold tracking-tight leading-tight font-['Archivo']">
          {className || 'Business Simulation Class'}
        </h1>
        <div className="text-[54px] font-bold text-blue-900 font-['IBM_Plex_Mono']">
          Year {period} Year-End Results
        </div>
      </div>
    </div>
  );
};
