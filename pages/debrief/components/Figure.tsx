import React, { useState, useEffect } from 'react';

interface FigureProps {
  value: number;
  formatter?: (val: number) => string;
  className?: string;
  duration?: number;
}

export const Figure: React.FC<FigureProps> = ({
  value,
  formatter = (v) => v.toLocaleString(),
  className = 'text-[120px] font-bold text-[#37D9A4]',
  duration = 700
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * easeOut);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span
      className={`font-['IBM_Plex_Mono'] ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formatter(displayValue)}
    </span>
  );
};
