import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { scoreYearFromPerformance } from '../../../utils/leagueScoring';
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
  const rankedScores = [...scores].sort((a, b) => b.score - a.score);
  const totalRows = rankedScores.length;

  return (
    <SlideFrame
      title={`League Standings: Year ${dataset.period}`}
      eyebrow="Class Competition"
      footer="Scores calculated from GP%, NP%, and ROE performance rankings (Max Score per team = nTeams × 3)"
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="w-full h-full flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-2">
        {/* Header Row */}
        <div className="flex items-center px-4 py-2 text-slate-500 text-sm font-bold uppercase tracking-wider border-b border-slate-200">
          <div className="w-16 text-center">Rank</div>
          <div className="flex-1 pl-4">Team Name</div>
          <div className="w-28 text-right pr-2">GP %</div>
          <div className="w-28 text-right pr-2">NP %</div>
          <div className="w-28 text-right pr-2">ROE %</div>
          <div className="w-28 text-center font-extrabold">Total Pts</div>
        </div>

        {/* Team Rows */}
        <div className="flex-1 flex flex-col justify-between space-y-1.5 min-h-0">
          {rankedScores.map((s, idx) => {
            const teamObj = dataset.teams.find(t => t.id === s.teamId);
            const colorIdx = teamObj ? teamObj.colorIndex : idx;

            const rowRankFromBottom = totalRows - idx;
            const isVisible = revealStep === 0 || revealStep >= rowRankFromBottom;

            return (
              <div
                key={s.teamId}
                className={`flex items-center px-4 py-2.5 rounded-xl border transition-all duration-500 ${
                  idx === 0 ? 'bg-amber-50/80 border-amber-300 shadow-xs' : 'bg-slate-50 border-slate-200'
                } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
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
                  <span className="text-slate-900 text-xl font-bold truncate">{s.teamName}</span>
                </div>

                {/* GP Margin */}
                <div className="w-28 text-right pr-2">
                  <div className="font-mono text-lg font-extrabold text-slate-900">
                    {formatDebriefPercent(s.gpMargin, 1)}
                  </div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                    {s.gpPoints} pts
                  </div>
                </div>

                {/* Net Margin */}
                <div className="w-28 text-right pr-2">
                  <div className="font-mono text-lg font-extrabold text-slate-900">
                    {formatDebriefPercent(s.npMargin, 1)}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                    {s.npPoints} pts
                  </div>
                </div>

                {/* ROE */}
                <div className="w-28 text-right pr-2">
                  <div className="font-mono text-lg font-extrabold text-slate-900">
                    {formatDebriefPercent(s.roe, 1)}
                  </div>
                  <div className="text-xs font-bold text-purple-600 uppercase tracking-wide">
                    {s.roePoints} pts
                  </div>
                </div>

                {/* Total Points */}
                <div className="w-28 text-center">
                  <div className="font-mono text-3xl font-black text-slate-900">
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
