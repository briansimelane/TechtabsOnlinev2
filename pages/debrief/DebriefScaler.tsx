import React, { ReactNode, useRef, useState, useEffect } from 'react';

interface DebriefScalerProps {
  children: ReactNode;
  className?: string;
}

export const DebriefScaler: React.FC<DebriefScalerProps> = ({ children, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;
      
      const scaleX = clientWidth / 1920;
      const scaleY = clientHeight / 1080;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale > 0 ? newScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-950 ${className}`}
    >
      <div
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0
        }}
        className="relative overflow-hidden bg-slate-50 text-slate-900 select-none shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
};
