import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { scoreCumulative, getCumCsatEsat, getCumFinancialPct } from '../../../utils/leagueScoring';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const LeagueOverallSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const cumScores = scoreCumulative(dataset.teams, dataset.period);

  // Apply Tie-Breaker Rules:
  // 1. Primary: Total Cumulative Points
  // 2. 1st Tie-Breaker: Cumulative CSAT + ESAT
  // 3. 2nd Tie-Breaker: Cumulative GP% + ROE% + NP%
  const sortedCum = [...cumScores].sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
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

  const totalRows = sortedCum.length;
  const isCompact = totalRows > 6;
  const totalYears = 3;

  return (
    <SlideFrame
      title="Cumulative League Leaderboard"
      eyebrow="Overall Championship Standings"
      footer="Tie-breakers (before GP%): TB 1 = Cum. CSAT+ESAT · TB 2 = Cum. GP%+NP%+ROE%"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-3 overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center px-5 py-3 text-slate-600 text-sm sm:text-base font-extrabold uppercase tracking-wider border-b-2 border-slate-200 shrink-0">
          <div className="w-20 text-center">Rank</div>
          <div className="flex-1 pl-4 min-w-0">Team Name</div>
          <div className="w-32 text-right pr-3 text-amber-800 font-extrabold">TB 1 (CSAT+ESAT)</div>
          <div className="w-32 text-right pr-3 text-indigo-800 font-extrabold">TB 2 (FIN PCT)</div>
          {Array.from({ length: totalYears }, (_, i) => i + 1).map(yr => (
            <div key={yr} className="w-24 text-center">Yr {yr}</div>
          ))}
          <div className="w-36 text-center font-black text-blue-900">Total Score</div>
        </div>

        {/* Team Rows - flex-1 stretches rows to use 100% of vertical space */}
        <div className="flex-1 flex flex-col justify-between space-y-2 min-h-0 py-1">
          {sortedCum.map((c, idx) => {
            const teamObj = dataset.teams.find(t => t.id === c.teamId);
            const colorIdx = teamObj ? teamObj.colorIndex : idx;

            // Extract team number X
            const match = c.teamId.match(/\d+/);
            const teamNum = match ? match[0] : String(idx + 1);
            const rawName = c.teamName.replace(/^\(\d+\)\s*/, '');
            const displayName = `(${teamNum}) ${rawName}`;

            const ceoName = (teamObj as any)?.ceoName || (teamObj as any)?.draftDecisions?.general?.ceoName || (teamObj as any)?.draftDecisions?.ceoName || 'Unassigned';

            const tb1 = getCumCsatEsat(teamObj, dataset.period);
            const tb2 = getCumFinancialPct(teamObj, dataset.period);

            return (
              <div
                key={c.teamId}
                className={`flex-1 flex items-center px-5 py-2.5 sm:py-3 rounded-2xl border transition-all duration-300 overflow-visible min-h-[64px] ${
                  idx === 0 ? 'bg-amber-50/90 border-amber-300 shadow-md font-semibold' : 'bg-slate-50 border-slate-200 shadow-xs'
                }`}
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
                    <span className="text-blue-800 font-extrabold text-xs sm:text-sm bg-blue-100/90 border border-blue-300 px-3 py-1.5 rounded-lg font-mono shrink-0 leading-normal pb-1">
                      [CEO: {ceoName}]
                    </span>
                  </div>
                </div>

                {/* Tiebreaker 1 (CSAT + ESAT) */}
                <div className="w-32 text-right pr-3 font-mono text-lg sm:text-2xl font-black text-amber-700">
                  {tb1.toFixed(1)}%
                </div>

                {/* Tiebreaker 2 (GP + NP + ROE) */}
                <div className="w-32 text-right pr-3 font-mono text-lg sm:text-2xl font-black text-indigo-700">
                  {tb2.toFixed(1)}%
                </div>

                {/* Year 1 to 3 Scores */}
                {Array.from({ length: totalYears }, (_, i) => i + 1).map(yr => {
                  const scoreForYr = c.byYear[yr];
                  const isPlayed = yr <= dataset.period;

                  return (
                    <div key={yr} className="w-24 text-center font-mono text-xl sm:text-2xl font-black">
                      {isPlayed ? (
                        <span className="text-slate-800">{scoreForYr ?? 0}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>
                  );
                })}

                {/* Total Score */}
                <div className="w-36 text-center font-mono text-3xl sm:text-4xl font-black text-blue-800">
                  {c.total}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideFrame>
  );
};
