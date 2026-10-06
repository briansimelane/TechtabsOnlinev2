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
  ReferenceLine
} from 'recharts';
import { DebriefDataset } from '../../../../hooks/useDebriefData';
import { SlideFrame } from '../../components/SlideFrame';
import { CustomAxisTick } from '../../components/CustomAxisTick';
import { formatDebriefCurrency } from '../../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const GMCostOfCertaintySlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const chartData = dataset.teams.map(t => {
    const exposures = t.record?.gm?.exposures || {};
    const usd = exposures['USD_COSTS']?.hedgeCostOrGain ?? 0;
    const ngn = exposures['NGN_REVENUE']?.hedgeCostOrGain ?? 0;
    const kes = exposures['KES_REVENUE']?.hedgeCostOrGain ?? 0;

    // USD is a payable: positive hedgeCostOrGain is carry cost paid; negative is adverse movement avoided
    const usdCostPaid = usd > 0 ? usd : 0;
    const usdLossAvoided = usd < 0 ? Math.abs(usd) : 0;
    const usdPnl = -usd;

    // NGN/KES are receivables: negative hedgeCostOrGain is discount paid; positive is adverse movement avoided
    const ngnCostPaid = ngn < 0 ? Math.abs(ngn) : 0;
    const ngnLossAvoided = ngn > 0 ? ngn : 0;
    const ngnPnl = ngn;

    const kesCostPaid = kes < 0 ? Math.abs(kes) : 0;
    const kesLossAvoided = kes > 0 ? kes : 0;
    const kesPnl = kes;

    const totalHedgeCostPaid = usdCostPaid + ngnCostPaid + kesCostPaid;
    const totalLossAvoided = usdLossAvoided + ngnLossAvoided + kesLossAvoided;
    const netHedgingImpact = usdPnl + ngnPnl + kesPnl;

    return {
      name: t.name,
      'Hedge Cost Paid': Math.round(totalHedgeCostPaid),
      'Exposure Loss Avoided': Math.round(totalLossAvoided),
      'Net Hedge P&L': Math.round(netHedgingImpact)
    };
  });

  return (
    <SlideFrame
      title="The Cost of Certainty"
      eyebrow="Treasury Execution · The Money Slide"
      footer="Per team: Hedge carry cost paid vs. adverse exposure loss avoided. Certainty protects value when volatility spikes."
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 30, left: 30, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748B" interval={0} tick={<CustomAxisTick fontSize={16} maxCharsPerLine={13} />} tickLine={false} />
            <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 18, fontWeight: 600 }} tickFormatter={(v) => formatDebriefCurrency(v, true, false)} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="#94A3B8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '18px', fontFamily: 'IBM Plex Mono' }}
              formatter={(val: any, name: any) => [formatDebriefCurrency(Number(val), true, true), name]}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }} />
            <Bar dataKey="Hedge Cost Paid" fill="#F43F5E" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="Exposure Loss Avoided" fill="#10B981" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="Net Hedge P&L" fill="#6366F1" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SlideFrame>
  );
};
