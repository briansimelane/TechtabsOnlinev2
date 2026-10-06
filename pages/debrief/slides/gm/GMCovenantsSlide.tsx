import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import { DebriefDataset } from '../../../../hooks/useDebriefData';
import { SlideFrame } from '../../components/SlideFrame';
import { CustomAxisTick } from '../../components/CustomAxisTick';
import { formatNumber } from '../../../../utils/numberFormat';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const GMCovenantsSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const covenants = t.record?.gm?.covenants || { netDebtToEbitda: 0, interestCover: 99, breached: [] };
    const isBreached = (covenants.breached && covenants.breached.length > 0) || covenants.netDebtToEbitda > 3.0 || covenants.interestCover < 3.0;

    return {
      name: t.name,
      teamId: t.id,
      leverage: Number(covenants.netDebtToEbitda.toFixed(2)),
      interestCover: Number(Math.min(15, covenants.interestCover).toFixed(2)),
      isBreached,
      breachedList: covenants.breached || [],
      creditGrade: t.record?.gm?.funding?.creditGrade || 'A'
    };
  });

  return (
    <SlideFrame
      title="Covenant Headroom & Solvency"
      eyebrow="Balance Sheet Risk"
      footer="Bank syndicate covenant tests: Max Net Debt / EBITDA (3.0x) and Min Interest Cover (3.0x). Breaches trigger 250 bps penalty and dividend lock."
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Net Debt / EBITDA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Net Debt to EBITDA</h4>
              <p className="text-xs text-slate-500">Maximum limit: 3.0x leverage</p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">Limit: 3.0x</span>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={14} maxCharsPerLine={11} />} tickLine={false} />
                <YAxis stroke="#64748B" domain={[0, 'auto']} tick={{ fill: '#64748B', fontSize: 14, fontWeight: 600 }} tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} />
                <ReferenceLine y={3.0} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Max 3.0x', position: 'top', fill: '#EF4444', fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '16px', fontFamily: 'IBM Plex Mono' }}
                  formatter={(val: any) => [`${val}x`, 'Net Debt / EBITDA']}
                />
                <Bar dataKey="leverage" isAnimationActive={false}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-lev-${index}`} fill={entry.leverage > 3.0 ? '#EF4444' : '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Interest Cover */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Interest Coverage Ratio</h4>
              <p className="text-xs text-slate-500">Minimum limit: 3.0x (EBITDA / Interest)</p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">Limit: 3.0x</span>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={14} maxCharsPerLine={11} />} tickLine={false} />
                <YAxis stroke="#64748B" domain={[0, 'auto']} tick={{ fill: '#64748B', fontSize: 14, fontWeight: 600 }} tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} />
                <ReferenceLine y={3.0} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Min 3.0x', position: 'top', fill: '#EF4444', fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '16px', fontFamily: 'IBM Plex Mono' }}
                  formatter={(val: any) => [`${val}x`, 'Interest Cover']}
                />
                <Bar dataKey="interestCover" isAnimationActive={false}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-ic-${index}`} fill={entry.interestCover < 3.0 ? '#EF4444' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
};
