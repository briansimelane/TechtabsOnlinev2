import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { scoreYearFromPerformance, getCumCsatEsat, getCumFinancialPct } from '../../../utils/leagueScoring';
import { formatDebriefPercent, formatDebriefCurrency } from '../../../utils/debriefFormat';
import { scoreYearGlobalMarkets, TeamGlobalMarketsScore } from '../../../utils/editions/globalMarkets/scoring';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const LeagueCurrentSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const isGM = dataset.editionId === 'global-markets';
  const perfList = dataset.teams.map(t => t.perf);
  const domesticScores = scoreYearFromPerformance(perfList, dataset.period);
  const gmScores: TeamGlobalMarketsScore[] = isGM ? scoreYearGlobalMarkets(dataset.teams, dataset.period) : [];

  // Apply Tie-Breaker Rules:
  // 1. Primary: Score
  // 2. 1st Tie-Breaker: Year CSAT + ESAT (Year under review)
  // 3. 2nd Tie-Breaker: Year GP% + ROE% + NP% (Year under review) OR Economic Profit for GM
  const rankedScores = isGM
    ? [...gmScores].sort((a, b) => {
        if (a.isDisqualified !== b.isDisqualified) {
          return a.isDisqualified ? 1 : -1;
        }
        if (b.score !== a.score) return b.score - a.score;
        const teamA = dataset.teams.find(t => t.id === a.teamId);
        const teamB = dataset.teams.find(t => t.id === b.teamId);
        const csatEsatA = getCumCsatEsat(teamA, dataset.period);
        const csatEsatB = getCumCsatEsat(teamB, dataset.period);
        if (Math.abs(csatEsatB - csatEsatA) > 0.001) return csatEsatB - csatEsatA;
        return b.economicProfit - a.economicProfit;
      })
    : [...domesticScores].sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        const teamA = dataset.teams.find(t => t.id === a.teamId);
        const teamB = dataset.teams.find(t => t.id === b.teamId);

        const csatEsatA = getCumCsatEsat(teamA, dataset.period);
        const csatEsatB = getCumCsatEsat(teamB, dataset.period);

        if (Math.abs(csatEsatB - csatEsatA) > 0.001) {
          return csatEsatB - csatEsatA;
        }

        const finPctA = getCumFinancialPct(teamA, dataset.period);
        const finPctB = getCumFinancialPct(teamB, dataset.period);

        return finPctB - finPctA;
      });

  const totalRows = rankedScores.length;
  const isCompact = totalRows > 6;

  return (
    <SlideFrame
      title={isGM ? `Global Markets Standings & Points (Period ${dataset.period})` : `Period Standings & Points (Year ${dataset.period})`}
      eyebrow={isGM ? "Global Markets Scorecard: Economic Profit, Margin, Cash & Plan Delivery" : "Financial & Operational Performance Ranking"}
      footer={isGM ? "Scorecard ranking: Economic Profit (EP) + NP Margin % + Cash Conversion % + Plan Delivery % · Gates: CSAT/ESAT ≥ 71%, Covenants, Solvency" : "Tie-breakers (year under review): TB 1 = Year CSAT+ESAT · TB 2 = Year GP%+NP%+ROE%"}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-3 overflow-hidden">
        {/* Header Row */}
        {isGM ? (
          <div className="flex items-center px-5 py-3 text-slate-600 text-sm sm:text-base font-extrabold uppercase tracking-wider border-b-2 border-slate-200 shrink-0">
            <div className="w-20 text-center">Rank</div>
            <div className="flex-1 pl-4 min-w-0">Team Name</div>
            <div className="w-28 text-right pr-3 text-amber-800 font-extrabold">CSAT+ESAT</div>
            <div className="w-32 text-right pr-3">Econ Profit</div>
            <div className="w-24 text-right pr-3">NP %</div>
            <div className="w-28 text-right pr-3">Cash Conv %</div>
            <div className="w-28 text-right pr-3">Plan Deliv %</div>
            <div className="w-32 text-center font-black text-blue-900">Total Pts</div>
          </div>
        ) : (
          <div className="flex items-center px-5 py-3 text-slate-600 text-sm sm:text-base font-extrabold uppercase tracking-wider border-b-2 border-slate-200 shrink-0">
            <div className="w-20 text-center">Rank</div>
            <div className="flex-1 pl-4 min-w-0">Team Name</div>
            <div className="w-28 text-right pr-3 text-amber-800 font-extrabold">TB 1 (CSAT+ESAT)</div>
            <div className="w-28 text-right pr-3 text-indigo-800 font-extrabold">TB 2 (FIN PCT)</div>
            <div className="w-28 text-right pr-3">GP %</div>
            <div className="w-28 text-right pr-3">NP %</div>
            <div className="w-28 text-right pr-3">ROE %</div>
            <div className="w-32 text-center font-black text-blue-900">Total Pts</div>
          </div>
        )}

        {/* Team Rows - flex-1 stretches rows to use 100% of vertical space */}
        <div className="flex-1 flex flex-col justify-between space-y-2 min-h-0 py-1">
          {rankedScores.map((s, idx) => {
            const teamObj = dataset.teams.find(t => t.id === s.teamId);
            const colorIdx = teamObj ? teamObj.colorIndex : idx;

            // Extract team number X
            const match = s.teamId.match(/\d+/);
            const teamNum = match ? match[0] : String(idx + 1);
            const rawName = s.teamName.replace(/^\(\d+\)\s*/, '');
            const displayName = `(${teamNum}) ${rawName}`;

            const ceoName = (teamObj as any)?.ceoName || (teamObj as any)?.draftDecisions?.general?.ceoName || (teamObj as any)?.draftDecisions?.ceoName || 'Unassigned';

            const tb1 = getCumCsatEsat(teamObj, dataset.period);
            const tb2 = getCumFinancialPct(teamObj, dataset.period);

            const rowRankFromBottom = totalRows - idx;
            const isVisible = revealStep === 0 || revealStep >= rowRankFromBottom || revealStep >= totalRows;

            return (
              <div
                key={s.teamId}
                className={`flex-1 flex items-center px-5 py-2.5 sm:py-3 rounded-2xl border transition-all duration-300 overflow-visible min-h-[64px] ${
                  idx === 0 ? 'bg-amber-50/90 border-amber-300 shadow-md font-semibold' : 'bg-slate-50 border-slate-200 shadow-xs'
                } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              >
                {/* Rank Badge */}
                <div className="w-20 text-center font-mono text-2xl sm:text-3xl font-black text-slate-800 leading-normal pb-1">
                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                </div>

                {/* Team Name & CEO Name */}
                <div className="flex-1 pl-4 flex items-center gap-3 min-w-0 overflow-visible py-1">
                  <div
                    className="w-4 h-7 rounded-full shadow-xs shrink-0"
                    style={{ backgroundColor: TEAM_COLORS[colorIdx % TEAM_COLORS.length] }}
                  />
                  <div className="flex items-center gap-2.5 min-w-0 overflow-visible py-1">
                    <span className="text-slate-900 text-lg sm:text-2xl font-black leading-normal pb-1.5 px-0.5">{displayName}</span>
                    <span className="inline-flex items-center text-blue-800 font-extrabold text-xs sm:text-sm bg-blue-100/90 border border-blue-300 px-3 py-1.5 rounded-lg font-mono shrink-0 leading-normal pb-1.5 min-h-[28px]">
                      [CEO: {ceoName}]
                    </span>
                  </div>
                </div>

                {isGM ? (
                  <>
                    {/* CSAT + ESAT */}
                    <div className="w-28 text-right pr-3 font-mono text-lg sm:text-2xl font-black text-amber-700">
                      {tb1.toFixed(1)}%
                    </div>

                    {/* Economic Profit */}
                    <div className="w-32 text-right pr-3">
                      <div className="font-mono text-lg sm:text-2xl font-black text-slate-900">
                        {formatDebriefCurrency((s as any).economicProfit, true)}
                      </div>
                      <div className="text-xs font-black text-blue-700 uppercase tracking-wide">
                        {(s as any).epPoints} pts
                      </div>
                    </div>

                    {/* Net Margin */}
                    <div className="w-24 text-right pr-3">
                      <div className="font-mono text-lg sm:text-2xl font-black text-slate-900">
                        {formatDebriefPercent((s as any).npMargin, 1)}
                      </div>
                      <div className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                        {(s as any).npPoints} pts
                      </div>
                    </div>

                    {/* Cash Conversion */}
                    <div className="w-28 text-right pr-3">
                      <div className="font-mono text-lg sm:text-2xl font-black text-slate-900">
                        {formatDebriefPercent((s as any).cashConversion, 1)}
                      </div>
                      <div className="text-xs font-black text-teal-700 uppercase tracking-wide">
                        {(s as any).ccPoints} pts
                      </div>
                    </div>

                    {/* Plan Delivery */}
                    <div className="w-28 text-right pr-3">
                      <div className="font-mono text-lg sm:text-2xl font-black text-slate-900">
                        {formatDebriefPercent((s as any).planDelivery, 1)}
                      </div>
                      <div className="text-xs font-black text-purple-700 uppercase tracking-wide">
                        {(s as any).pdPoints} pts
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Tiebreaker 1 (CSAT + ESAT) */}
                    <div className="w-28 text-right pr-3 font-mono text-lg sm:text-2xl font-black text-amber-700">
                      {tb1.toFixed(1)}%
                    </div>

                    {/* Tiebreaker 2 (GP + NP + ROE) */}
                    <div className="w-28 text-right pr-3 font-mono text-lg sm:text-2xl font-black text-indigo-700">
                      {tb2.toFixed(1)}%
                    </div>

                    {/* GP Margin */}
                    <div className="w-28 text-right pr-3">
                      <div className="font-mono text-lg sm:text-2xl font-black text-slate-900">
                        {formatDebriefPercent((s as any).gpMargin, 1)}
                      </div>
                      <div className="text-xs font-black text-blue-700 uppercase tracking-wide">
                        {(s as any).gpPoints} pts
                      </div>
                    </div>

                    {/* Net Margin */}
                    <div className="w-28 text-right pr-3">
                      <div className="font-mono text-lg sm:text-2xl font-black text-slate-900">
                        {formatDebriefPercent((s as any).npMargin, 1)}
                      </div>
                      <div className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                        {(s as any).npPoints} pts
                      </div>
                    </div>

                    {/* ROE */}
                    <div className="w-28 text-right pr-3">
                      <div className="font-mono text-lg sm:text-2xl font-black text-slate-900">
                        {formatDebriefPercent((s as any).roe, 1)}
                      </div>
                      <div className="text-xs font-black text-purple-700 uppercase tracking-wide">
                        {(s as any).roePoints} pts
                      </div>
                    </div>
                  </>
                )}

                {/* Total Points */}
                <div className="w-32 text-center">
                  <div className="font-mono text-2xl sm:text-3xl font-black text-blue-900 leading-tight">
                    {s.score}
                  </div>
                  <div className="text-[11px] text-slate-500 font-extrabold mb-0.5">out of {s.maxScore}</div>
                  {(s as any).isDisqualified && (
                    <div>
                      <span className="inline-block bg-red-100 text-red-700 border border-red-300 text-[10px] font-black uppercase px-1.5 py-0.5 rounded tracking-tight">
                        DISQUALIFIED
                      </span>
                      <div className="text-[10px] text-red-600 font-bold truncate max-w-[120px] mx-auto mt-0.5" title={(s as any).disqualificationReason}>
                        {(s as any).disqualificationReason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideFrame>
  );
};
