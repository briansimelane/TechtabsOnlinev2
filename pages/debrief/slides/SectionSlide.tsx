import React from 'react';

interface SectionSlideProps {
  sectionTitle: string;
  subtitle?: string;
}

export const SectionSlide: React.FC<SectionSlideProps> = ({ sectionTitle, subtitle }) => {
  return (
    <div className="w-full h-full flex flex-col justify-center items-start p-24 debrief-slide-anim bg-[#0B1220] relative overflow-hidden">
      <div className="w-3 h-48 bg-[#37D9A4] absolute left-12 top-1/2 -translate-y-1/2 rounded-full" />
      <div className="space-y-4">
        <div className="text-[#37D9A4] text-3xl font-bold uppercase tracking-widest">Section Overview</div>
        <h1 className="text-[#E8EDF7] text-[110px] font-extrabold tracking-tight leading-none font-['Archivo']">
          {sectionTitle}
        </h1>
        {subtitle && (
          <p className="text-[#8296B4] text-3xl font-medium pt-4">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
