import React, { ReactNode } from 'react';

interface DebriefScalerProps {
  children: ReactNode;
}

export const DebriefScaler: React.FC<DebriefScalerProps> = ({ children }) => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 select-none fixed inset-0 flex flex-col">
      {children}
    </div>
  );
};
