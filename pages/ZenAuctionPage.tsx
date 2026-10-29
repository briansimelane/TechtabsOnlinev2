import React from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { ZenAuctionAndB2BPanel } from '../components/alp/ZenAuctionAndB2BPanel';
import { Gavel, Info, Building2 } from 'lucide-react';
import { ZEN_RESERVE_PRICE, ZEN_TRANSFER_COSTS } from '../constants';
import { ProductId } from '../types';

const PRODUCTS: { id: ProductId; name: string }[] = [
  { id: 'techbook', name: 'TechBook' },
  { id: 'zroid', name: 'Zroid' },
  { id: 'itab', name: 'iTab' },
];

export default function ZenAuctionPage() {
  const { currentTeam, classes, currentClassId } = useSimulation();
  const currentClass = classes.find(c => c.id === currentClassId);
  const activePeriod = currentTeam?.currentPeriod || currentClass?.currentPeriod || 1;
  const isALP = Boolean(currentClass?.isActionLearningProject);

  if (!isALP || activePeriod < 3) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Zen Open-Bid Auction Not Active</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            The Zen Open-Bid Auction is available exclusively in Year 3 of the Action Learning Project (ALP) edition.
          </p>
        </div>
      </div>
    );
  }

  const zen = currentClass?.zenAuction;
  const reservePrice = zen?.reservePrice || ZEN_RESERVE_PRICE;
  const transferCosts = zen?.transferCosts || ZEN_TRANSFER_COSTS;

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6 pb-16">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Action Learning Project • Year 3 Special Event
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              Zen Open-Bid Auction & Supplier Ownership
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              The Zen family is selling 100% of Zen in an open-bid auction between{' '}
              <strong className="text-slate-900">{zen?.startTime || '14:45'}</strong> and{' '}
              <strong className="text-slate-900">{zen?.endTime || '15:00'}:59</strong>. Teams can bid solo or confirm a Joint Venture split after the auction is awarded.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-right shrink-0">
          <div className="text-[11px] uppercase font-bold text-amber-800">Minimum Asking Price</div>
          <div className="text-xl font-black text-slate-900">
            R {reservePrice.toLocaleString('en-ZA')}
          </div>
          <div className="text-[11px] text-amber-700">Taken at End of Year 3</div>
        </div>
      </div>

      {/* Zen Deal Details & Transfer Cost Reference Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-slate-900 text-base">Zen Deal Details & Transfer Costs</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Historical & Forecast Performance Table */}
          <div className="lg:col-span-7 overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Zen Financial Metric</th>
                  <th className="py-2.5 px-3 text-right">Year 0</th>
                  <th className="py-2.5 px-3 text-right">Year 1</th>
                  <th className="py-2.5 px-3 text-right">Year 2</th>
                  <th className="py-2.5 px-3 text-right bg-indigo-50/60 text-indigo-900">Year 3 (Forecast)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-900">Past Sales (R)</td>
                  <td className="py-2.5 px-3 text-right font-mono">174 303 336</td>
                  <td className="py-2.5 px-3 text-right font-mono">193 036 177</td>
                  <td className="py-2.5 px-3 text-right font-mono">272 511 691</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold bg-indigo-50/30 text-indigo-900">
                    358 130 582
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-900">Net Profit (NP %)</td>
                  <td className="py-2.5 px-3 text-right font-mono">12.20%</td>
                  <td className="py-2.5 px-3 text-right font-mono">11.40%</td>
                  <td className="py-2.5 px-3 text-right font-mono">15.70%</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold bg-indigo-50/30 text-indigo-900">
                    17.00%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-900">Market Share</td>
                  <td className="py-2.5 px-3 text-right font-mono">25.00%</td>
                  <td className="py-2.5 px-3 text-right font-mono">25.20%</td>
                  <td className="py-2.5 px-3 text-right font-mono">33.10%</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold bg-indigo-50/30 text-indigo-900">
                    29.00%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transfer Costs Table */}
          <div className="lg:col-span-5 overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Transfer Cost (Raw Material)</th>
                  <th className="py-2.5 px-3 text-right">Transfer Cost (Finished Goods)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {PRODUCTS.map(p => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      R {transferCosts[p.id].components}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      R {transferCosts[p.id].finishedGoods}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Bidding, Post-Auction JV Split & Zen Owner Negotiations */}
      <ZenAuctionAndB2BPanel />
    </div>
  );
}
