import React, { useState, useEffect, ReactNode } from 'react';

interface DebriefScalerProps {
  children: ReactNode;
}

export const DebriefScaler: React.FC<DebriefScalerProps> = ({ children }) => {
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / 1920, vh / 1080);
      setScale(s);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0B1220] flex items-center justify-center select-none">
      <div
        className="w-[1920px] h-[1080px] relative bg-[#0B1220] text-[#E8EDF7] flex flex-col justify-between overflow-hidden shadow-2xl"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {children}
      </div>
    </div>
  );
};
