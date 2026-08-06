import React from 'react';

interface SectionSlideProps {
  sectionTitle: string;
  subtitle?: string;
}

export const SectionSlide: React.FC<SectionSlideProps> = ({ sectionTitle, subtitle }) => {
  return (
    <div className="w-full h-full flex flex-col justify-center items-start p-24 debrief-slide-anim bg-gradient-to-b from-slate-100 via-white to-slate-100 border border-slate-200 relative overflow-hidden">
      <div className="w-3 h-48 bg-blue-600 absolute left-12 top-1/2 -translate-y-1/2 rounded-full" />
      <div className="space-y-4 pl-4">
        <div className="text-blue-700 text-3xl font-bold uppercase tracking-widest">Section Overview</div>
        <h1 className="text-slate-900 text-[110px] font-extrabold tracking-tight leading-none font-['Archivo']">
          {sectionTitle}
        </h1>
        {subtitle && (
          <p className="text-slate-600 text-3xl font-medium pt-4">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
