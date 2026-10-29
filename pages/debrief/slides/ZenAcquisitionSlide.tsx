import React from 'react';
import { DebriefDataset } from '../../../hooks/useDebriefData';
import { SlideFrame } from '../components/SlideFrame';
import { TeamBarChart } from '../components/TeamBarChart';
import { formatDebriefCurrency } from '../../../utils/debriefFormat';
import { ZEN_RESERVE_PRICE } from '../../../constants';

interface SlideProps {
  dataset: DebriefDataset;
  revealStep: number;
  currentSlide: number;
  totalSlides: number;
}

export const ZenAcquisitionSlide: React.FC<SlideProps> = ({
  dataset,
  currentSlide,
  totalSlides
}) => {
  const zenAuction = dataset.zenAuction;

  const rows = dataset.teams.map(t => {
    const zenOpp = t.perf?.alpOpportunities?.zen || t.record?.alpOpportunities?.zen;
    const isOwner = zenOpp ? zenOpp.isOwner : Boolean((zenAuction?.jvSplits?.[t.id] || 0) > 0);
    const ownershipPct = zenOpp ? zenOpp.ownershipPct : (zenAuction?.jvSplits?.[t.id] || 0);
    const winningBid = zenOpp?.winningBidAmount || zenAuction?.winningAmount || ZEN_RESERVE_PRICE;
    const purchasePriceShare = zenOpp
      ? zenOpp.purchasePriceShare
      : Math.round(winningBid * (ownershipPct / 100));
    const zenOtherIncome = zenOpp?.netOfOpportunity ?? 0;

    // Also find how much this team bought from Zen (if they are a third-party buyer)
    const anyZenOppWithBreakdown =
      dataset.teams.find(tm => tm.perf?.alpOpportunities?.zen?.buyerBreakdown)?.perf?.alpOpportunities?.zen ||
      dataset.teams.find(tm => tm.record?.alpOpportunities?.zen?.buyerBreakdown)?.record?.alpOpportunities?.zen;
    const buyerInfo = anyZenOppWithBreakdown?.buyerBreakdown?.[t.id];

    return {
      id: t.id,
      name: t.name,
      colorIndex: t.colorIndex,
      isOwner,
      ownershipPct,
      winningBid,
      purchasePriceShare,
      zenOtherIncome,
      unitsBoughtFromZen: buyerInfo?.units ?? 0,
      b2bSalesPaid: buyerInfo?.revenue ?? 0,
      b2bTransferCost: buyerInfo?.transferCost ?? 0,
      b2bMarginGenerated: buyerInfo?.profit ?? 0
    };
  });

  const totalExternalProfit = rows
    .filter(r => !r.isOwner)
    .reduce((sum, r) => sum + r.b2bMarginGenerated, 0);

  const winningBidDisplay =
    rows.find(r => r.isOwner)?.winningBid || zenAuction?.winningAmount || ZEN_RESERVE_PRICE;

  const chartData = rows.map(r => ({
    name: r.name,
    value: r.isOwner ? r.zenOtherIncome : r.b2bMarginGenerated,
    colorIndex: r.colorIndex
  }));

  return (
    <SlideFrame
      title="Zen Acquisition, JV Split & B2B Other Income"
      eyebrow="Action Learning Project — Year 3 Open-Bid Auction & Supplier Ownership"
      footer={`Winning Open-Bid Price: ${formatDebriefCurrency(winningBidDisplay)} • Third-Party Zen Sales Profit (Units × Price Agreed − Transfer Cost): ${formatDebriefCurrency(totalExternalProfit)} credited to JV Owners' Other Income`}
      currentSlide={currentSlide}
      totalSlides={totalSlides}
      teams={dataset.teams}
    >
      <div className="grid grid-cols-12 gap-6 w-full h-full flex-1 min-h-0">
        {/* Left: Bar Chart of Zen Other Income / Margin Contribution */}
        <div className="col-span-5 flex flex-col justify-between min-h-0 h-full">
          <TeamBarChart
            data={chartData}
            formatter={v => formatDebriefCurrency(v, true, false)}
            startFromZero={true}
            isAnimationActive={false}
          />
        </div>

        {/* Right: Ownership Split, Third-Party Sales & Other Income Impact Table */}
        <div className="col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
          <div className="mb-4 shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Zen JV Ownership & B2B Sales Profit Breakdown (R)
              </h3>
              <p className="text-base text-slate-500 mt-0.5">
                External sales margin above Transfer Cost (R540/624, R664/893, R575/900) split by JV % share
              </p>
            </div>
            <div className="flex gap-2.5 text-sm font-bold shrink-0">
              <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Winning Bid: {formatDebriefCurrency(winningBidDisplay)}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                B2B Profit Pool: +{formatDebriefCurrency(totalExternalProfit)}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto flex flex-col justify-center">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3.5 px-3 font-bold whitespace-nowrap">Team</th>
                  <th className="py-3.5 px-3 font-bold text-center whitespace-nowrap">Zen Role / JV Share</th>
                  <th className="py-3.5 px-3 font-bold text-right whitespace-nowrap">Zen Units Procured</th>
                  <th className="py-3.5 px-3 font-bold text-right whitespace-nowrap">Sales vs Transfer Cost</th>
                  <th className="py-3.5 px-3 font-bold text-right whitespace-nowrap">Purchase Price Share</th>
                  <th className="py-3.5 px-3 font-bold text-right bg-emerald-50/70 text-emerald-950 whitespace-nowrap">
                    Zen Other Income Credited
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-base">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-3 font-extrabold text-slate-900 text-lg whitespace-nowrap">
                      {r.name}
                    </td>
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      {r.isOwner ? (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          JV Owner ({r.ownershipPct}%)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-600">
                          External Buyer
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                      {r.unitsBoughtFromZen.toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-sm whitespace-nowrap">
                      {r.unitsBoughtFromZen > 0 ? (
                        <div>
                          <div className="font-bold text-slate-800">
                            Sales: {formatDebriefCurrency(r.b2bSalesPaid)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Transfer: {formatDebriefCurrency(r.b2bTransferCost)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {r.isOwner ? formatDebriefCurrency(r.purchasePriceShare) : '—'}
                    </td>
                    <td className="py-4 px-3 text-right font-mono font-black text-xl bg-emerald-50/40 whitespace-nowrap">
                      {r.isOwner ? (
                        <span className="text-emerald-700">+{formatDebriefCurrency(r.zenOtherIncome)}</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          (Generated +{formatDebriefCurrency(r.b2bMarginGenerated)} for JV)
                        </span>
                      )}
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
