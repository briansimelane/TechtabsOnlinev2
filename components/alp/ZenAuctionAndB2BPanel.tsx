import React, { useState, useEffect, useMemo } from 'react';
import {
  Gavel,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Award,
  Handshake,
  Sliders,
  RotateCcw,
  Users,
  TrendingUp,
  CheckSquare,
  Square
} from 'lucide-react';
import { useSimulation } from '../../contexts/SimulationContext';
import { ProductId } from '../../types';
import {
  COMPONENT_COSTS,
  FINISHED_GOODS_COSTS,
  SUPPLIER_METRICS,
  ZEN_RESERVE_PRICE,
  ZEN_TRANSFER_COSTS
} from '../../constants';
import {
  getSupplierComponentCost,
  getSupplierFinishedGoodsCost,
  getSupplierPaymentTerms,
  getSupplierQuality,
  getSupplierDeliveryReliability,
  getSupplierLeadTime,
  getSupplierService,
  getSupplierCapacity,
  getSupplierInnovation
} from '../../utils/industryPerformance';

const INCREMENT_OPTIONS = [
  { label: '+R 1m', value: 1_000_000 },
  { label: '+R 5m', value: 5_000_000 },
  { label: '+R 10m', value: 10_000_000 },
  { label: '+R 25m', value: 25_000_000 },
  { label: '+R 50m', value: 50_000_000 },
];

const PRODUCTS: { id: ProductId; name: string }[] = [
  { id: 'techbook', name: 'TechBook' },
  { id: 'zroid', name: 'Zroid' },
  { id: 'itab', name: 'iTab' },
];

const formatZAR = (val: number) => `R ${Math.round(val).toLocaleString('en-ZA')}`;
const formatMillions = (val: number) => `R ${(val / 1_000_000).toFixed(2).replace(/\.00$/, '')}m`;

