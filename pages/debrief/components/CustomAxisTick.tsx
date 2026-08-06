import React from 'react';

interface CustomAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: any };
  fontSize?: number;
  maxCharsPerLine?: number;
  textAnchor?: 'middle' | 'start' | 'end';
}

export const CustomAxisTick: React.FC<CustomAxisTickProps> = ({
  x = 0,
  y = 0,
  payload,
  fontSize = 16,
  maxCharsPerLine = 13,
  textAnchor = 'middle'
}) => {
  const rawText = String(payload?.value || '');
  const words = rawText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(w => {
    if (currentLine === '') {
      currentLine = w;
    } else if ((currentLine + ' ' + w).length <= maxCharsPerLine) {
      currentLine += ' ' + w;
    } else {
      lines.push(currentLine);
      currentLine = w;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }

  // If a single word is still longer than maxCharsPerLine, break it manually
  const finalLines: string[] = [];
  lines.forEach(l => {
    if (l.length > maxCharsPerLine + 3) {
      finalLines.push(l.slice(0, maxCharsPerLine) + '-');
      finalLines.push(l.slice(maxCharsPerLine));
    } else {
      finalLines.push(l);
    }
  });

  const lineHeight = fontSize + 3;

  return (
    <g transform={`translate(${x},${y + 12})`}>
      <text
        x={0}
        y={0}
        textAnchor={textAnchor}
        fill="#0F172A"
        fontSize={fontSize}
        fontWeight={700}
      >
        {finalLines.map((line, idx) => (
          <tspan key={idx} x={0} dy={idx === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};
