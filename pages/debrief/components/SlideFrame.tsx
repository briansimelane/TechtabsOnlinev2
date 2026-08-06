import React, { ReactNode } from 'react';
import { DebriefTeam } from '../../../hooks/useDebriefData';

export const TEAM_COLORS = [
  '#4CC3FF',
  '#FFC24C',
  '#FF6B8A',
  '#9B8CFF',
  '#37D9A4',
  '#FF9560',
  '#38BDF8',
  '#F43F5E'
];

export const PRODUCT_COLORS = {
  techbook: '#4CC3FF',
  zroid: '#9B8CFF',
  itab: '#FFC24C'
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
    <div className="w-full h-full relative flex flex-col justify-between p-16 debrief-slide-anim">
      {/* Signature 12px team-colour rail down left edge */}
      {!isSectionSlide && teams.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-[12px] flex flex-col overflow-hidden z-20 transition-all duration-500">
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
        <div className="flex justify-between items-start z-10">
          <div>
            {eyebrow && (
              <div className="text-[#8296B4] text-[28px] font-semibold tracking-wider uppercase mb-1">
                {eyebrow}
              </div>
            )}
            {title && (
              <h1 className="text-[#E8EDF7] text-[76px] font-extrabold tracking-tight leading-none font-['Archivo']">
                {title}
              </h1>
            )}
          </div>
          <div className="text-[#8296B4] font-mono text-[24px] font-bold bg-[#131C2E] px-4 py-2 rounded border border-[#22304A]">
            {String(currentSlide).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 my-6 relative z-10 flex flex-col justify-center">
        {children}
      </div>

      {/* Footer */}
      {!isSectionSlide && (
        <div className="flex justify-between items-center text-[#8296B4] text-[22px] font-medium border-t border-[#22304A] pt-4 z-10">
          <div>{footer || 'TechTabs Online v2 · Year End Simulation Debrief'}</div>
          <div className="font-mono text-sm opacity-60">Press [→] Next · [←] Prev · [F] Fullscreen</div>
        </div>
      )}
    </div>
  );
};