export const ZenAuctionAndB2BPanel: React.FC = () => {
  const {
    currentClassId,
    classes,
    currentTeam,
    currentRole,
    updateZenAuctionConfig,
    placeZenBid,
    awardZenAuction,
    confirmZenJvSplits,
    submitZenClientTermsAndPricing
  } = useSimulation();

  const currentClass = classes.find(c => c.id === currentClassId);
  if (!currentClass || !currentClass.isActionLearningProject) {
    return null;
  }

  const isFacilitator = currentRole === 'FACILITATOR' || currentRole === 'ADMIN';
  const activeTeams = useMemo(
    () => (currentClass.teams || []).filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id)),
    [currentClass.teams]
  );

  const zen = currentClass.zenAuction || {
    startTime: '14:45',
    endTime: '15:00',
    reservePrice: ZEN_RESERVE_PRICE,
    manualStatus: 'AUTO' as const,
    bids: [],
    isAwarded: false,
    jvSplits: {},
    jvConfirmed: false
  };

  // Live Wall-Clock State
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNowDate(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nowSeconds = nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds();
  const clockStr = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}:${String(nowDate.getSeconds()).padStart(2, '0')}`;

  const windowBounds = useMemo(() => {
    const [sh, sm] = (zen.startTime || '14:45').split(':').map(Number);
    const [eh, em] = (zen.endTime || '15:00').split(':').map(Number);
    return {
      startSec: (sh || 0) * 3600 + (sm || 0) * 60,
      endSecInclusive: (eh || 0) * 3600 + (em || 0) * 60 + 59
    };
  }, [zen.startTime, zen.endTime]);

  const auctionStatus = useMemo(() => {
    if (zen.isAwarded || zen.manualStatus === 'FORCE_CLOSED') return 'CLOSED';
    if (zen.manualStatus === 'FORCE_OPEN') return 'OPEN';
    if (nowSeconds < windowBounds.startSec) return 'NOT_STARTED';
    if (nowSeconds <= windowBounds.endSecInclusive) return 'OPEN';
    return 'CLOSED';
  }, [zen.isAwarded, zen.manualStatus, nowSeconds, windowBounds]);

  const remainingSeconds = Math.max(0, windowBounds.endSecInclusive - nowSeconds);

  // Current highest bid
  const currentHighBid = useMemo(() => {
    const list = zen.bids || [];
    if (list.length === 0) return null;
    return list.reduce((max, b) => (b.amount > max.amount ? b : max), list[0]);
  }, [zen.bids]);

  // Facilitator can test bidding on behalf of a team; student bids as currentTeam.id
  const [facSelectedBidderId, setFacSelectedBidderId] = useState<string>(activeTeams[0]?.id || '');
  useEffect(() => {
    if (!facSelectedBidderId && activeTeams[0]?.id) {
      setFacSelectedBidderId(activeTeams[0].id);
    }
  }, [activeTeams, facSelectedBidderId]);

  const actingTeamId = isFacilitator ? facSelectedBidderId : currentTeam.id;
  const actingTeam = activeTeams.find(t => t.id === actingTeamId) || currentTeam;

  const isActingTeamHighestBidder = Boolean(currentHighBid && currentHighBid.teamId === actingTeamId);

  const [selectedIncrement, setSelectedIncrement] = useState<number>(5_000_000);
  const [bidFeedback, setBidFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const baseBidAmount = currentHighBid ? currentHighBid.amount : (zen.reservePrice || ZEN_RESERVE_PRICE);
  const proposedBidAmount = baseBidAmount + selectedIncrement;

  const handleSubmitBid = async (incrementOverride?: number) => {
    if (!currentClassId) return;
    const inc = incrementOverride ?? selectedIncrement;
    const res = await placeZenBid(currentClassId, actingTeamId, inc);
    setBidFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message
    });
  };

  // ── JV Split Local Draft State ──
  const [localJvSplits, setLocalJvSplits] = useState<Record<string, number>>(zen.jvSplits || {});
  useEffect(() => {
    if (zen.jvSplits && Object.keys(zen.jvSplits).length > 0) {
      setLocalJvSplits(zen.jvSplits);
    } else if (zen.winningTeamId) {
      setLocalJvSplits({ [zen.winningTeamId]: 100 });
    }
  }, [zen.jvSplits, zen.winningTeamId]);

  const totalJvPct = useMemo(
    () => (Object.values(localJvSplits) as number[]).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [localJvSplits]
  );

  const canManageJvSplit =
    isFacilitator ||
    (zen.isAwarded && (zen.winningTeamId === currentTeam.id || (zen.jvSplits?.[currentTeam.id] || 0) > 0));

  const ownerTeamIds = useMemo(
    () => Object.keys(zen.jvSplits || {}).filter(id => (zen.jvSplits?.[id] || 0) > 0),
    [zen.jvSplits]
  );

  const isZenOwnerOrFacilitator =
    isFacilitator ||
    (zen.isAwarded && (ownerTeamIds.includes(currentTeam.id) || zen.winningTeamId === currentTeam.id));

  const nonOwnerTeams = useMemo(
    () => activeTeams.filter(t => !ownerTeamIds.includes(t.id)),
    [activeTeams, ownerTeamIds]
  );

  // ── Zen B2B Negotiations (Price & KPI Adjustments for Non-Owner Teams) ──
  const [selectedClientTeamIds, setSelectedClientTeamIds] = useState<string[]>([]);
  useEffect(() => {
    // Default select all non-owner teams when list updates
    setSelectedClientTeamIds(prev => {
      const valid = prev.filter(id => nonOwnerTeams.some(t => t.id === id));
      return valid.length > 0 ? valid : nonOwnerTeams.map(t => t.id);
    });
  }, [nonOwnerTeams]);

  const [b2bPrices, setB2bPrices] = useState<{
    componentCosts: Record<ProductId, number>;
    finishedGoodsCosts: Record<ProductId, number>;
    paymentTerms: number;
    quality: number;
    deliveryReliability: number;
    leadTime: number;
    service: number;
    capacity: number;
    innovation: number;
  }>({
    componentCosts: {
      techbook: COMPONENT_COSTS.techbook.Zen,
      zroid: COMPONENT_COSTS.zroid.Zen,
      itab: COMPONENT_COSTS.itab.Zen
    },
    finishedGoodsCosts: {
      techbook: FINISHED_GOODS_COSTS.techbook.Zen,
      zroid: FINISHED_GOODS_COSTS.zroid.Zen,
      itab: FINISHED_GOODS_COSTS.itab.Zen
    },
    paymentTerms: SUPPLIER_METRICS.Zen.terms,
    quality: SUPPLIER_METRICS.Zen.quality,
    deliveryReliability: 95,
    leadTime: SUPPLIER_METRICS.Zen.leadTime,
    service: SUPPLIER_METRICS.Zen.service,
    capacity: SUPPLIER_METRICS.Zen.capacity,
    innovation: SUPPLIER_METRICS.Zen.innovation
  });

  const [b2bSavedBanner, setB2bSavedBanner] = useState<string | null>(null);

  // Load a single team's existing Zen overrides into the form when clicking "Load Team's Current Settings"
  const loadClientTeamSettings = (teamId: string) => {
    const t = activeTeams.find(tm => tm.id === teamId);
    if (!t) return;
    const dec = t.draftDecisions;
    setB2bPrices({
      componentCosts: {
        techbook: getSupplierComponentCost('techbook', 'Zen', dec),
        zroid: getSupplierComponentCost('zroid', 'Zen', dec),
        itab: getSupplierComponentCost('itab', 'Zen', dec)
      },
      finishedGoodsCosts: {
        techbook: getSupplierFinishedGoodsCost('techbook', 'Zen', dec),
        zroid: getSupplierFinishedGoodsCost('zroid', 'Zen', dec),
        itab: getSupplierFinishedGoodsCost('itab', 'Zen', dec)
      },
      paymentTerms: getSupplierPaymentTerms('Zen', dec),
      quality: getSupplierQuality('Zen', dec),
      deliveryReliability: Math.round(getSupplierDeliveryReliability('Zen', dec) * 100),
      leadTime: getSupplierLeadTime('Zen', dec),
      service: getSupplierService('Zen', dec),
      capacity: getSupplierCapacity('Zen', dec),
      innovation: getSupplierInnovation('Zen', dec)
    });
  };

  const handleApplyB2BToSelectedTeams = async () => {
    if (!currentClassId || selectedClientTeamIds.length === 0) return;
    await submitZenClientTermsAndPricing(currentClassId, selectedClientTeamIds, {
      ...b2bPrices,
      deliveryReliability: b2bPrices.deliveryReliability / 100
    });
    const names = activeTeams
      .filter(t => selectedClientTeamIds.includes(t.id))
      .map(t => t.name)
      .join(', ');
    setB2bSavedBanner(`Saved Zen Pricing & KPIs for: ${names}`);
    setTimeout(() => setB2bSavedBanner(null), 5000);
  };

  const activeTransferCosts = zen.transferCosts || ZEN_TRANSFER_COSTS;

  // Live calculation of Zen Third-Party Sales & Profit from each buyer's Procurement decisions
  const b2bSalesSummary = useMemo(() => {
    let totalExternalUnits = 0;
    let totalExternalRevenue = 0;
    let totalExternalTransferCost = 0;
    let totalExternalProfit = 0;

    const rows = nonOwnerTeams.map(buyer => {
      const dec = buyer.draftDecisions;
      let units = 0;
      let rev = 0;
      let tCost = 0;

      PRODUCTS.forEach(p => {
        const alloc = dec?.procurement?.supplierAllocation?.[p.id]?.Zen;
        const cUnits = Number(alloc?.components) || 0;
        const fgUnits = Number(alloc?.finishedGoods) || 0;
        const cPrice = getSupplierComponentCost(p.id, 'Zen', dec);
        const fgPrice = getSupplierFinishedGoodsCost(p.id, 'Zen', dec);
        const cTransfer = activeTransferCosts[p.id]?.components ?? ZEN_TRANSFER_COSTS[p.id].components;
        const fgTransfer = activeTransferCosts[p.id]?.finishedGoods ?? ZEN_TRANSFER_COSTS[p.id].finishedGoods;

        units += cUnits + fgUnits;
        rev += cUnits * cPrice + fgUnits * fgPrice;
        tCost += cUnits * cTransfer + fgUnits * fgTransfer;
      });

      const profit = rev - tCost;
      totalExternalUnits += units;
      totalExternalRevenue += rev;
      totalExternalTransferCost += tCost;
      totalExternalProfit += profit;

      return {
        teamId: buyer.id,
        teamName: buyer.name,
        paymentTerms: getSupplierPaymentTerms('Zen', dec),
        quality: getSupplierQuality('Zen', dec),
        units,
        revenue: rev,
        transferCost: tCost,
        profit
      };
    });

    return {
      rows,
      totalExternalUnits,
      totalExternalRevenue,
      totalExternalTransferCost,
      totalExternalProfit
    };
  }, [nonOwnerTeams, activeTransferCosts]);

  return (
    <div className="space-y-6">
      {/* ── Facilitator Auction Configuration Strip ── */}
      {isFacilitator && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Facilitator Control — Year 3 Zen Open-Bid Auction
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Configure Auction Window & Status (Inclusive through {zen.endTime}:59)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateZenAuctionConfig(currentClass.id, { manualStatus: 'AUTO', isAwarded: false })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  zen.manualStatus === 'AUTO' && !zen.isAwarded
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Auto Clock ({zen.startTime}–{zen.endTime}:59)
              </button>
              <button
                type="button"
                onClick={() => updateZenAuctionConfig(currentClass.id, { manualStatus: 'FORCE_OPEN', isAwarded: false })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  zen.manualStatus === 'FORCE_OPEN' && !zen.isAwarded
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Force Open Now
              </button>
              <button
                type="button"
                onClick={() => updateZenAuctionConfig(currentClass.id, { manualStatus: 'FORCE_CLOSED' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  zen.manualStatus === 'FORCE_CLOSED'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Force Close
              </button>
              <button
                type="button"
                onClick={() =>
                  updateZenAuctionConfig(currentClass.id, {
                    bids: [],
                    isAwarded: false,
                    winningBidId: undefined,
                    winningTeamId: undefined,
                    winningTeamName: undefined,
                    winningAmount: undefined,
                    jvSplits: {},
                    jvConfirmed: false,
                    manualStatus: 'AUTO'
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Auction
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-600">Open Time:</label>
              <input
                type="time"
                value={zen.startTime}
                onChange={e => updateZenAuctionConfig(currentClass.id, { startTime: e.target.value })}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-600">Close Time (wins up to :59):</label>
              <input
                type="time"
                value={zen.endTime}
                onChange={e => updateZenAuctionConfig(currentClass.id, { endTime: e.target.value })}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-600">Min Asking Price (R):</label>
              <input
                type="number"
                step={5_000_000}
                value={zen.reservePrice || ZEN_RESERVE_PRICE}
                onChange={e =>
                  updateZenAuctionConfig(currentClass.id, {
                    reservePrice: Math.max(0, Number(e.target.value) || 0)
                  })
                }
                className="w-36 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 font-bold"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-slate-500">
                Server Clock: <strong className="font-mono text-slate-900">{clockStr}</strong>
              </span>
              <button
                type="button"
                disabled={!currentHighBid}
                onClick={() => awardZenAuction(currentClass.id)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                {zen.isAwarded ? 'Re-Award Highest Bid' : 'Close & Award Zen to Highest Bidder'}
              </button>
            </div>
          </div>

          {/* Facilitator Editable Zen Transfer Costs */}
          <div className="pt-3 border-t border-slate-100 text-xs">
            <div className="font-bold text-slate-600 mb-2">
              Zen Transfer Costs (Raw Material / Finished Goods per Unit — Applied to Winning JV):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRODUCTS.map(p => {
                const currentCosts = zen.transferCosts?.[p.id] || ZEN_TRANSFER_COSTS[p.id];
                return (
                  <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-500">Raw:</label>
                      <input
                        type="number"
                        value={currentCosts.components}
                        onChange={e => {
                          const existing = zen.transferCosts || ZEN_TRANSFER_COSTS;
                          updateZenAuctionConfig(currentClass.id, {
                            transferCosts: {
                              ...existing,
                              [p.id]: {
                                ...existing[p.id],
                                components: Math.max(0, Number(e.target.value) || 0)
                              }
                            }
                          });
                        }}
                        className="w-16 border border-slate-300 rounded px-1.5 py-1 font-bold text-slate-900 bg-white"
                      />
                      <label className="text-[11px] text-slate-500">FG:</label>
                      <input
                        type="number"
                        value={currentCosts.finishedGoods}
                        onChange={e => {
                          const existing = zen.transferCosts || ZEN_TRANSFER_COSTS;
                          updateZenAuctionConfig(currentClass.id, {
                            transferCosts: {
                              ...existing,
                              [p.id]: {
                                ...existing[p.id],
                                finishedGoods: Math.max(0, Number(e.target.value) || 0)
                              }
                            }
                          });
                        }}
                        className="w-16 border border-slate-300 rounded px-1.5 py-1 font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Live Open-Bid Auction Panel (Light Mode) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Zen Open-Bid Live Auction</h2>
              <p className="text-xs text-slate-500">
                Window: {zen.startTime}:00 to {zen.endTime}:59 • Minimum Reserve: {formatZAR(zen.reservePrice || ZEN_RESERVE_PRICE)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] uppercase font-bold text-slate-400">Live Time</div>
              <div className="text-base font-mono font-bold text-slate-800">{clockStr}</div>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${
                auctionStatus === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : auctionStatus === 'NOT_STARTED'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {zen.isAwarded
                ? `AWARDED TO ${zen.winningTeamName}`
                : auctionStatus === 'OPEN'
                ? `OPEN • ${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s left`
                : auctionStatus === 'NOT_STARTED'
                ? `OPENS AT ${zen.startTime}`
                : 'AUCTION CLOSED'}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 cols: Current High Bid & Increment Selector */}
          <div className="lg:col-span-7 space-y-5">
            {/* Current High Bid Display */}
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" /> Current Highest Bid
                </div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {currentHighBid ? formatZAR(currentHighBid.amount) : formatZAR(zen.reservePrice || ZEN_RESERVE_PRICE)}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {currentHighBid ? (
                    <>
                      Held by <strong className="text-slate-900">{currentHighBid.teamName}</strong> at{' '}
                      <span className="font-mono font-semibold text-indigo-700">{currentHighBid.displayTime}</span>
                    </>
                  ) : (
                    'No bids placed yet — Opening Reserve is R 190,000,000'
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-right shrink-0">
                <div className="text-[11px] uppercase font-bold text-slate-400">Your Team Status</div>
                <div className="text-sm font-extrabold mt-0.5 text-slate-900">{actingTeam?.name}</div>
                {isActingTeamHighestBidder ? (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    👑 YOU HOLD THE HIGHEST BID
                  </span>
                ) : (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    ELIGIBLE TO BID
                  </span>
                )}
              </div>
            </div>

            {/* If Facilitator, allow picking which team to place a bid for */}
            {isFacilitator && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Facilitator Bid Proxy — Place Bid on Behalf of Team:
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeTeams.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFacSelectedBidderId(t.id);
                        setBidFeedback(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        facSelectedBidderId === t.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.name} {currentHighBid?.teamId === t.id ? '👑' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Increment Selector: +R1m, +R5m, +R10m, +R25m, +R50m */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Bid Increment Above Current High ({formatMillions(baseBidAmount)})
                </label>
                <span className="text-xs font-bold text-indigo-600">
                  New Bid: {formatZAR(proposedBidAmount)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {INCREMENT_OPTIONS.map(inc => {
                  const active = selectedIncrement === inc.value;
                  return (
                    <button
                      key={inc.value}
                      type="button"
                      disabled={isActingTeamHighestBidder || auctionStatus !== 'OPEN'}
                      onClick={() => setSelectedIncrement(inc.value)}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                          : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-700'
                      }`}
                    >
                      <span className="text-sm font-black text-indigo-600">{inc.label}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        → {formatMillions(baseBidAmount + inc.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Bid Button (Blocked if team currently holds the highest bid!) */}
            <div className="pt-1">
              <button
                type="button"
                disabled={isActingTeamHighestBidder || auctionStatus !== 'OPEN'}
                onClick={() => handleSubmitBid()}
                className={`w-full py-3.5 px-6 rounded-xl font-black text-sm transition flex items-center justify-center gap-2 ${
                  isActingTeamHighestBidder
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-not-allowed'
                    : auctionStatus === 'OPEN'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Gavel className="w-4 h-4" />
                {isActingTeamHighestBidder
                  ? `${actingTeam?.name} Already Holds the Highest Bid (Cannot Outbid Yourself)`
                  : auctionStatus === 'OPEN'
                  ? `Submit Bid of ${formatZAR(proposedBidAmount)} (+${formatMillions(selectedIncrement)})`
                  : 'Bidding Currently Closed'}
              </button>
            </div>

            {bidFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                  bidFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {bidFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{bidFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Right 5 cols: Live Bid Feed */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Live Bid History ({(zen.bids || []).length})
              </span>
              <span className="text-[11px] text-slate-400">Newest First</span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-64 flex-1">
              {(zen.bids || []).length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No bids submitted yet. Reserve price is {formatZAR(zen.reservePrice || ZEN_RESERVE_PRICE)}.
                </div>
              ) : (
                (zen.bids || []).map(b => {
                  const isTop = currentHighBid?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border text-xs ${
                        isTop ? 'bg-amber-50/90 border-amber-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {isTop && '👑 '}
                          {b.teamName}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{b.displayTime}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-black text-slate-900 text-sm">
                          {formatZAR(b.amount)}{' '}
                          <span className="text-[11px] font-semibold text-emerald-700">
                            (+{formatMillions(b.incrementUsed)})
                          </span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isTop ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isTop ? 'HIGHEST BID' : 'OUTBID'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Post-Auction Joint Venture (JV) Split Confirmation (Visible when Awarded) ── */}
      {zen.isAwarded && canManageJvSplit && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Post-Auction Joint Venture (JV) Split Confirmation
                </h3>
                <p className="text-xs text-slate-500">
                  Select any JV partner teams and confirm the % split of the {formatZAR(zen.winningAmount || ZEN_RESERVE_PRICE)} purchase and Zen B2B sales.
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                zen.jvConfirmed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {zen.jvConfirmed ? '✓ JV Split Confirmed' : 'Pending Split Confirmation'}
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Teams in the Winning JV:
              </label>
              {activeTeams.map(team => {
                const isLead = team.id === zen.winningTeamId;
                const isInJv = localJvSplits[team.id] !== undefined;
                return (
                  <div
                    key={team.id}
                    onClick={() => {
                      if (isLead) return;
                      setLocalJvSplits(prev => {
                        const next = { ...prev };
                        if (next[team.id] !== undefined) delete next[team.id];
                        else next[team.id] = 25;
                        return next;
                      });
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isInJv ? 'bg-indigo-50/70 border-indigo-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" checked={isInJv} readOnly className="rounded text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">{team.name}</span>
                      {isLead && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Lead Winner
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-indigo-700">
                      {isInJv ? `${localJvSplits[team.id]}%` : 'Not in JV'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ownership % Allocation (Must Total 100%)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const keys = Object.keys(localJvSplits);
                    if (!keys.length) return;
                    const base = Math.floor((100 / keys.length) * 100) / 100;
                    const next: Record<string, number> = {};
                    keys.forEach((k, idx) => {
                      next[k] = idx === 0 ? Number((100 - base * (keys.length - 1)).toFixed(2)) : base;
                    });
                    setLocalJvSplits(next);
                  }}
                  className="text-xs font-bold text-indigo-600 bg-white border border-slate-200 px-3 py-1 rounded-lg hover:bg-slate-100"
                >
                  Equalize %
                </button>
              </div>

              <div className="space-y-2.5">
                {Object.keys(localJvSplits).map(tid => {
                  const t = activeTeams.find(tm => tm.id === tid);
                  const pct = localJvSplits[tid] || 0;
                  const purchaseShare = ((zen.winningAmount || ZEN_RESERVE_PRICE) * pct) / 100;
                  const profitShare = (b2bSalesSummary.totalExternalProfit * pct) / 100;
                  return (
                    <div key={tid} className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{t?.name || tid}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Purchase Share: <strong>{formatZAR(purchaseShare)}</strong> • B2B Other Income Share:{' '}
                          <strong className="text-emerald-700">+{formatZAR(profitShare)}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={pct}
                          onChange={e =>
                            setLocalJvSplits(prev => ({
                              ...prev,
                              [tid]: Math.max(0, Math.min(100, Number(e.target.value) || 0))
                            }))
                          }
                          className="w-20 border border-slate-300 rounded-lg px-2.5 py-1 text-right font-bold text-xs text-slate-900"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span
                  className={`text-xs font-bold ${
                    Math.round(totalJvPct) === 100 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  Total: {totalJvPct}% {Math.round(totalJvPct) === 100 ? '✓' : '(Must equal 100%)'}
                </span>
                <button
                  type="button"
                  disabled={Math.round(totalJvPct) !== 100}
                  onClick={() => confirmZenJvSplits(currentClass.id, localJvSplits)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs transition"
                >
                  Confirm JV Ownership & Apply Transfer Costs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Zen Negotiations: Price & KPI Adjustments for Non-Owner Teams ── */}
      {zen.isAwarded && isZenOwnerOrFacilitator && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Zen Negotiations — Adjust Pricing & Performance Indicators (KPIs) for Other Teams
                </h3>
                <p className="text-xs text-slate-500">
                  Select non-owning teams below, adjust their agreed Zen unit prices and supplier KPIs, and submit. Units come automatically from each buyer&apos;s Procurement decisions.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase font-bold text-slate-400">Total Zen B2B Profit (Other Income)</div>
              <div className="text-lg font-black text-emerald-700">
                +{formatZAR(b2bSalesSummary.totalExternalProfit)}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Step A: Multi-Select Non-Owner Teams */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  1. Select Non-Owning Teams to Apply Pricing & KPIs To:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClientTeamIds(nonOwnerTeams.map(t => t.id))}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Select All Non-Owner Teams ({nonOwnerTeams.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClientTeamIds([])}
                    className="text-xs font-bold text-slate-500 hover:underline"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {nonOwnerTeams.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  All active teams are currently part of the JV ownership group.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {nonOwnerTeams.map(team => {
                    const isChecked = selectedClientTeamIds.includes(team.id);
                    return (
                      <div
                        key={team.id}
                        onClick={() =>
                          setSelectedClientTeamIds(prev =>
                            prev.includes(team.id) ? prev.filter(id => id !== team.id) : [...prev, team.id]
                          )
                        }
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isChecked
                            ? 'bg-indigo-50/70 border-indigo-400 text-slate-900'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-bold">{team.name}</div>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                loadClientTeamSettings(team.id);
                              }}
                              className="text-[10px] text-indigo-600 hover:underline font-medium"
                            >
                              Load team&apos;s current settings
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step B: Adjust Pricing (Components & Finished Goods) — No Unit Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Agreed Unit Pricing (R / Unit)
                </h4>
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3">Raw Transfer Cost</th>
                        <th className="py-2.5 px-3">Agreed Raw Material Price</th>
                        <th className="py-2.5 px-3">FG Transfer Cost</th>
                        <th className="py-2.5 px-3">Agreed Finished Goods Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {PRODUCTS.map(p => {
                        const rawTransfer = activeTransferCosts[p.id]?.components ?? ZEN_TRANSFER_COSTS[p.id].components;
                        const fgTransfer = activeTransferCosts[p.id]?.finishedGoods ?? ZEN_TRANSFER_COSTS[p.id].finishedGoods;
                        const rawPrice = b2bPrices.componentCosts[p.id];
                        const fgPrice = b2bPrices.finishedGoodsCosts[p.id];
                        return (
                          <tr key={p.id}>
                            <th className="py-3 px-3 font-bold text-slate-900">{p.name}</th>
                            <td className="py-3 px-3 text-slate-500">
                              R {rawTransfer}{' '}
                              <span className="text-[10px] text-slate-400">(Std R{COMPONENT_COSTS[p.id].Zen})</span>
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="number"
                                value={rawPrice}
                                onChange={e =>
                                  setB2bPrices(prev => ({
                                    ...prev,
                                    componentCosts: {
                                      ...prev.componentCosts,
                                      [p.id]: Math.max(0, Number(e.target.value) || 0)
                                    }
                                  }))
                                }
                                className="w-24 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-900 bg-white"
                              />
                              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                Margin: +R {rawPrice - rawTransfer}/u
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              R {fgTransfer}{' '}
                              <span className="text-[10px] text-slate-400">(Std R{FINISHED_GOODS_COSTS[p.id].Zen})</span>
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="number"
                                value={fgPrice}
                                onChange={e =>
                                  setB2bPrices(prev => ({
                                    ...prev,
                                    finishedGoodsCosts: {
                                      ...prev.finishedGoodsCosts,
                                      [p.id]: Math.max(0, Number(e.target.value) || 0)
                                    }
                                  }))
                                }
                                className="w-24 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-900 bg-white"
                              />
                              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                Margin: +R {fgPrice - fgTransfer}/u
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step C: Adjust Supplier Performance Indicators (KPIs) */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Zen Performance Indicators (KPIs)
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500">Payment Terms (Days)</label>
                    <select
                      value={b2bPrices.paymentTerms}
                      onChange={e => setB2bPrices(prev => ({ ...prev, paymentTerms: Number(e.target.value) }))}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 bg-white"
                    >
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days</option>
                      <option value={45}>45 Days (Std)</option>
                      <option value={60}>60 Days</option>
                      <option value={90}>90 Days</option>
                    </select>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500">Quality (1–10, Std 6.0)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      value={b2bPrices.quality}
                      onChange={e => setB2bPrices(prev => ({ ...prev, quality: Number(e.target.value) }))}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500">Service (1–10, Std 10.0)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      value={b2bPrices.service}
                      onChange={e => setB2bPrices(prev => ({ ...prev, service: Number(e.target.value) }))}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500">Innovation (1–10, Std 7.0)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      value={b2bPrices.innovation}
                      onChange={e => setB2bPrices(prev => ({ ...prev, innovation: Number(e.target.value) }))}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500">Capacity (1–10, Std 6.0)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      value={b2bPrices.capacity}
                      onChange={e => setB2bPrices(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500">Lead Time (1–10, Std 5.0)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      value={b2bPrices.leadTime}
                      onChange={e => setB2bPrices(prev => ({ ...prev, leadTime: Number(e.target.value) }))}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={selectedClientTeamIds.length === 0}
                  onClick={handleApplyB2BToSelectedTeams}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition"
                >
                  Submit Pricing & KPIs to Selected Teams ({selectedClientTeamIds.length})
                </button>

                {b2bSavedBanner && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
                    ✓ {b2bSavedBanner}
                  </div>
                )}
              </div>
            </div>

            {/* Live Read-Only Summary of Buyer Units (from Buyers' Procurement) & JV Other Income Split */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Live Third-Party Zen Purchases (Units from Buyers&apos; Procurement) & JV Split
                </h4>
                <span className="text-xs font-bold text-emerald-700">
                  Total Zen Sales Profit → Other Income: +{formatZAR(b2bSalesSummary.totalExternalProfit)}
                </span>
              </div>

              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
                      <th className="py-2.5 px-3">Buying Team</th>
                      <th className="py-2.5 px-3">Terms & Quality</th>
                      <th className="py-2.5 px-3 text-right">Buyer&apos;s Zen Units</th>
                      <th className="py-2.5 px-3 text-right">Sales (Units × Agreed Price)</th>
                      <th className="py-2.5 px-3 text-right">Transfer Cost</th>
                      <th className="py-2.5 px-3 text-right">Profit → Other Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {b2bSalesSummary.rows.map(r => (
                      <tr key={r.teamId}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{r.teamName}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {r.paymentTerms}d • Q {r.quality}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{r.units.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatZAR(r.revenue)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">{formatZAR(r.transferCost)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          +{formatZAR(r.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* JV Partner Share Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {ownerTeamIds.map(tid => {
                  const t = activeTeams.find(tm => tm.id === tid);
                  const pct = zen.jvSplits?.[tid] || 0;
                  const shareIncome = (b2bSalesSummary.totalExternalProfit * pct) / 100;
                  return (
                    <div key={tid} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{t?.name || tid}</div>
                        <div className="text-[11px] text-slate-500">{pct}% JV Partner Share</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Other Income</div>
                        <div className="text-xs font-black text-emerald-700">+{formatZAR(shareIncome)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
