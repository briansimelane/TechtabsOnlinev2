import React from 'react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

// Helper to render inline markdown: **bold**, *italic*, _italic_
function renderInline(text: string): React.ReactNode[] {
  // Regex to split bold (**...**) and italic (*...* or _..._)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|_.*?_)/g;
  const rawParts = text.split(regex);

  rawParts.forEach((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      parts.push(<strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>);
    } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      parts.push(<em key={idx} className="italic text-slate-700">{part.slice(1, -1)}</em>);
    } else {
      parts.push(part);
    }
  });

  return parts;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split content into blocks
  const lines = content.split(/\r?\n/);
  const blocks: Array<{ type: 'h1' | 'h2' | 'h3' | 'list' | 'table' | 'paragraph'; content: string[] }> = [];

  let currentBlock: { type: 'h1' | 'h2' | 'h3' | 'list' | 'table' | 'paragraph'; content: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    if (trimmed.startsWith('# ')) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: 'h1', content: [trimmed.slice(2)] };
    } else if (trimmed.startsWith('## ')) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: 'h2', content: [trimmed.slice(3)] };
    } else if (trimmed.startsWith('### ')) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: 'h3', content: [trimmed.slice(4)] };
    } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (currentBlock && currentBlock.type === 'table') {
        currentBlock.content.push(trimmed);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'table', content: [trimmed] };
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (currentBlock && currentBlock.type === 'list') {
        currentBlock.content.push(trimmed.slice(2));
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'list', content: [trimmed.slice(2)] };
      }
    } else {
      if (currentBlock && currentBlock.type === 'paragraph') {
        currentBlock.content.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'paragraph', content: [line] };
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return (
    <div className={`space-y-4 text-slate-800 leading-relaxed ${className}`}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'h1') {
          return (
            <h1 key={bIdx} className="text-2xl sm:text-3xl font-bold text-slate-900 border-b border-slate-200 pb-2 mt-6 mb-4">
              {renderInline(block.content[0])}
            </h1>
          );
        }

        if (block.type === 'h2') {
          return (
            <h2 key={bIdx} className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-1 mt-6 mb-3">
              {renderInline(block.content[0])}
            </h2>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3 key={bIdx} className="text-lg font-semibold text-slate-900 mt-4 mb-2">
              {renderInline(block.content[0])}
            </h3>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={bIdx} className="list-disc list-inside space-y-1.5 pl-2 my-3 text-slate-700">
              {block.content.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-snug">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'table') {
          // Parse table rows
          const tableRows = block.content.map(row =>
            row.split('|').map(cell => cell.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          );

          if (tableRows.length < 1) return null;

          const headerRow = tableRows[0];
          // Check if second row is separator row (---)
          const hasSeparator = tableRows.length > 1 && tableRows[1].every(cell => cell.replace(/[-:\s]/g, '') === '');
          const dataRows = hasSeparator ? tableRows.slice(2) : tableRows.slice(1);

          return (
            <div key={bIdx} className="my-4 overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    {headerRow.map((cell, cIdx) => (
                      <th key={cIdx} className="px-4 py-3 border-r last:border-r-0 border-slate-200">
                        {renderInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 border-r last:border-r-0 border-slate-100 text-slate-700">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Paragraph
        const text = block.content.join(' ');
        return (
          <p key={bIdx} className="text-slate-700 my-2 leading-relaxed">
            {renderInline(text)}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownViewer;
