import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame, TEAM_COLORS } from '../components/SlideFrame';
import { scoreYear } from '../../../utils/leagueScoring';
import { formatDebriefPercent } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const LeagueCurrentSlide: React.FC<SlideProps> = ({ dataset, revealStep, currentSlide, totalSlides }) => {
  const teamsInput = dataset.teams.map(t => ({
    id: t.id,
    name: t.name,
    record: t.record
  }));

  const scores = scoreYear(teamsInput, dataset.period);
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
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="grid grid-cols-12 gap-4 text-slate-500 text-xl font-bold uppercase tracking-wider pb-3 border-b border-slate-200">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Team Name</div>
          <div className="col-span-2 text-right">GP %</div>
          <div className="col-span-2 text-right">NP %</div>
          <div className="col-span-1 text-right">ROE</div>
          <div className="col-span-2 text-center">Points</div>
        </div>

        <div className="space-y-2">
          {rankedScores.map((s, idx) => {
            const teamObj = dataset.teams.find(t => t.id === s.teamId);
            const colorIdx = teamObj ? teamObj.colorIndex : idx;

            const rowRankFromBottom = totalRows - idx;
            const isVisible = revealStep === 0 || revealStep >= rowRankFromBottom;

            return (
              <div
                key={s.teamId}
                className={`grid grid-cols-12 gap-4 items-center p-3.5 rounded-xl transition-all duration-500 border ${
                  idx === 0 ? 'bg-amber-50/80 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200'
                } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                <div className="col-span-1 text-center font-mono text-2xl font-extrabold text-slate-800">
                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                </div>

                <div className="col-span-4 flex items-center gap-3">
                  <div
                    className="w-4 h-8 rounded-full shadow-xs"
                    style={{ backgroundColor: TEAM_COLORS[colorIdx % TEAM_COLORS.length] }}
                  />
                  <span className="text-slate-900 text-2xl font-bold">{s.teamName}</span>
                </div>

                <div className="col-span-2 text-right font-mono text-xl text-slate-800 font-bold">
                  {formatDebriefPercent(s.gpMargin, 1)}{' '}
                  <sup className="text-blue-700 text-sm font-extrabold">({s.gpPoints}pt)</sup>
                </div>

                <div className="col-span-2 text-right font-mono text-xl text-slate-800 font-bold">
                  {formatDebriefPercent(s.npMargin, 1)}{' '}
                  <sup className="text-emerald-700 text-sm font-extrabold">({s.npPoints}pt)</sup>
                </div>

                <div className="col-span-1 text-right font-mono text-xl text-slate-800 font-bold">
                  {formatDebriefPercent(s.roe, 1)}{' '}
                  <sup className="text-purple-700 text-sm font-extrabold">({s.roePoints}pt)</sup>
                </div>

                <div className="col-span-2 flex items-center justify-center gap-2">
                  <div className="w-full bg-slate-200 h-7 rounded-full overflow-hidden relative flex items-center px-3 shadow-inner">
                    <div
                      className="bg-emerald-600 h-full absolute left-0 top-0 rounded-full transition-all duration-700"
                      style={{ width: `${(s.score / s.maxScore) * 100}%` }}
                    />
                    <span className="relative z-10 text-xs font-bold font-mono text-slate-900 drop-shadow-xs">
                      {s.score} / {s.maxScore}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideFrame>
  );
};
