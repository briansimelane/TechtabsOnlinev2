import React, { ReactNode } from 'react';

interface RevealProps {
  step: number;
  currentStep: number;
  children: ReactNode;
  className?: string;
}

export const Reveal: React.FC<RevealProps> = ({ step, currentStep, children, className = '' }) => {
  const isVisible = currentStep >= step;

  return (
    <div
      className={`transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0 debrief-fade-anim' : 'opacity-0 translate-y-4 pointer-events-none'
      } ${className}`}
    >
      {children}
    </div>
  );
};
