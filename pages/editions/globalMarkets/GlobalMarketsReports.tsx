import React from 'react';
import { GlobalMarketsRecord } from '../../../types';
import { formatCurrency, formatNumber, formatPercent } from '../../../utils/numberFormat';
import { 
  Globe, Shield, ShieldAlert, ShieldCheck, Scale, AlertTriangle, 
  CheckCircle, TrendingUp, Info, DollarSign, ArrowUpRight, ArrowDownRight,
  Landmark, AlertCircle
} from 'lucide-react';

interface GMReportProps {
  gmRecord?: GlobalMarketsRecord;
  period: number;
  editionConfig: any;
  historyRecord?: any;
}

// ----------------------------------------------------------------------
// 1. EXPOSURE REPORT
// ----------------------------------------------------------------------
export const ExposureReport: React.FC<GMReportProps> = ({ gmRecord, period, editionConfig }) => {
  if (!gmRecord) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <Globe className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No Processed Exposure Data Available</h3>
        <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
          Currency exposure analysis will be generated once Year 1 turn decisions have been processed by the facilitator.
          Use the <strong>Market Desk</strong> tab to inspect available forward rates and spreads.
        </p>
      </div>
    );
  }

  const exposures = gmRecord.exposures || {};
  const usdExp = exposures['USD_COSTS'] || { exposureForeign: 0, coverPct: 0, forwardRate: 0, avgSpot: 0, hedgeCostOrGain: 0, counterfactual: 0, overHedged: 0 };
  const ngnExp = exposures['NGN_REVENUE'] || { exposureForeign: 0, coverPct: 0, forwardRate: 0, avgSpot: 0, hedgeCostOrGain: 0, counterfactual: 0, overHedged: 0 };
  const kesExp = exposures['KES_REVENUE'] || { exposureForeign: 0, coverPct: 0, forwardRate: 0, avgSpot: 0, hedgeCostOrGain: 0, counterfactual: 0, overHedged: 0 };
  const usdDebt = exposures['USD_DEBT'] || { exposureForeign: 0, coverPct: 0, forwardRate: 0, avgSpot: 0, hedgeCostOrGain: 0, counterfactual: 0, overHedged: 0 };

  // Net P&L relative to unhedged spot:
  // For payables (USD): positive hedgeCostOrGain is carry cost paid -> negative P&L impact
  // For receivables (NGN/KES): positive hedgeCostOrGain is gain / devaluation avoided -> positive P&L impact
  const usdBenefit = -(usdExp.hedgeCostOrGain || 0);
  const ngnBenefit = ngnExp.hedgeCostOrGain || 0;
  const kesBenefit = kesExp.hedgeCostOrGain || 0;
  const totalHedgeImpact = usdBenefit + ngnBenefit + kesBenefit;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Hedging Impact</span>
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div className={`text-2xl font-bold font-mono ${totalHedgeImpact >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalHedgeImpact >= 0 ? '+' : ''}{formatCurrency(totalHedgeImpact)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Net P&L relative to unhedged spot</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>USD Component Cover</span>
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatPercent(usdExp.coverPct, 1, false)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Locked at R {formatNumber(usdExp.forwardRate, 2)} / USD</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>NGN Revenue Cover</span>
            <Globe className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatPercent(ngnExp.coverPct, 1, false)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Locked at R {formatNumber(ngnExp.forwardRate, 5)} / NGN</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>KES Revenue Cover</span>
            <Globe className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatPercent(kesExp.coverPct, 1, false)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Locked at R {formatNumber(kesExp.forwardRate, 4)} / KES</p>
        </div>
      </div>

      {/* Exposure Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900">Currency Exposure & Hedging Execution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Year {period} Realized Hedging Outcomes vs. Counterfactual Unhedged Spot</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 text-left">Exposure Item</th>
                <th className="py-3 px-4 text-left">Currency</th>
                <th className="py-3 px-4 text-right">Foreign Amount</th>
                <th className="py-3 px-4 text-right">Hedge Cover %</th>
                <th className="py-3 px-4 text-right">Forward Locked</th>
                <th className="py-3 px-4 text-right">Avg Spot Realized</th>
                <th className="py-3 px-4 text-right">Unhedged Cost / Rev</th>
                <th className="py-3 px-4 text-right">Actual Realized (ZAR)</th>
                <th className="py-3 px-4 text-right">Hedge Benefit / (Cost)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs sm:text-sm">
              {/* USD Costs */}
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-sans font-medium text-slate-900">Procurement Costs (COGS)</td>
                <td className="py-3 px-4 font-sans"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-xs">USD</span></td>
                <td className="py-3 px-4 text-right">${formatNumber(usdExp.exposureForeign, 0)}</td>
                <td className="py-3 px-4 text-right font-sans font-semibold text-indigo-700">{formatPercent(usdExp.coverPct, 1, false)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(usdExp.forwardRate, 2)}</td>
                <td className="py-3 px-4 text-right text-slate-500">R {formatNumber(usdExp.avgSpot, 2)}</td>
                <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(usdExp.counterfactual)}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(usdExp.counterfactual + (usdExp.hedgeCostOrGain || 0))}</td>
                <td className={`py-3 px-4 text-right font-bold ${usdBenefit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {usdBenefit >= 0 ? '+' : ''}{formatCurrency(usdBenefit)}
                </td>
              </tr>

              {/* NGN Revenue */}
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-sans font-medium text-slate-900">Nigeria Regional Revenue</td>
                <td className="py-3 px-4 font-sans"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-xs">NGN</span></td>
                <td className="py-3 px-4 text-right">₦{formatNumber(ngnExp.exposureForeign, 0)}</td>
                <td className="py-3 px-4 text-right font-sans font-semibold text-emerald-700">{formatPercent(ngnExp.coverPct, 1, false)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(ngnExp.forwardRate, 5)}</td>
                <td className="py-3 px-4 text-right text-slate-500">R {formatNumber(ngnExp.avgSpot, 5)}</td>
                <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(ngnExp.counterfactual)}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(ngnExp.counterfactual + (ngnExp.hedgeCostOrGain || 0))}</td>
                <td className={`py-3 px-4 text-right font-bold ${ngnBenefit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ngnBenefit >= 0 ? '+' : ''}{formatCurrency(ngnBenefit)}
                </td>
              </tr>

              {/* KES Revenue */}
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-sans font-medium text-slate-900">Kenya Regional Revenue</td>
                <td className="py-3 px-4 font-sans"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold text-xs">KES</span></td>
                <td className="py-3 px-4 text-right">KSh {formatNumber(kesExp.exposureForeign, 0)}</td>
                <td className="py-3 px-4 text-right font-sans font-semibold text-amber-700">{formatPercent(kesExp.coverPct, 1, false)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(kesExp.forwardRate, 4)}</td>
                <td className="py-3 px-4 text-right text-slate-500">R {formatNumber(kesExp.avgSpot, 4)}</td>
                <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(kesExp.counterfactual)}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(kesExp.counterfactual + (kesExp.hedgeCostOrGain || 0))}</td>
                <td className={`py-3 px-4 text-right font-bold ${kesBenefit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {kesBenefit >= 0 ? '+' : ''}{formatCurrency(kesBenefit)}
                </td>
              </tr>

              {/* USD Debt */}
              {usdDebt.exposureForeign > 0 && (
                <tr className="hover:bg-slate-50/60 bg-slate-50/20">
                  <td className="py-3 px-4 font-sans font-medium text-slate-900">Foreign Debt Balance (Balance Sheet)</td>
                  <td className="py-3 px-4 font-sans"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-xs">USD</span></td>
                  <td className="py-3 px-4 text-right">${formatNumber(usdDebt.exposureForeign, 0)}</td>
                  <td className="py-3 px-4 text-right font-sans text-slate-400">Unhedged</td>
                  <td className="py-3 px-4 text-right text-slate-400">—</td>
                  <td className="py-3 px-4 text-right text-slate-500">R {formatNumber(usdDebt.avgSpot, 2)}</td>
                  <td className="py-3 px-4 text-right text-slate-400">—</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(usdDebt.exposureForeign * usdDebt.avgSpot)}</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-sans text-xs">
                    See Covenants
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {usdExp.overHedged > 0 && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 flex items-center text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-amber-600" />
            <span>Over-hedging penalty realized: You hedged more than 100% of required foreign currency procurement. Speculative excess loss of {formatCurrency(usdExp.overHedged)} was incurred.</span>
          </div>
        )}
      </div>

      {/* Key Takeaways */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 flex items-center text-sm">
          <Info className="w-4 h-4 mr-1.5 text-blue-600" />
          The Cost of Certainty: How to Interpret Exposure Results
        </h4>
        <p>
          Hedging via Covered Interest Parity (CIP) eliminates currency volatility at the cost of the interest rate differential (the "carry").
          When ZAR rates exceed USD rates, buying USD forward carries a cost (the forward rate is higher than the opening spot).
          Conversely, selling NGN forward delivers a discount because Nigerian interest rates exceed South African rates.
        </p>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. VALUE CREATION REPORT (The one participants photograph)
// ----------------------------------------------------------------------
export const ValueCreationReport: React.FC<GMReportProps> = ({ gmRecord, period, editionConfig }) => {
  if (!gmRecord) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No Value Creation Data Available</h3>
        <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
          Economic profit and market return metrics are computed once decisions are processed.
        </p>
      </div>
    );
  }

  const byMarket = gmRecord.byMarket || {};
  const za = byMarket['za'] || { revenueLocal: 0, revenueZAR: 0, grossProfitZAR: 0, investedCapital: 0, wacc: 0.115, economicProfit: 0, trappedCash: 0 };
  const ng = byMarket['ng'] || { revenueLocal: 0, revenueZAR: 0, grossProfitZAR: 0, investedCapital: 0, wacc: 0.180, economicProfit: 0, trappedCash: 0 };
  const ke = byMarket['ke'] || { revenueLocal: 0, revenueZAR: 0, grossProfitZAR: 0, investedCapital: 0, wacc: 0.150, economicProfit: 0, trappedCash: 0 };

  const totalRevZAR = (za.revenueZAR || 0) + (ng.revenueZAR || 0) + (ke.revenueZAR || 0);
  const totalGPZAR = (za.grossProfitZAR || 0) + (ng.grossProfitZAR || 0) + (ke.grossProfitZAR || 0);
  const totalInvestedCapital = (za.investedCapital || 0) + (ng.investedCapital || 0) + (ke.investedCapital || 0);
  const totalEP = (za.economicProfit || 0) + (ng.economicProfit || 0) + (ke.economicProfit || 0);
  const totalTrapped = (za.trappedCash || 0) + (ng.trappedCash || 0) + (ke.trappedCash || 0);

  // Capital charges
  const zaCharge = za.investedCapital * za.wacc;
  const ngCharge = ng.investedCapital * ng.wacc;
  const keCharge = ke.investedCapital * ke.wacc;
  const totalCharge = zaCharge + ngCharge + keCharge;

  // Implied NOPAT = EP + CapitalCharge
  const zaNopat = za.economicProfit + zaCharge;
  const ngNopat = ng.economicProfit + ngCharge;
  const keNopat = ke.economicProfit + keCharge;
  const totalNopat = zaNopat + ngNopat + keNopat;

  // ROIC = NOPAT / Invested Capital
  const zaRoic = za.investedCapital > 0 ? zaNopat / za.investedCapital : 0;
  const ngRoic = ng.investedCapital > 0 ? ngNopat / ng.investedCapital : 0;
  const keRoic = ke.investedCapital > 0 ? keNopat / ke.investedCapital : 0;
  const totalRoic = totalInvestedCapital > 0 ? totalNopat / totalInvestedCapital : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Executive Value Creation Scorecard */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
          <span>Executive Value Creation Scorecard</span>
          <span>·</span>
          <span>Year {period}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Economic Profit by Market</h2>
        <p className="text-slate-500 text-sm max-w-2xl mt-1">
          True value creation measured as NOPAT minus the risk-adjusted capital charge ($IC \times WACC$).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-500 uppercase font-semibold">Total Economic Profit</div>
            <div className={`text-2xl sm:text-3xl font-mono font-bold mt-1 ${totalEP >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalEP >= 0 ? '+' : ''}{formatCurrency(totalEP)}
            </div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-500 uppercase font-semibold">Total Invested Capital</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold mt-1 text-slate-900">
              {formatCurrency(totalInvestedCapital)}
            </div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-500 uppercase font-semibold">Blended ROIC</div>
            <div className={`text-2xl sm:text-3xl font-mono font-bold mt-1 ${totalRoic >= 0.15 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatPercent(totalRoic, 1)}
            </div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-500 uppercase font-semibold">Trapped Foreign Cash</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold mt-1 text-amber-600">
              {formatCurrency(totalTrapped)}
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Market Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900">Regional Value Creation Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">NOPAT, Invested Capital, Hurdle Rates and Economic Profit by Territory</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 text-left">Financial Metric</th>
                <th className="py-3 px-4 text-right">South Africa (ZA)</th>
                <th className="py-3 px-4 text-right">Nigeria (NG)</th>
                <th className="py-3 px-4 text-right">Kenya (KE)</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-100/60">Total Company</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs sm:text-sm">
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Reporting Currency</td>
                <td className="py-2.5 px-4 text-right font-sans font-semibold text-slate-900">ZAR</td>
                <td className="py-2.5 px-4 text-right font-sans font-semibold text-slate-900">NGN (₦)</td>
                <td className="py-2.5 px-4 text-right font-sans font-semibold text-slate-900">KES (KSh)</td>
                <td className="py-2.5 px-4 text-right font-sans font-semibold text-slate-900 bg-slate-50/50">ZAR (Consolidated)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Local Revenue</td>
                <td className="py-2.5 px-4 text-right">{formatCurrency(za.revenueLocal)}</td>
                <td className="py-2.5 px-4 text-right">₦{formatNumber(ng.revenueLocal, 0)}</td>
                <td className="py-2.5 px-4 text-right">KSh {formatNumber(ke.revenueLocal, 0)}</td>
                <td className="py-2.5 px-4 text-right text-slate-400 bg-slate-50/50">—</td>
              </tr>
              <tr className="font-semibold bg-slate-50/40">
                <td className="py-2.5 px-4 font-sans text-slate-900">Converted Revenue (ZAR)</td>
                <td className="py-2.5 px-4 text-right text-slate-900">{formatCurrency(za.revenueZAR)}</td>
                <td className="py-2.5 px-4 text-right text-slate-900">{formatCurrency(ng.revenueZAR)}</td>
                <td className="py-2.5 px-4 text-right text-slate-900">{formatCurrency(ke.revenueZAR)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900 bg-slate-100/60">{formatCurrency(totalRevZAR)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Gross Profit (ZAR)</td>
                <td className="py-2.5 px-4 text-right">{formatCurrency(za.grossProfitZAR)}</td>
                <td className="py-2.5 px-4 text-right">{formatCurrency(ng.grossProfitZAR)}</td>
                <td className="py-2.5 px-4 text-right">{formatCurrency(ke.grossProfitZAR)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900 bg-slate-50/50">{formatCurrency(totalGPZAR)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Allocated NOPAT (ZAR)</td>
                <td className="py-2.5 px-4 text-right">{formatCurrency(zaNopat)}</td>
                <td className="py-2.5 px-4 text-right">{formatCurrency(ngNopat)}</td>
                <td className="py-2.5 px-4 text-right">{formatCurrency(keNopat)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900 bg-slate-50/50">{formatCurrency(totalNopat)}</td>
              </tr>
              <tr className="border-t-2 border-slate-200">
                <td className="py-2.5 px-4 font-sans text-slate-700 font-semibold">Invested Capital (IC)</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(za.investedCapital)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(ng.investedCapital)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(ke.investedCapital)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900 bg-slate-100/60">{formatCurrency(totalInvestedCapital)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Return on Invested Capital (ROIC)</td>
                <td className="py-2.5 px-4 text-right font-bold text-indigo-600">{formatPercent(zaRoic, 1)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-indigo-600">{formatPercent(ngRoic, 1)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-indigo-600">{formatPercent(keRoic, 1)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-indigo-700 bg-slate-50/50">{formatPercent(totalRoic, 1)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Market WACC (Hurdle Rate)</td>
                <td className="py-2.5 px-4 text-right font-semibold text-slate-600">{formatPercent(za.wacc, 2)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-rose-600">{formatPercent(ng.wacc, 2)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-amber-600">{formatPercent(ke.wacc, 2)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-slate-600 bg-slate-50/50">
                  {formatPercent(totalInvestedCapital > 0 ? totalCharge / totalInvestedCapital : 0.115, 2)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Capital Charge (IC × WACC)</td>
                <td className="py-2.5 px-4 text-right text-rose-600">({formatCurrency(zaCharge)})</td>
                <td className="py-2.5 px-4 text-right text-rose-600">({formatCurrency(ngCharge)})</td>
                <td className="py-2.5 px-4 text-right text-rose-600">({formatCurrency(keCharge)})</td>
                <td className="py-2.5 px-4 text-right text-rose-700 font-bold bg-slate-50/50">({formatCurrency(totalCharge)})</td>
              </tr>
              <tr className="bg-indigo-50/60 font-black border-t-2 border-indigo-200">
                <td className="py-3 px-4 font-sans text-indigo-950 text-sm">Economic Profit (EP)</td>
                <td className={`py-3 px-4 text-right text-sm ${za.economicProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {za.economicProfit >= 0 ? '+' : ''}{formatCurrency(za.economicProfit)}
                </td>
                <td className={`py-3 px-4 text-right text-sm ${ng.economicProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {ng.economicProfit >= 0 ? '+' : ''}{formatCurrency(ng.economicProfit)}
                </td>
                <td className={`py-3 px-4 text-right text-sm ${ke.economicProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {ke.economicProfit >= 0 ? '+' : ''}{formatCurrency(ke.economicProfit)}
                </td>
                <td className={`py-3 px-4 text-right text-sm bg-indigo-100/70 ${totalEP >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {totalEP >= 0 ? '+' : ''}{formatCurrency(totalEP)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-700">Trapped / Restricted Cash</td>
                <td className="py-2.5 px-4 text-right text-slate-400">R 0</td>
                <td className="py-2.5 px-4 text-right font-bold text-amber-600">{formatCurrency(ng.trappedCash)}</td>
                <td className="py-2.5 px-4 text-right text-slate-400">R 0</td>
                <td className="py-2.5 px-4 text-right font-bold text-amber-700 bg-slate-50/50">{formatCurrency(totalTrapped)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep-Dive Pedagogical Callout */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 text-amber-900 text-xs space-y-2">
        <h4 className="font-bold flex items-center text-sm text-amber-950">
          <AlertCircle className="w-4 h-4 mr-1.5 text-amber-600" />
          The Hurdle Rate Reality: Why Accounting Profit is Not Value Creation
        </h4>
        <p>
          Entering international emerging markets like Nigeria often presents high nominal unit demand and top-line growth.
          However, because of the country risk premium (6.5% added to the base WACC of 11.5%, giving an 18.0% hurdle rate),
          a venture in Nigeria returning an 18% ROIC merely breaks even on an economic basis, and returns below 18% represent 
          <strong> net economic value destruction</strong> regardless of whether accounting net profit is positive.
        </p>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. COVENANT & FUNDING REPORT
// ----------------------------------------------------------------------
export const CovenantsFundingReport: React.FC<GMReportProps> = ({ gmRecord, period, editionConfig }) => {
  const covenantsConfig = editionConfig?.covenants || { netDebtToEbitda: { max: 3.0 }, interestCover: { min: 3.0 } };
  const maxLeverage = covenantsConfig.netDebtToEbitda?.max ?? 3.0;
  const minInterestCover = covenantsConfig.interestCover?.min ?? 3.0;

  if (!gmRecord) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <Scale className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No Covenant Data Available</h3>
        <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
          Covenant tests and borrowing grade calculations are published upon processing.
        </p>
      </div>
    );
  }

  const cov = gmRecord.covenants || { netDebtToEbitda: 0, interestCover: 99, breached: [] };
  const funding = gmRecord.funding || { currency: 'ZAR', rate: 0.115, creditGrade: 'A', fxRevaluation: 0 };

  const isLeverageBreached = cov.breached.includes('netDebtToEbitda') || cov.breached.includes('leverage') || cov.netDebtToEbitda > maxLeverage;
  const isInterestBreached = cov.breached.includes('interestCover') || cov.interestCover < minInterestCover;

  const leverageHeadroom = maxLeverage - cov.netDebtToEbitda;
  const interestHeadroom = cov.interestCover - minInterestCover;

  return (
    <div className="space-y-6">
      {/* Covenant Status Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leverage Covenant Card */}
        <div className={`bg-white rounded-xl border p-6 shadow-sm transition-all ${isLeverageBreached ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Covenant Test 1</div>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">Net Debt to EBITDA</h3>
            </div>
            {isLeverageBreached ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> BREACH
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> COMPLIANT
              </span>
            )}
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-slate-900">{formatNumber(cov.netDebtToEbitda, 2)}x</span>
              <span className="text-slate-400 text-sm ml-2">actual leverage</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-xs font-semibold">Maximum Covenant Limit:</span>
              <span className="text-sm font-bold text-slate-900 ml-1.5">{formatNumber(maxLeverage, 1)}x</span>
            </div>
          </div>

          {/* Progress / Headroom Bar */}
          <div className="mt-4">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isLeverageBreached ? 'bg-rose-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(100, (cov.netDebtToEbitda / maxLeverage) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0.0x</span>
              <span className={`font-semibold ${leverageHeadroom >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {leverageHeadroom >= 0 ? `Headroom: +${formatNumber(leverageHeadroom, 2)}x` : `Breached by: ${formatNumber(Math.abs(leverageHeadroom), 2)}x`}
              </span>
              <span>Max: {formatNumber(maxLeverage, 1)}x</span>
            </div>
          </div>
        </div>

        {/* Interest Cover Covenant Card */}
        <div className={`bg-white rounded-xl border p-6 shadow-sm transition-all ${isInterestBreached ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Covenant Test 2</div>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">Interest Coverage Ratio</h3>
            </div>
            {isInterestBreached ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> BREACH
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> COMPLIANT
              </span>
            )}
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-slate-900">{formatNumber(cov.interestCover, 2)}x</span>
              <span className="text-slate-400 text-sm ml-2">EBITDA / Interest</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-xs font-semibold">Minimum Covenant Limit:</span>
              <span className="text-sm font-bold text-slate-900 ml-1.5">{formatNumber(minInterestCover, 1)}x</span>
            </div>
          </div>

          {/* Progress / Headroom Bar */}
          <div className="mt-4">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isInterestBreached ? 'bg-rose-500' : 'bg-emerald-600'}`}
                style={{ width: `${Math.min(100, (cov.interestCover / (minInterestCover * 2)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0.0x</span>
              <span className={`font-semibold ${interestHeadroom >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {interestHeadroom >= 0 ? `Headroom: +${formatNumber(interestHeadroom, 2)}x` : `Breached by: ${formatNumber(Math.abs(interestHeadroom), 2)}x`}
              </span>
              <span>Min: {formatNumber(minInterestCover, 1)}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Grade & Borrowing Structure */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center">
          <Landmark className="w-5 h-5 mr-2 text-indigo-600" />
          Treasury Funding Structure & Credit Grade
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 font-semibold uppercase">Credit Grade Rating</span>
            <div className="text-2xl font-black text-indigo-700 mt-1 flex items-baseline">
              {funding.creditGrade}
              <span className="text-xs text-slate-400 ml-2 font-normal">Assigned by Banking Syndicate</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 font-semibold uppercase">Borrowing Currency</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {funding.currency}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 font-semibold uppercase">Effective Interest Rate</span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {formatPercent(funding.rate, 2)}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 font-semibold uppercase">FX Balance Sheet Revaluation</span>
            <div className={`text-2xl font-black font-mono mt-1 ${funding.fxRevaluation === 0 ? 'text-slate-700' : (funding.fxRevaluation > 0 ? 'text-rose-600' : 'text-emerald-600')}`}>
              {funding.fxRevaluation !== 0 ? formatCurrency(Math.abs(funding.fxRevaluation)) : 'R 0'}
            </div>
          </div>
        </div>
      </div>

      {/* Covenant Breach Penalty Warning */}
      {cov.breached.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-900 text-xs flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-rose-950 mb-1">Covenant Breach Enforcement in Effect</h4>
            <p>
              Your banking syndicate has imposed a <strong>250 bps penalty margin (+2.50%)</strong> on all outstanding debt facilities.
              In addition, equity dividend declarations and capital repatriations are legally blocked until leverage and coverage ratios are cured below the mandatory covenant limits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. MARKET DESK REPORT
// ----------------------------------------------------------------------
export const MarketDeskReport: React.FC<GMReportProps> = ({ period, editionConfig }) => {
  const currencies = editionConfig?.currencies || {
    ZAR: { rate: 0.115 },
    USD: { spot: 18.50, rate: 0.045, path: [18.50, 19.10, 22.50] },
    NGN: { spot: 0.01156, rate: 0.240, path: [0.01156, 0.01120, 0.00830] },
    KES: { spot: 0.1435, rate: 0.140, path: [0.1435, 0.1405, 0.1330] }
  };

  const zarRate = currencies.ZAR?.rate ?? 0.115;
  const pIndex = Math.min(2, Math.max(0, period - 1));

  // Compute CIP Forward for 12 months: F = S * (1 + zarRate) / (1 + foreignRate)
  const usdSpot = currencies.USD?.path?.[pIndex] ?? currencies.USD?.spot ?? 18.50;
  const usdRate = currencies.USD?.rate ?? 0.045;
  const usdForward12m = usdSpot * ((1 + zarRate) / (1 + usdRate));
  const usdForward6m = usdSpot * ((1 + zarRate * 0.5) / (1 + usdRate * 0.5));
  const usdForward3m = usdSpot * ((1 + zarRate * 0.25) / (1 + usdRate * 0.25));

  const ngnSpot = currencies.NGN?.path?.[pIndex] ?? currencies.NGN?.spot ?? 0.01156;
  const ngnRate = currencies.NGN?.rate ?? 0.240;
  const ngnForward12m = ngnSpot * ((1 + zarRate) / (1 + ngnRate));
  const ngnForward6m = ngnSpot * ((1 + zarRate * 0.5) / (1 + ngnRate * 0.5));
  const ngnForward3m = ngnSpot * ((1 + zarRate * 0.25) / (1 + ngnRate * 0.25));

  const kesSpot = currencies.KES?.path?.[pIndex] ?? currencies.KES?.spot ?? 0.1435;
  const kesRate = currencies.KES?.rate ?? 0.140;
  const kesForward12m = kesSpot * ((1 + zarRate) / (1 + kesRate));
  const kesForward6m = kesSpot * ((1 + zarRate * 0.5) / (1 + kesRate * 0.5));
  const kesForward3m = kesSpot * ((1 + zarRate * 0.25) / (1 + kesRate * 0.25));

  return (
    <div className="space-y-6">
      {/* Desk Rates Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900">Interbank FX Desk & Covered Interest Parity (CIP)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live Treasury Quotes for Year {period} Planning & Hedging Execution</p>
          </div>
          <div className="text-xs font-mono bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold">
            Base Currency: ZAR · Interbank Rate: {formatPercent(zarRate, 2)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 text-left">Currency Pair</th>
                <th className="py-3 px-4 text-right">Opening Spot (S₀)</th>
                <th className="py-3 px-4 text-right">Foreign Rate (r_f)</th>
                <th className="py-3 px-4 text-right">Rate Diff (ZAR − r_f)</th>
                <th className="py-3 px-4 text-right">3M Forward</th>
                <th className="py-3 px-4 text-right">6M Forward</th>
                <th className="py-3 px-4 text-right font-bold text-blue-900 bg-blue-50/50">12M Forward Rate</th>
                <th className="py-3 px-4 text-right">Implied Carry %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs sm:text-sm">
              {/* USD */}
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-600 mr-2" />
                  USD / ZAR
                </td>
                <td className="py-3 px-4 text-right">R {formatNumber(usdSpot, 2)}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-700">{formatPercent(usdRate, 2)}</td>
                <td className="py-3 px-4 text-right font-bold text-emerald-600">+{formatPercent(zarRate - usdRate, 2)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(usdForward3m, 2)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(usdForward6m, 2)}</td>
                <td className="py-3 px-4 text-right font-bold text-blue-900 bg-blue-50/40">R {formatNumber(usdForward12m, 2)}</td>
                <td className="py-3 px-4 text-right font-bold text-rose-600">+{formatPercent((usdForward12m / usdSpot) - 1, 1)} (Cost)</td>
              </tr>

              {/* NGN */}
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mr-2" />
                  NGN / ZAR
                </td>
                <td className="py-3 px-4 text-right">R {formatNumber(ngnSpot, 5)}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-700">{formatPercent(ngnRate, 2)}</td>
                <td className="py-3 px-4 text-right font-bold text-rose-600">{formatPercent(zarRate - ngnRate, 2)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(ngnForward3m, 5)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(ngnForward6m, 5)}</td>
                <td className="py-3 px-4 text-right font-bold text-blue-900 bg-blue-50/40">R {formatNumber(ngnForward12m, 5)}</td>
                <td className="py-3 px-4 text-right font-bold text-amber-600">{formatPercent((ngnForward12m / ngnSpot) - 1, 1)} (Discount)</td>
              </tr>

              {/* KES */}
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-amber-600 mr-2" />
                  KES / ZAR
                </td>
                <td className="py-3 px-4 text-right">R {formatNumber(kesSpot, 4)}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-700">{formatPercent(kesRate, 2)}</td>
                <td className="py-3 px-4 text-right font-bold text-rose-600">{formatPercent(zarRate - kesRate, 2)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(kesForward3m, 4)}</td>
                <td className="py-3 px-4 text-right">R {formatNumber(kesForward6m, 4)}</td>
                <td className="py-3 px-4 text-right font-bold text-blue-900 bg-blue-50/40">R {formatNumber(kesForward12m, 4)}</td>
                <td className="py-3 px-4 text-right font-bold text-amber-600">{formatPercent((kesForward12m / kesSpot) - 1, 1)} (Discount)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanatory Deep Dive Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h4 className="font-bold text-slate-900 flex items-center text-sm">
            <Info className="w-4 h-4 mr-2 text-indigo-600" />
            Covered Interest Parity Formula
          </h4>
          <div className="p-3 bg-slate-50 rounded-lg font-mono text-xs text-slate-800 text-center border border-slate-200">
            Forward Rate = Spot × [ (1 + r_ZAR × t) / (1 + r_foreign × t) ]
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Forward exchange rates are determined mathematically by interest rate differentials between countries,
            not by speculation or forecasters' predictions. An arbitrage-free market ensures that borrowing in one currency,
            converting to another, investing, and converting back yields the identical return.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h4 className="font-bold text-slate-900 flex items-center text-sm">
            <Shield className="w-4 h-4 mr-2 text-emerald-600" />
            Decision Guide: When Should You Hedge?
          </h4>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
            <li>
              <strong>USD Procurement:</strong> Hedging eliminates the risk of an adverse Rand blow-out (devaluation),
              protecting your gross margins, but you pay the ~6.7% interest rate differential.
            </li>
            <li>
              <strong>NGN / KES Revenue:</strong> Because African interest rates are higher than ZAR rates, forwards price
              at a discount. Hedging locks in certainty, protecting against catastrophic currency crashes (such as Naira devaluations).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
