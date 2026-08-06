import React, { ReactNode } from 'react';
import { DebriefTeam } from '../../../hooks/useDebriefData';

export const TEAM_COLORS = [
  '#2563EB', // Vibrant Royal Blue
  '#D97706', // Amber / Gold
  '#E11D48', // Crimson Rose
  '#7C3AED', // Deep Violet
  '#059669', // Emerald Green
  '#EA580C', // Bright Orange
  '#0284C7', // Sky Blue
  '#4D7C0F'  // Lime Forest
];

export const PRODUCT_COLORS = {
  techbook: '#2563EB',
  zroid: '#7C3AED',
  itab: '#D97706'
};

interface SlideFrameProps {
  title?: string;
  eyebrow?: string;
  footer?: string;
  currentSlide: number;
  totalSlides: number;
  teams?: DebriefTeam[];
  children: ReactNode;
  isSectionSlide?: boolean;
}

export const SlideFrame: React.FC<SlideFrameProps> = ({
  title,
  eyebrow,
  footer,
  currentSlide,
  totalSlides,
  teams = [],
  children,
  isSectionSlide = false
}) => {
  return (
    <div className="w-full h-full relative flex flex-col justify-between p-8 md:p-12 lg:p-14 debrief-slide-anim bg-slate-50 overflow-hidden">
      {/* Signature 12px team-colour rail down left edge */}
      {!isSectionSlide && teams.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-[12px] flex flex-col overflow-hidden z-20 transition-all duration-500 shadow-sm">
          {teams.map((t, idx) => (
            <div
              key={t.id || idx}
              className="w-full flex-1 transition-all duration-500"
              style={{ backgroundColor: TEAM_COLORS[t.colorIndex % TEAM_COLORS.length] }}
              title={t.name}
            />
          ))}
        </div>
      )}

      {/* Header */}
      {!isSectionSlide && (title || eyebrow) && (
        <div className="flex justify-between items-start z-10 shrink-0 mb-2">
          <div>
            {eyebrow && (
              <div className="text-slate-500 text-lg md:text-xl font-bold tracking-wider uppercase mb-1">
                {eyebrow}
              </div>
            )}
            {title && (
              <h1 className="text-slate-900 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none font-['Archivo']">
                {title}
              </h1>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 my-3 relative z-10 flex flex-col justify-center min-h-0 w-full overflow-hidden">
        {children}
      </div>

      {/* Footer */}
      {!isSectionSlide && (
        <div className="flex justify-between items-center text-slate-500 text-sm md:text-base font-medium border-t border-slate-200 pt-3 z-10 shrink-0 mt-2">
          <div>{footer || 'TechTabs Online v2 · Year End Simulation Debrief'}</div>
          <div className="font-mono text-xs md:text-sm text-slate-400">Press [→] Next · [←] Prev · [F] Fullscreen</div>
        </div>
      )}
    </div>
  );
};
