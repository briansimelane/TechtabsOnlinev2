import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';
import { formatDebriefCurrency } from '../../../utils/debriefFormat';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const RegionalOpportunitiesSlide: React.FC<SlideProps> = ({
  dataset,
  revealStep,
  currentSlide,
  totalSlides
}) => {
  const isYear2 = dataset.period === 2;
  const isYear3 = dataset.period === 3;

  const rows = dataset.teams.map(t => {
    const opp = t.perf?.alpOpportunities || t.record?.alpOpportunities;
    const decOpp = (t.record as any)?.decisions?.marketing?.alpOpportunities;

    const enteredBotswana = opp?.botswana ? Boolean(opp.botswana.entered) : Boolean(decOpp?.botswana);
    const enteredMozambique = opp?.mozambique
      ? Boolean(opp.mozambique.entered)
      : Boolean(decOpp?.mozambique);

    const priorRec = t.prior || t.fullHistory?.[dataset.period - 1];
    const enteredBotswanaPrior =
      opp?.botswana?.enteredInPreviousYear !== undefined
        ? Boolean(opp.botswana.enteredInPreviousYear)
        : Boolean(
            priorRec?.alpOpportunities?.botswana?.entered ||
            (priorRec as any)?.decisions?.marketing?.alpOpportunities?.botswana
          );

    const botswanaGross = opp?.botswana?.totalGrossProfit ?? 0;
    const botswanaCost = opp?.botswana?.operatingCost ?? 0;
    const botswanaTax = opp?.botswana?.tax ?? 0;
    const botswanaNet = opp?.botswana?.netOfOpportunity ?? 0;

    const mozGross = opp?.mozambique?.totalGrossProfit ?? 0;
    const mozComm = opp?.mozambique?.operatingCost ?? 0;
    const mozNet = opp?.mozambique?.netOfOpportunity ?? 0;

    const totalOtherIncome = isYear2
      ? (opp?.totalNetOtherIncome ?? t.perf?.otherIncome ?? t.record?.otherIncome ?? (botswanaNet + mozNet))
      : botswanaNet;

    return {
      id: t.id,
      name: t.name,
      colorIndex: t.colorIndex,
      enteredBotswana,
      enteredBotswanaPrior,
      botswanaGross,
      botswanaCost,
      botswanaTax,
      botswanaNet,
      enteredMozambique,
      mozGross,
      mozComm,
      mozNet,
      totalOtherIncome
    };
  });

  const chartData = rows.map(r => ({
    name: r.name,
    value: r.totalOtherIncome,
    colorIndex: r.colorIndex
  }));

  const botswanaEntrantsCount = rows.filter(r => r.enteredBotswana).length;
  const mozambiqueEntrantsCount = rows.filter(r => r.enteredMozambique).length;

  return (
    <SlideFrame
      title="Regional Market Opportunities & Other Income"
      eyebrow={`Action Learning Project — Year ${dataset.period} Regional Expansion`}
      footer={
        isYear2
          ? `Year 2 Regional Markets: Botswana Alliance (${botswanaEntrantsCount} entrant${botswanaEntrantsCount === 1 ? '' : 's'}, R90m agreement) & Mozambique Agent (${mozambiqueEntrantsCount} entrant${mozambiqueEntrantsCount === 1 ? '' : 's'}, 4.5% commission) — Net added to Other Income`
          : `Year 3 Regional Markets: Botswana Alliance (${botswanaEntrantsCount} entrant${botswanaEntrantsCount === 1 ? '' : 's'}, R50m Y2 incumbent / R95m new entrant + 50% profit tax; Mozambique closed) — Net added to Other Income`
      }
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="grid grid-cols-12 gap-6 w-full h-full flex-1 min-h-0">
        {/* Left: Total Other Income Bar Chart */}
        <div className="col-span-5 flex flex-col justify-between min-h-0 h-full">
          <TeamBarChart
            data={chartData}
            formatter={(v) => formatDebriefCurrency(v, true, false)}
            startFromZero={true}
            isAnimationActive={false}
          />
        </div>

        {/* Right: Decisions & Financial Breakdown Table */}
        <div className="col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
          <div className="mb-4 shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Team Entry Decisions & Net Results (R)
              </h3>
              <p className="text-base text-slate-500 mt-0.5">
                Equal volume split among entrants • Priced at SA prices • Fulfilled via cheapest supplier (GP%)
              </p>
            </div>
            <div className="flex gap-2.5 text-sm font-bold shrink-0">
              <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Botswana Entrants: {botswanaEntrantsCount}
              </span>
              {isYear2 && (
                <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Mozambique Entrants: {mozambiqueEntrantsCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto flex flex-col justify-center">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3.5 px-3 font-bold whitespace-nowrap">Team</th>
                  <th className="py-3.5 px-3 font-bold text-center whitespace-nowrap">Botswana Decision</th>
                  <th className="py-3.5 px-3 font-bold text-right whitespace-nowrap">Botswana Net</th>
                  {isYear2 && (
                    <>
                      <th className="py-3.5 px-3 font-bold text-center whitespace-nowrap">Mozambique Decision</th>
                      <th className="py-3.5 px-3 font-bold text-right whitespace-nowrap">Mozambique Net</th>
                    </>
                  )}
                  {isYear3 && (
                    <th className="py-3.5 px-3 font-bold text-right whitespace-nowrap">Botswana Costs & Tax</th>
                  )}
                  <th className="py-3.5 px-3 font-bold text-right bg-indigo-50/70 text-indigo-950 whitespace-nowrap">
                    Other Income Impact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-base">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-5 px-3 font-extrabold text-slate-900 text-lg whitespace-nowrap">
                      {r.name}
                    </td>
                    <td className="py-5 px-3 text-center whitespace-nowrap">
                      {r.enteredBotswana ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Entered
                          </span>
                          {isYear3 && (
                            <span className="text-xs text-slate-500 mt-1 font-semibold">
                              {r.enteredBotswanaPrior ? 'Y2 Incumbent (R50m)' : 'New Entrant (R95m)'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-500">
                          Did Not Enter
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      {r.enteredBotswana ? (
                        <div>
                          <div className={`text-lg ${r.botswanaNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {formatDebriefCurrency(r.botswanaNet)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            GP: {formatDebriefCurrency(r.botswanaGross)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {isYear2 && (
                      <>
                        <td className="py-5 px-3 text-center whitespace-nowrap">
                          {r.enteredMozambique ? (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Entered
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-500">
                              Did Not Enter
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {r.enteredMozambique ? (
                            <div>
                              <div className={`text-lg ${r.mozNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {formatDebriefCurrency(r.mozNet)}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                GP: {formatDebriefCurrency(r.mozGross)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {isYear3 && (
                      <td className="py-5 px-3 text-right font-mono text-sm text-slate-600 font-semibold whitespace-nowrap">
                        {r.enteredBotswana ? (
                          <div>
                            <div>Fee: -{formatDebriefCurrency(r.botswanaCost)}</div>
                            <div className="mt-0.5">Tax: -{formatDebriefCurrency(r.botswanaTax)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )}

                    <td className="py-5 px-3 text-right font-mono font-black text-xl bg-indigo-50/40 whitespace-nowrap">
                      <span
                        className={
                          r.totalOtherIncome > 0
                            ? 'text-emerald-700'
                            : r.totalOtherIncome < 0
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }
                      >
                        {formatDebriefCurrency(r.totalOtherIncome)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
};
