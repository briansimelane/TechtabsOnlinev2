import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { scoreCumulative } from '../../../utils/leagueScoring';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const LeagueOverallSlide: React.FC<SlideProps> = ({ dataset, currentSlide, totalSlides }) => {
  const cumScores = scoreCumulative(dataset.teams, dataset.period);
  const sortedCum = [...cumScores].sort((a, b) => b.total - a.total);
  const totalYears = 5;

  return (
    <SlideFrame
      title="Cumulative League Leaderboard"
      eyebrow="Overall Championship Standings"
      footer="Cumulative points accumulated across all completed simulation years · Maximum 24 points per year per team"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-2">
        {/* Header Row */}
        <div className="flex items-center px-4 py-2 text-slate-500 text-sm font-bold uppercase tracking-wider border-b border-slate-200">
          <div className="w-16 text-center">Rank</div>
          <div className="flex-1 pl-4">Team Name</div>
          {Array.from({ length: totalYears }, (_, i) => i + 1).map(yr => (
            <div key={yr} className="w-20 text-center">Yr {yr}</div>
          ))}
          <div className="w-28 text-center font-extrabold text-blue-900">Total Pts</div>
        </div>

        {/* Team Rows */}
        <div className="flex-1 flex flex-col justify-between space-y-1.5 min-h-0">
          {sortedCum.map((c, idx) => {
            const teamObj = dataset.teams.find(t => t.id === c.teamId);
            const colorIdx = teamObj ? teamObj.colorIndex : idx;

            return (
              <div
                key={c.teamId}
                className={`flex items-center px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                  idx === 0 ? 'bg-amber-50/80 border-amber-300 shadow-xs' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* Rank Badge */}
                <div className="w-16 text-center font-mono text-2xl font-extrabold text-slate-800">
                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                </div>

                {/* Team Name */}
                <div className="flex-1 pl-4 flex items-center gap-3 min-w-0">
                  <div
                    className="w-3.5 h-7 rounded-full shadow-xs shrink-0"
                    style={{ backgroundColor: TEAM_COLORS[colorIdx % TEAM_COLORS.length] }}
                  />
                  <span className="text-slate-900 text-xl font-bold truncate">{c.teamName}</span>
                </div>

                {/* Year 1 to 5 Scores */}
                {Array.from({ length: totalYears }, (_, i) => i + 1).map(yr => {
                  const scoreForYr = c.byYear[yr];
                  const isPlayed = yr <= dataset.period;

                  return (
                    <div key={yr} className="w-20 text-center font-mono text-xl font-bold">
                      {isPlayed ? (
                        <span className="text-slate-800">{scoreForYr ?? 0}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>
                  );
                })}

                {/* Total Points */}
                <div className="w-28 text-center font-mono text-3xl font-black text-blue-700">
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
