import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { scoreYearFromPerformance, getCumCsatEsat, getCumFinancialPct } from '../../../utils/leagueScoring';
import { formatDebriefPercent } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const LeagueCurrentSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const perfList = dataset.teams.map(t => t.perf);
  const scores = scoreYearFromPerformance(perfList, dataset.period);

  // Apply Tie-Breaker Rules:
  // 1. Primary: Score
  // 2. 1st Tie-Breaker: Cumulative CSAT + ESAT
  // 3. 2nd Tie-Breaker: Cumulative GP% + ROE% + NP%
  const rankedScores = [...scores].sort((a, b) => {
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

  return (
    <SlideFrame
      title={`League Standings: Year ${dataset.period}`}
      eyebrow="Class Competition"
      footer="Tie-breakers (before GP%): TB 1 = Cum. CSAT+ESAT · TB 2 = Cum. GP%+NP%+ROE%"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-2 overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
          <div className="w-14 text-center">Rank</div>
          <div className="flex-1 pl-3 min-w-0">Team Name</div>
          <div className="w-24 text-right pr-2 text-amber-700">TB 1 (CSAT+ESAT)</div>
          <div className="w-24 text-right pr-2 text-indigo-700">TB 2 (FIN PCT)</div>
          <div className="w-24 text-right pr-2">GP %</div>
          <div className="w-24 text-right pr-2">NP %</div>
          <div className="w-24 text-right pr-2">ROE %</div>
          <div className="w-24 text-center font-extrabold">Total Pts</div>
        </div>

        {/* Team Rows */}
        <div className="flex-1 flex flex-col justify-around space-y-1 min-h-0">
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
                className={`flex items-center px-4 py-2 rounded-xl border transition-all duration-300 ${
                  idx === 0 ? 'bg-amber-50/80 border-amber-300 shadow-xs font-semibold' : 'bg-slate-50 border-slate-200'
                } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              >
                {/* Rank Badge */}
                <div className="w-14 text-center font-mono text-xl font-extrabold text-slate-800">
                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                </div>

                {/* Team Name & CEO Name */}
                <div className="flex-1 pl-3 flex items-center gap-3 min-w-0">
                  <div
                    className="w-3.5 h-6 rounded-full shadow-xs shrink-0"
                    style={{ backgroundColor: TEAM_COLORS[colorIdx % TEAM_COLORS.length] }}
                  />
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-900 text-base font-bold truncate">{displayName}</span>
                    <span className="text-blue-700 font-bold text-[11px] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono shrink-0">
                      [CEO: {ceoName}]
                    </span>
                  </div>
                </div>

                {/* Tiebreaker 1 (CSAT + ESAT) */}
                <div className="w-24 text-right pr-2 font-mono text-base font-extrabold text-amber-700">
                  {tb1.toFixed(1)}%
                </div>

                {/* Tiebreaker 2 (GP + NP + ROE) */}
                <div className="w-24 text-right pr-2 font-mono text-base font-extrabold text-indigo-700">
                  {tb2.toFixed(1)}%
                </div>

                {/* GP Margin */}
                <div className="w-24 text-right pr-2">
                  <div className="font-mono text-base font-extrabold text-slate-900">
                    {formatDebriefPercent(s.gpMargin, 1)}
                  </div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                    {s.gpPoints} pts
                  </div>
                </div>

                {/* Net Margin */}
                <div className="w-24 text-right pr-2">
                  <div className="font-mono text-base font-extrabold text-slate-900">
                    {formatDebriefPercent(s.npMargin, 1)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                    {s.npPoints} pts
                  </div>
                </div>

                {/* ROE */}
                <div className="w-24 text-right pr-2">
                  <div className="font-mono text-base font-extrabold text-slate-900">
                    {formatDebriefPercent(s.roe, 1)}
                  </div>
                  <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
                    {s.roePoints} pts
                  </div>
                </div>

                {/* Total Points */}
                <div className="w-24 text-center">
                  <div className="font-mono text-2xl font-black text-slate-900">
                    {s.score}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">out of {s.maxScore}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideFrame>
  );
};
