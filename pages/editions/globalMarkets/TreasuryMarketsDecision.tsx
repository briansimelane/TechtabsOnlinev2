import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../../contexts/SimulationContext';
import { EDITIONS } from '../../../utils/editions';
import { calculateForwardRate, getCurrencySpots } from '../../../utils/editions/globalMarkets/engine';
import { mergeGlobalMarketsDecisions } from '../../../utils/editions/globalMarkets/defaults';
import { formatCurrency, formatPercent, formatNumber, parseNumber } from '../../../utils/numberFormat';
import { Globe, Shield, DollarSign, TrendingUp, AlertTriangle, ArrowRight, CheckCircle2, Lock, Info, Percent, X, Building2, Truck, BarChart3, AlertCircle } from 'lucide-react';
import { ProductId } from '../../../types';
import { REGIONAL_DOSSIERS } from './regionalDossiers';
import DecisionsSummary from '../../../components/DecisionsSummary';

export const TreasuryMarketsDecision: React.FC = () => {
  const { currentTeam, decisions, updateDecisions, classes, currentClassId } = useSimulation();
  const currentClass = classes.find(c => c.id === currentClassId);
  const edition = EDITIONS['global-markets'];

  const gmDecisions = mergeGlobalMarketsDecisions(decisions);
  const period = currentTeam.currentPeriod;

  const [activeTab, setActiveTab] = useState<'markets' | 'hedging' | 'funding'>('markets');
  const [selectedModalMarket, setSelectedModalMarket] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedModalMarket(null);
      }
    };
    if (selectedModalMarket) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedModalMarket]);

  if (!edition) {
    return <div className="p-8 text-center text-slate-500">Global Markets Edition is not loaded.</div>;
  }

  // Get currency spots
  const usdSpots = getCurrencySpots(edition, 'USD', period);
  const ngnSpots = getCurrencySpots(edition, 'NGN', period);
  const kesSpots = getCurrencySpots(edition, 'KES', period);

  // CIP Forward Rates
  const usdFwd12 = calculateForwardRate(usdSpots.openSpot, usdSpots.rateZAR, usdSpots.rateForeign, 12);
  const ngnFwd12 = calculateForwardRate(ngnSpots.openSpot, ngnSpots.rateZAR, ngnSpots.rateForeign, 12);
  const kesFwd6 = calculateForwardRate(kesSpots.openSpot, kesSpots.rateZAR, kesSpots.rateForeign, 6);

  // Check covenants history from previous period
  const prevRec = currentTeam.history?.[period - 1];
  const prevBreached = (prevRec?.gm?.covenants?.breached?.length || 0) > 0;

  const handleUpdateMarket = (marketId: string, field: string, value: any) => {
    const updatedMarkets = {
      ...(gmDecisions.markets || {}),
      [marketId]: {
        ...(gmDecisions.markets?.[marketId] || {}),
        [field]: value
      }
    };
    updateDecisions('markets' as any, updatedMarkets as any);
  };

  const handleUpdateMarketPrice = (marketId: string, prod: ProductId, price: number) => {
    if (marketId === 'za') {
      updateDecisions('marketing', {
        prices: {
          ...decisions.marketing.prices,
          [prod]: price
        }
      });
    }
    const m = gmDecisions.markets?.[marketId];
    const updatedPrices = { ...(m?.prices || {}), [prod]: price };
    handleUpdateMarket(marketId, 'prices', updatedPrices);
  };

  const handleUpdateMarketTerms = (marketId: string, prod: ProductId, days: number) => {
    if (marketId === 'za') {
      updateDecisions('finance', {
        debtorsDays: {
          ...decisions.finance.debtorsDays,
          [prod]: days
        }
      });
    }
    const m = gmDecisions.markets?.[marketId];
    const updatedTerms = { ...(m?.debtorDays || {}), [prod]: days };
    handleUpdateMarket(marketId, 'debtorDays', updatedTerms);
  };

  const handleUpdateTreasury = (field: string, value: any) => {
    const updatedTreasury = {
      ...(gmDecisions.treasury || {}),
      [field]: value
    };
    updateDecisions('treasury' as any, updatedTreasury as any);
  };

  const handleUpdateHedge = (exposureId: string, coverPct: number, tenorMonths: 6 | 12) => {
    const currentHedges = gmDecisions.treasury?.hedges || {};
    const updatedHedges = {
      ...currentHedges,
      [exposureId]: { coverPct, tenorMonths }
    };
    handleUpdateTreasury('hedges', updatedHedges);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Treasury & International Markets</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Manage multi-country expansion across Africa, manage currency exposure via covered interest parity forwards, and control covenant leverage.
          </p>
        </div>

        {prevBreached && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-3 text-red-800 text-xs">
            <AlertTriangle className="text-red-600 w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-900">Prior Covenant Breach Alert</p>
              <p className="text-red-700">+2.5% debt spread penalty applied. Dividends locked to 0 for Period {period}.</p>
            </div>
          </div>
        )}
      </div>

      {/* Decision Summary KPI strip */}
      <DecisionsSummary />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('markets')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'markets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe size={18} />
          <span>Regional Market Expansion</span>
        </button>

        <button
          onClick={() => setActiveTab('hedging')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'hedging'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield size={18} />
          <span>FX Risk & Market Desk</span>
        </button>

        <button
          onClick={() => setActiveTab('funding')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'funding'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign size={18} />
          <span>Funding & Capital Structure</span>
        </button>
      </div>

      {/* TAB 1: REGIONAL MARKET EXPANSION */}
      {activeTab === 'markets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {edition.markets.map(market => {
              const mDec = gmDecisions.markets?.[market.id];
              const isActive = market.isHome ? true : (mDec?.active ?? false);
              const spots = getCurrencySpots(edition, market.currency, period);
              const selectedChannel = mDec?.channel || (market.channelOptions.includes('DISTRIBUTOR') ? 'DISTRIBUTOR' : 'OWN');
              const currentEntryCost = market.isHome
                ? 0
                : (selectedChannel === 'DISTRIBUTOR'
                    ? (market.distributorEntryCost ?? Math.round(market.entryCost * 0.4))
                    : market.entryCost);

              return (
                <div
                  key={market.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
                    isActive ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100' : 'border-slate-200 opacity-90'
                  }`}
                >
                  <div className={`p-5 border-b ${market.isHome ? 'bg-slate-50' : isActive ? 'bg-indigo-50/50' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-900">{market.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-700">
                            {market.currency}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {market.isHome ? (
                            'Domestic Base Market'
                          ) : (
                            <>
                              Entry Capital:{' '}
                              <span className="font-bold font-mono text-slate-800">{formatCurrency(currentEntryCost)}</span>
                              <span className="text-[11px] text-slate-500 ml-1">
                                ({selectedChannel === 'OWN' ? 'Company Stores' : 'Distributor Model'})
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedModalMarket(market.id)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                          title="View regional macroeconomic intelligence, demand forecast & channel comparison"
                        >
                          <Info size={13} />
                          <span>Regional Info</span>
                        </button>

                        {market.isHome ? (
                          <span className="text-xs font-semibold px-2.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateMarket(market.id, 'active', !isActive)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              isActive
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                            }`}
                          >
                            {isActive ? 'Exit Market' : 'Enter Market'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4 flex-1">
                    {/* Market Characteristics */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block">FX Spot (ZAR/{market.currency}):</span>
                        <span className="font-mono font-bold text-slate-700">
                          {market.currency === 'ZAR' ? '1.0000' : spots.avgSpot.toFixed(5)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">WACC Premium:</span>
                        <span className="font-mono font-bold text-slate-700">
                          +{formatPercent(market.countryRiskPremium)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Repatriation:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {formatPercent(market.repatriationPct)}
                          {market.repatriationPct < 1 && ' (trapped cash)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Import Duty:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {market.importDuty ? formatPercent(market.importDuty) : '0.0%'}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <>
                        {/* Channel Selection */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-bold text-slate-700">Sales Channel</label>
                            {!market.isHome && (
                              <span className="text-[10px] text-slate-500">
                                {selectedChannel === 'OWN' ? 'Direct CapEx · 100% Margin' : 'Asset-Light · Wholesale Margin'}
                              </span>
                            )}
                          </div>
                          {market.isHome ? (
                            <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                              <span>Company stores and Agents</span>
                              <span className="text-[10px] text-blue-600 font-medium">Configured in Marketing</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {market.channelOptions.map(opt => {
                                const isSelected = selectedChannel === opt;
                                const optCost = opt === 'DISTRIBUTOR'
                                  ? (market.distributorEntryCost ?? Math.round(market.entryCost * 0.4))
                                  : market.entryCost;
                                const optMarginCut = opt === 'DISTRIBUTOR' ? (market.distributorMargin || 0) : 0;

                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleUpdateMarket(market.id, 'channel', opt)}
                                    className={`p-2.5 rounded-lg border transition-all text-left flex flex-col justify-between cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-500'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs">
                                        {opt === 'OWN' ? 'Company Stores' : 'Distributor'}
                                      </span>
                                      {isSelected && <CheckCircle2 size={13} className="text-blue-600 flex-shrink-0" />}
                                    </div>
                                    <div className="mt-1.5 text-[10px] space-y-0.5 text-slate-500">
                                      <div>CapEx: <span className="font-mono font-bold text-slate-700">{formatCurrency(optCost)}</span></div>
                                      <div>Wholesale cut: <span className="font-mono font-bold text-slate-700">{formatPercent(optMarginCut)}</span></div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Local Currency Prices */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              Unit Prices ({market.currency})
                            </label>
                            {market.isHome && (
                              <span className="text-[10px] text-blue-600 font-medium">Linked to Marketing & Sales</span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {(['techbook', 'zroid', 'itab'] as ProductId[]).map(pid => {
                              const pLabel = pid === 'techbook' ? 'TechBook' : pid === 'zroid' ? 'Zroid' : 'iTab';
                              const currentVal = market.isHome
                                ? (decisions.marketing.prices?.[pid] ?? mDec?.prices?.[pid] ?? 0)
                                : (mDec?.prices?.[pid] ?? 0);
                              const currPrefix = market.currency === 'ZAR' ? 'R' : market.currency === 'NGN' ? '₦' : 'KSh';

                              return (
                                <div key={pid} className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-slate-600 w-20">{pLabel}</span>
                                  <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1.5 text-blue-400 text-xs font-bold">{currPrefix}</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={formatNumber(currentVal)}
                                      onChange={e => handleUpdateMarketPrice(market.id, pid, parseNumber(e.target.value))}
                                      className="w-full text-right text-xs pl-7 pr-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 font-mono font-bold rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Debtor Days */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              Customer Credit Terms (Days)
                            </label>
                            {market.isHome && (
                              <span className="text-[10px] text-blue-600 font-medium">Linked to Finance Strategy</span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {(['techbook', 'zroid', 'itab'] as ProductId[]).map(pid => {
                              const pLabel = pid === 'techbook' ? 'TechBook' : pid === 'zroid' ? 'Zroid' : 'iTab';
                              const currentDays = market.isHome
                                ? (decisions.finance.debtorsDays?.[pid] ?? mDec?.debtorDays?.[pid] ?? 45)
                                : (mDec?.debtorDays?.[pid] ?? market.debtorDaysDefault);

                              return (
                                <div key={pid} className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-slate-600 w-20">{pLabel}</span>
                                  <select
                                    value={currentDays}
                                    onChange={e => handleUpdateMarketTerms(market.id, pid, Number(e.target.value))}
                                    className="flex-1 text-xs py-1.5 px-2 bg-blue-50 border border-blue-200 text-blue-800 font-mono font-bold rounded text-center cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                  >
                                    {market.isHome ? (
                                      <>
                                        <option value="0">0 Days</option>
                                        <option value="30">30 Days</option>
                                        <option value="45">45 Days</option>
                                        <option value="60">60 Days</option>
                                        <option value="90">90 Days</option>
                                      </>
                                    ) : (
                                      [15, 30, 40, 45, 60, 75, 90].map(d => (
                                        <option key={d} value={d}>{d} Days</option>
                                      ))
                                    )}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <p>Market not activated this period.</p>
                        <p className="mt-1">Click "Enter Market" above to activate expansion.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FX RISK & HEDGING DESK */}
      {activeTab === 'hedging' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-950">Market Desk Covered Interest Parity (CIP)</p>
              <p className="mt-0.5">
                Forwards are priced purely by covered interest parity: <code className="font-mono font-bold">Forward = Spot × (1 + rate_ZAR × t) / (1 + rate_foreign × t)</code>.
                Because ZAR rates (11.5%) exceed USD rates (4.5%), 12-month USD forward prices at ~19.74 (a 6.7% carry cost). For NGN (24%), the forward prices at a steep discount to spot.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* USD Costs Hedge Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">USD Supplier Costs (Zen & Cheng)</h3>
                  <p className="text-xs text-slate-500">Payable exposure: Component & Finished Goods purchases</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200">
                  Short USD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">USD Spot Rate:</span>
                  <span className="font-mono font-bold text-slate-800">R{usdSpots.openSpot.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">12m Forward Rate:</span>
                  <span className="font-mono font-bold text-indigo-600">R{usdFwd12.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Interest Differential:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ZAR 11.5% vs USD 4.5%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Carry Cost:</span>
                  <span className="font-mono font-bold text-amber-600">+6.70% carry</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Forward Hedge Cover:</label>
                  <span className="font-mono font-bold text-blue-800 text-xs bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {gmDecisions.treasury?.hedges?.USD_COSTS?.coverPct ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="10"
                  value={gmDecisions.treasury?.hedges?.USD_COSTS?.coverPct ?? 0}
                  onChange={e => handleUpdateHedge('USD_COSTS', Number(e.target.value), gmDecisions.treasury?.hedges?.USD_COSTS?.tenorMonths || 12)}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (Uncovered)</span>
                  <span>50%</span>
                  <span>100% (Full Cover)</span>
                  <span className="text-red-500 font-bold">120% (Over-hedged)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tenor</label>
                <div className="grid grid-cols-2 gap-2">
                  {[6, 12].map(tenor => (
                    <button
                      key={tenor}
                      type="button"
                      onClick={() => handleUpdateHedge('USD_COSTS', gmDecisions.treasury?.hedges?.USD_COSTS?.coverPct ?? 0, tenor as 6 | 12)}
                      className={`text-xs py-2 rounded-lg font-bold border transition-all ${
                        (gmDecisions.treasury?.hedges?.USD_COSTS?.tenorMonths ?? 12) === tenor
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tenor} Months
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* NGN Revenue Hedge Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">NGN Revenue Receipts (Nigeria)</h3>
                  <p className="text-xs text-slate-500">Receivable exposure: Local sales + opening receivables</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                  Long NGN
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">NGN Spot Rate:</span>
                  <span className="font-mono font-bold text-slate-800">R{ngnSpots.openSpot.toFixed(5)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">12m Forward Rate:</span>
                  <span className="font-mono font-bold text-indigo-600">R{ngnFwd12.toFixed(5)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Interest Differential:</span>
                  <span className="font-mono font-bold text-slate-800">ZAR 11.5% vs NGN 24.0%</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Carry Discount:</span>
                  <span className="font-mono font-bold text-red-600">-10.1% discount</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Forward Hedge Cover:</label>
                  <span className="font-mono font-bold text-blue-800 text-xs bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {gmDecisions.treasury?.hedges?.NGN_REVENUE?.coverPct ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={gmDecisions.treasury?.hedges?.NGN_REVENUE?.coverPct ?? 0}
                  onChange={e => handleUpdateHedge('NGN_REVENUE', Number(e.target.value), gmDecisions.treasury?.hedges?.NGN_REVENUE?.tenorMonths || 12)}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tenor</label>
                <div className="grid grid-cols-2 gap-2">
                  {[6, 12].map(tenor => (
                    <button
                      key={tenor}
                      type="button"
                      onClick={() => handleUpdateHedge('NGN_REVENUE', gmDecisions.treasury?.hedges?.NGN_REVENUE?.coverPct ?? 0, tenor as 6 | 12)}
                      className={`text-xs py-2 rounded-lg font-bold border transition-all ${
                        (gmDecisions.treasury?.hedges?.NGN_REVENUE?.tenorMonths ?? 12) === tenor
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tenor} Months
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* KES Revenue Hedge Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">KES Revenue Receipts (Kenya)</h3>
                  <p className="text-xs text-slate-500">Receivable exposure: Local sales in Kenya</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                  Long KES
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">KES Spot Rate:</span>
                  <span className="font-mono font-bold text-slate-800">R{kesSpots.openSpot.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">6m Forward Rate:</span>
                  <span className="font-mono font-bold text-indigo-600">R{kesFwd6.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Max Allowed Tenor:</span>
                  <span className="font-mono font-bold text-amber-700">6 Months (Shallow Market)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Interest Differential:</span>
                  <span className="font-mono font-bold text-slate-800">ZAR 11.5% vs KES 14.0%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Forward Hedge Cover:</label>
                  <span className="font-mono font-bold text-blue-800 text-xs bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {gmDecisions.treasury?.hedges?.KES_REVENUE?.coverPct ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={gmDecisions.treasury?.hedges?.KES_REVENUE?.coverPct ?? 0}
                  onChange={e => handleUpdateHedge('KES_REVENUE', Number(e.target.value), 6)}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tenor (Fixed to 6m)</label>
                <div className="p-2.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Lock size={14} /> 6 Months (12-month forward unavailable in Nairobi market)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FUNDING & CAPITAL STRUCTURE */}
      {activeTab === 'funding' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Funding Currency Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Debt Facility Denomination</h3>
                <p className="text-xs text-slate-500">Choose the currency in which long-term borrowing is denominated</p>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'ZAR', name: 'South African Rand (ZAR)', rate: '11.50%', desc: 'Domestic funding. No currency revaluation risk on the balance sheet.' },
                  { id: 'USD', name: 'US Dollar (USD)', rate: '6.00%', desc: 'Substantially lower initial coupon, but balance sheet principal and interest revalue at closing USD spot.' },
                  { id: 'LOCAL', name: 'Local Currencies (NGN/KES)', rate: '14.0% - 24.0%', desc: 'High nominal rates, matches local emerging market cash flows.' }
                ].map(curr => (
                  <div
                    key={curr.id}
                    onClick={() => handleUpdateTreasury('fundingCurrency', curr.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      (gmDecisions.treasury?.fundingCurrency || 'ZAR') === curr.id
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-slate-900">{curr.name}</span>
                      <span className="font-mono font-extrabold text-blue-700 text-sm">{curr.rate}</span>
                    </div>
                    <p className="text-xs text-slate-500">{curr.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interest Rate Basis & Target Card */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Interest Rate Basis</h3>
                  <p className="text-xs text-slate-500">Fixed rate certainty vs floating rate exposure</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'FIXED', name: 'Fixed Rate', badge: '+1.00% Premium', desc: 'Locks borrowing rate for certainty.' },
                    { id: 'FLOATING', name: 'Floating Rate', badge: 'Variable', desc: 'Exposed to macroeconomic benchmark rate shocks.' }
                  ].map(basis => (
                    <button
                      key={basis.id}
                      type="button"
                      onClick={() => handleUpdateTreasury('rateBasis', basis.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        (gmDecisions.treasury?.rateBasis || 'FIXED') === basis.id
                          ? 'border-blue-600 bg-blue-50/50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-slate-900">{basis.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">{basis.badge}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{basis.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Planning (Period 1 only) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-blue-600" size={20} />
                  <h3 className="font-bold text-base text-slate-900">Planned Net Profit Commitment</h3>
                </div>
                <p className="text-xs text-slate-500">
                  {period === 1
                    ? 'Target submitted in Period 1 governs the Delivery Against Plan measure on the Global Markets Scorecard across all simulation periods.'
                    : 'Target submitted in Period 1 is locked for evaluation on the Value Creation Scorecard.'}
                </p>

                {period === 1 ? (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Net Profit (ZAR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-blue-400 text-sm font-bold">R</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(gmDecisions.treasury?.plannedNetProfit || 0)}
                        onChange={e => handleUpdateTreasury('plannedNetProfit', parseNumber(e.target.value))}
                        placeholder="e.g. 35,000,000"
                        className="w-full pl-8 pr-3 py-2 text-sm bg-blue-50 border border-blue-200 text-blue-800 font-bold font-mono rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono font-bold text-slate-700 flex justify-between items-center">
                    <span>Year 1 Target:</span>
                    <span>{formatCurrency(gmDecisions.treasury?.plannedNetProfit || 0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGIONAL INTELLIGENCE POPUP MODAL */}
      {selectedModalMarket && REGIONAL_DOSSIERS[selectedModalMarket] && (() => {
        const dossier = REGIONAL_DOSSIERS[selectedModalMarket];
        const isMarketActive = selectedModalMarket === 'za' ? true : (gmDecisions.markets?.[selectedModalMarket]?.active ?? false);
        const chosenChannel = gmDecisions.markets?.[selectedModalMarket]?.channel || 'DISTRIBUTOR';

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedModalMarket(null)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{dossier.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">{dossier.name} Dossier</h2>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {dossier.currency}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-200 text-slate-700">
                        {dossier.region}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{dossier.tagline}</p>
                  </div>
                </div>

                {/* Quick Switcher & Close Button */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                    {Object.keys(REGIONAL_DOSSIERS).map(mKey => {
                      const d = REGIONAL_DOSSIERS[mKey];
                      const isCurrent = mKey === selectedModalMarket;
                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => setSelectedModalMarket(mKey)}
                          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                            isCurrent
                              ? 'bg-white text-indigo-700 shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>{d.flag}</span>
                          <span>{d.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedModalMarket(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Close intelligence modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 text-slate-700 flex-1">
                {/* Warning Banner if Trapped Cash */}
                {dossier.isTrappedCashWarning && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
                    <AlertTriangle className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Foreign Exchange & Liquidity Warning (Trapped Cash)</p>
                      <p className="mt-0.5 text-amber-800">{dossier.repatriationDetail}</p>
                    </div>
                  </div>
                )}

                {/* Section 1: Macro & Market Characteristics Grid */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-indigo-600" />
                    <span>Market Demand, Pricing & Macro Economics</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* 1. Demand & CAGR */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="text-slate-400 font-medium">Total Addressable Demand</div>
                      <div className="font-bold text-base text-slate-900">{dossier.marketDemandTotal}</div>
                      <div className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold rounded text-[11px]">
                        CAGR: {dossier.demandCagr}
                      </div>
                      <div className="pt-1 text-[11px] text-slate-500 space-y-0.5">
                        {dossier.unitBreakdown.map(u => (
                          <div key={u.product} className="flex justify-between">
                            <span>{u.product}:</span>
                            <span className="font-mono font-semibold text-slate-700">{u.units}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Price Tolerance */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="text-slate-400 font-medium">Pricing Elasticity Index</div>
                      <div className="font-bold text-base text-slate-900">{dossier.priceIndexText}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed pt-1">
                        {dossier.priceIndexDetail}
                      </div>
                    </div>

                    {/* 3. WACC Hurdle Rate */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="text-slate-400 font-medium">Hurdle Rate (Cost of Capital)</div>
                      <div className="font-bold text-base text-indigo-700">{dossier.hurdleRate}</div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        Risk Premium: <span className="font-mono font-bold text-slate-900">{dossier.countryRiskPremium}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed pt-1">
                        Economic Profit (EVA) deducts a capital charge of <span className="font-semibold text-slate-700">{dossier.hurdleRate.split(' ')[0]}</span> on all invested capital.
                      </div>
                    </div>

                    {/* 4. Tariffs & FX */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="text-slate-400 font-medium">Import Duties & Repatriation</div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tariff:</span>
                        <span className="font-bold font-mono text-slate-800">{dossier.importDuty}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Repatriation:</span>
                        <span className="font-bold font-mono text-slate-800">{dossier.repatriationPct.split(' ')[0]}</span>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-500 leading-relaxed">
                        {dossier.importDutyDetail}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: FX Dynamics & Hedging Desk */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Shield size={14} className="text-indigo-600" />
                      Foreign Exchange Dynamics & Forward Hedging Desk
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                      Spot: {dossier.fxSpotText}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{dossier.fxDynamics}</p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-indigo-700 font-semibold">
                    <CheckCircle2 size={13} />
                    <span>Hedging Availability: {dossier.hedgingAvailable}</span>
                  </div>
                </div>

                {/* Section 3: Channel Economics Comparison Table */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Building2 size={14} className="text-indigo-600" />
                      <span>Sales Channel Economics & Strategy Comparison</span>
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Configure your expansion channel under the Regional Market Expansion tab
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {dossier.channels.map(chan => {
                      const isSelectedChan = isMarketActive && chosenChannel === chan.type;

                      return (
                        <div
                          key={chan.name}
                          className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                            isSelectedChan
                              ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                {chan.type === 'OWN' ? (
                                  <Building2 size={18} className="text-indigo-600" />
                                ) : (
                                  <Truck size={18} className="text-blue-600" />
                                )}
                                <h4 className="font-bold text-sm text-slate-900">{chan.name}</h4>
                              </div>
                              {isSelectedChan && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Active Choice
                                </span>
                              )}
                            </div>

                            <div className="space-y-2 py-2 border-y border-slate-100 text-slate-600">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Entry CapEx:</span>
                                <span className="font-bold font-mono text-slate-800">{chan.entryCapEx}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Wholesale Cut:</span>
                                <span className="font-bold font-mono text-slate-800">{chan.marginCut}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Debtor Days:</span>
                                <span className="font-bold font-mono text-slate-800">{chan.debtorTerms}</span>
                              </div>
                            </div>

                            <p className="mt-3 text-slate-600 text-[11px] leading-relaxed">
                              {chan.operationalProfile}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-600 block">Balance Sheet Impact:</span>
                            {chan.balanceSheetImpact}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Strategic Takeaways & Analyst Verdict */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Info size={14} className="text-indigo-600" />
                    <span>Executive Verdict: Is Entering {dossier.name} Worth It?</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        Key Upside Potential
                      </span>
                      <p className="text-slate-600 leading-relaxed text-[11px]">{dossier.strategicTakeaways.opportunity}</p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-semibold text-amber-800 flex items-center gap-1">
                        <AlertTriangle size={12} className="text-amber-600" />
                        Primary Risk Exposures
                      </span>
                      <ul className="text-slate-600 list-disc list-inside space-y-0.5 text-[11px]">
                        {dossier.strategicTakeaways.risks.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-indigo-100 text-slate-700 leading-relaxed text-[11px]">
                    <span className="font-bold text-indigo-900 block mb-0.5">Analyst Recommendation:</span>
                    {dossier.strategicTakeaways.recommendation}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Status:</span>
                  {isMarketActive ? (
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Active in Portfolio
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-500">Inactive</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isMarketActive && selectedModalMarket !== 'za' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateMarket(selectedModalMarket, 'active', true);
                        setSelectedModalMarket(null);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      Enter {dossier.name} Market
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedModalMarket(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Close Intelligence
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TreasuryMarketsDecision;
