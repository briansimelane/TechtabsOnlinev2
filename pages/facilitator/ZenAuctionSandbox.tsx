import React, { useState, useEffect, useMemo } from 'react';
import {
  Gavel,
  Clock,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Presentation,
  RotateCcw,
  Award,
  Handshake,
  Sparkles,
  CheckSquare,
  Square
} from 'lucide-react';
import { ProductId } from '../../types';
import {
  COMPONENT_COSTS,
  FINISHED_GOODS_COSTS,
  SUPPLIER_METRICS,
  ZEN_RESERVE_PRICE,
  ZEN_TRANSFER_COSTS
} from '../../constants';

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

interface SandboxTeam {
  id: string;
  name: string;
  // Buyer's own procurement units allocated to Zen (comes from the buyer's Procurement tab)
  buyerZenUnits: Record<ProductId, { components: number; finishedGoods: number }>;
}

const SANDBOX_TEAMS: SandboxTeam[] = [
  {
    id: 'team_1',
    name: 'Team 1 (Apex Tech)',
    buyerZenUnits: {
      techbook: { components: 6000, finishedGoods: 3000 },
      zroid: { components: 5000, finishedGoods: 4500 },
      itab: { components: 4000, finishedGoods: 3500 }
    }
  },
  {
    id: 'team_2',
    name: 'Team 2 (Nova Corp)',
    buyerZenUnits: {
      techbook: { components: 5000, finishedGoods: 2500 },
      zroid: { components: 4500, finishedGoods: 3000 },
      itab: { components: 3500, finishedGoods: 2500 }
    }
  },
  {
    id: 'team_3',
    name: 'Team 3 (Vortex Ltd)',
    buyerZenUnits: {
      techbook: { components: 7000, finishedGoods: 4000 },
      zroid: { components: 6000, finishedGoods: 3500 },
      itab: { components: 5000, finishedGoods: 3000 }
    }
  },
  {
    id: 'team_4',
    name: 'Team 4 (Horizon SA)',
    buyerZenUnits: {
      techbook: { components: 4000, finishedGoods: 2000 },
      zroid: { components: 3500, finishedGoods: 2500 },
      itab: { components: 3000, finishedGoods: 2000 }
    }
  },
  {
    id: 'team_5',
    name: 'Team 5 (Pulse Digital)',
    buyerZenUnits: {
      techbook: { components: 5500, finishedGoods: 3000 },
      zroid: { components: 5000, finishedGoods: 3000 },
      itab: { components: 4500, finishedGoods: 2500 }
    }
  }
];

interface BidRecord {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
  incrementUsed: number;
  timestampDisplay: string;
  status: 'ACCEPTED' | 'BLOCKED_SELF_OUTBID' | 'BLOCKED_LOWER_OR_EQUAL' | 'BLOCKED_OUT_OF_TIME';
  reason?: string;
}

interface TeamZenTermsAndKPIs {
  componentCosts: Record<ProductId, number>;
  finishedGoodsCosts: Record<ProductId, number>;
  paymentTerms: number;
  quality: number;
  deliveryReliability: number;
  leadTime: number;
  service: number;
  capacity: number;
  innovation: number;
}

const formatZAR = (val: number) => `R ${Math.round(val).toLocaleString('en-ZA')}`;
const formatMillions = (val: number) => `R ${(val / 1_000_000).toFixed(2).replace(/\.00$/, '')}m`;

export default function ZenAuctionSandbox() {
  // ── 1. Clock & Auction Window State ──
  const [startHourMin, setStartHourMin] = useState<string>('14:45');
  const [endHourMin, setEndHourMin] = useState<string>('15:00');
  const [simClockSeconds, setSimClockSeconds] = useState<number>(14 * 3600 + 46 * 60 + 10);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(true);
  const [manualLockStatus, setManualLockStatus] = useState<'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED'>('AUTO');

  const windowBounds = useMemo(() => {
    const [sh, sm] = startHourMin.split(':').map(Number);
    const [eh, em] = endHourMin.split(':').map(Number);
    const startSec = (sh || 0) * 3600 + (sm || 0) * 60;
    const endSecInclusive = (eh || 0) * 3600 + (em || 0) * 60 + 59;
    return { startSec, endSecInclusive };
  }, [startHourMin, endHourMin]);

  useEffect(() => {
    if (!isClockRunning) return;
    const timer = setInterval(() => {
      setSimClockSeconds(prev => (prev + 1) % 86400);
    }, 1000);
    return () => clearInterval(timer);
  }, [isClockRunning]);

  const formatClock = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const auctionWindowState = useMemo(() => {
    if (manualLockStatus === 'FORCE_OPEN') return 'OPEN';
    if (manualLockStatus === 'FORCE_CLOSED') return 'CLOSED';
    if (simClockSeconds < windowBounds.startSec) return 'NOT_STARTED';
    if (simClockSeconds <= windowBounds.endSecInclusive) return 'OPEN';
    return 'CLOSED';
  }, [simClockSeconds, windowBounds, manualLockStatus]);

  const remainingSeconds = Math.max(0, windowBounds.endSecInclusive - simClockSeconds);

  // ── 2. Bidding State ──
  const [bids, setBids] = useState<BidRecord[]>([
    {
      id: 'bid_init_1',
      teamId: 'team_2',
      teamName: 'Team 2 (Nova Corp)',
      amount: 190_000_000,
      incrementUsed: 0,
      timestampDisplay: '14:45:12',
      status: 'ACCEPTED'
    },
    {
      id: 'bid_init_2',
      teamId: 'team_1',
      teamName: 'Team 1 (Apex Tech)',
      amount: 195_000_000,
      incrementUsed: 5_000_000,
      timestampDisplay: '14:45:48',
      status: 'ACCEPTED'
    }
  ]);

  const [activeBidderTeamId, setActiveBidderTeamId] = useState<string>('team_3');
  const [selectedIncrement, setSelectedIncrement] = useState<number>(5_000_000);
  const [lastBidFeedback, setLastBidFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currentHighBid = useMemo(() => {
    const accepted = bids.filter(b => b.status === 'ACCEPTED');
    if (accepted.length === 0) return null;
    return accepted.reduce((max, b) => (b.amount > max.amount ? b : max), accepted[0]);
  }, [bids]);

  const isCurrentBidderLeading = Boolean(currentHighBid && currentHighBid.teamId === activeBidderTeamId);

  const baseForNextBid = currentHighBid ? currentHighBid.amount : ZEN_RESERVE_PRICE;
  const proposedBidAmount = baseForNextBid + selectedIncrement;

  const handlePlaceBid = (customAmount?: number, customInc?: number) => {
    const team = SANDBOX_TEAMS.find(t => t.id === activeBidderTeamId) || SANDBOX_TEAMS[0];
    const bidAmount = customAmount ?? proposedBidAmount;
    const incUsed = customInc ?? selectedIncrement;
    const timeStr = formatClock(simClockSeconds);

    if (auctionWindowState !== 'OPEN') {
      const blocked: BidRecord = {
        id: `bid_${Date.now()}`,
        teamId: team.id,
        teamName: team.name,
        amount: bidAmount,
        incrementUsed: incUsed,
        timestampDisplay: timeStr,
        status: 'BLOCKED_OUT_OF_TIME',
        reason:
          auctionWindowState === 'NOT_STARTED'
            ? `Rejected: Auction has not opened yet (opens at ${startHourMin}:00).`
            : `Rejected: Bid received at ${timeStr}, after the ${endHourMin}:59 cutoff.`
      };
      setBids(prev => [blocked, ...prev]);
      setLastBidFeedback({ type: 'error', message: blocked.reason! });
      return;
    }

    // Prevent a team from outbidding themselves
    if (currentHighBid && currentHighBid.teamId === team.id) {
      const blockedSelf: BidRecord = {
        id: `bid_${Date.now()}`,
        teamId: team.id,
        teamName: team.name,
        amount: bidAmount,
        incrementUsed: incUsed,
        timestampDisplay: timeStr,
        status: 'BLOCKED_SELF_OUTBID',
        reason: `Blocked: ${team.name} already holds the highest bid (${formatMillions(currentHighBid.amount)}) and cannot outbid itself.`
      };
      setBids(prev => [blockedSelf, ...prev]);
      setLastBidFeedback({ type: 'error', message: blockedSelf.reason! });
      return;
    }

    if (bidAmount < ZEN_RESERVE_PRICE || (currentHighBid && bidAmount <= currentHighBid.amount)) {
      const blockedLow: BidRecord = {
        id: `bid_${Date.now()}`,
        teamId: team.id,
        teamName: team.name,
        amount: bidAmount,
        incrementUsed: incUsed,
        timestampDisplay: timeStr,
        status: 'BLOCKED_LOWER_OR_EQUAL',
        reason: `Blocked: Bid of ${formatMillions(bidAmount)} is not higher than the current leading bid of ${formatMillions(
          currentHighBid ? currentHighBid.amount : ZEN_RESERVE_PRICE
        )}.`
      };
      setBids(prev => [blockedLow, ...prev]);
      setLastBidFeedback({ type: 'error', message: blockedLow.reason! });
      return;
    }

    const accepted: BidRecord = {
      id: `bid_${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      amount: bidAmount,
      incrementUsed: incUsed,
      timestampDisplay: timeStr,
      status: 'ACCEPTED'
    };
    setBids(prev => [accepted, ...prev]);
    setLastBidFeedback({
      type: 'success',
      message: `Accepted at ${timeStr}! ${team.name} now leads with ${formatZAR(bidAmount)}.`
    });
  };

  // ── 3. Award & Post-Auction Joint Venture (JV) Split State ──
  const [isAwarded, setIsAwarded] = useState<boolean>(false);
  const [awardedBid, setAwardedBid] = useState<BidRecord | null>(null);
  const [jvSplits, setJvSplits] = useState<Record<string, number>>({
    team_1: 60,
    team_3: 40
  });
  const [jvConfirmed, setJvConfirmed] = useState<boolean>(false);

  const handleAwardAuction = () => {
    if (!currentHighBid) return;
    setIsAwarded(true);
    setAwardedBid(currentHighBid);
    setManualLockStatus('FORCE_CLOSED');
    setJvSplits({ [currentHighBid.teamId]: 100 });
    setJvConfirmed(false);
  };

  const totalJvPct = useMemo(
    () => (Object.values(jvSplits) as number[]).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [jvSplits]
  );

  const ownerTeamIds = useMemo(
    () => Object.keys(jvSplits).filter(id => (jvSplits[id] || 0) > 0),
    [jvSplits]
  );

  const nonOwnerTeams = useMemo(
    () => SANDBOX_TEAMS.filter(t => !ownerTeamIds.includes(t.id)),
    [ownerTeamIds]
  );

  // ── 4. Zen Negotiations (Price & KPI Adjustments for Non-Owner Teams) ──
  const [clientOverrides, setClientOverrides] = useState<Record<string, TeamZenTermsAndKPIs>>(() => {
    const init: Record<string, TeamZenTermsAndKPIs> = {};
    SANDBOX_TEAMS.forEach(t => {
      init[t.id] = {
        componentCosts: {
          techbook: 1120,
          zroid: 1250,
          itab: 990
        },
        finishedGoodsCosts: {
          techbook: 1220,
          zroid: 1720,
          itab: 1650
        },
        paymentTerms: 45,
        quality: 6.0,
        deliveryReliability: 95,
        leadTime: 5.0,
        service: 10.0,
        capacity: 6.0,
        innovation: 7.0
      };
    });
    return init;
  });

  const [selectedClientTeamIds, setSelectedClientTeamIds] = useState<string[]>(['team_2', 'team_4', 'team_5']);
  useEffect(() => {
    setSelectedClientTeamIds(prev => {
      const valid = prev.filter(id => nonOwnerTeams.some(t => t.id === id));
      return valid.length > 0 ? valid : nonOwnerTeams.map(t => t.id);
    });
  }, [nonOwnerTeams]);

  const [draftNegotiationForm, setDraftNegotiationForm] = useState<TeamZenTermsAndKPIs>({
    componentCosts: {
      techbook: 1120,
      zroid: 1250,
      itab: 990
    },
    finishedGoodsCosts: {
      techbook: 1220,
      zroid: 1720,
      itab: 1650
    },
    paymentTerms: 45,
    quality: 6.0,
    deliveryReliability: 95,
    leadTime: 5.0,
    service: 10.0,
    capacity: 6.0,
    innovation: 7.0
  });

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSubmitClientPricingAndKPIs = () => {
    if (selectedClientTeamIds.length === 0) return;
    setClientOverrides(prev => {
      const next = { ...prev };
      selectedClientTeamIds.forEach(tid => {
        next[tid] = {
          componentCosts: { ...draftNegotiationForm.componentCosts },
          finishedGoodsCosts: { ...draftNegotiationForm.finishedGoodsCosts },
          paymentTerms: draftNegotiationForm.paymentTerms,
          quality: draftNegotiationForm.quality,
          deliveryReliability: draftNegotiationForm.deliveryReliability,
          leadTime: draftNegotiationForm.leadTime,
          service: draftNegotiationForm.service,
          capacity: draftNegotiationForm.capacity,
          innovation: draftNegotiationForm.innovation
        };
      });
      return next;
    });
    const names = SANDBOX_TEAMS.filter(t => selectedClientTeamIds.includes(t.id))
      .map(t => t.name.split(' (')[0])
      .join(', ');
    setSavedNotice(`Applied Zen Pricing & KPIs to: ${names}`);
    setTimeout(() => setSavedNotice(null), 4000);
  };

  // Calculate Zen B2B Sales & Profit from each non-owner buyer's Procurement units
  const b2bFinancialSummary = useMemo(() => {
    let grandTotalUnits = 0;
    let grandTotalRevenue = 0;
    let grandTotalTransferCost = 0;
    let grandTotalProfit = 0;

    const rows = SANDBOX_TEAMS.map(team => {
      const isOwner = ownerTeamIds.includes(team.id);
      const cfg = clientOverrides[team.id];
      let tUnits = 0;
      let tRev = 0;
      let tCost = 0;

      PRODUCTS.forEach(p => {
        const cUnits = team.buyerZenUnits[p.id].components;
        const fgUnits = team.buyerZenUnits[p.id].finishedGoods;
        const cTransfer = ZEN_TRANSFER_COSTS[p.id].components;
        const fgTransfer = ZEN_TRANSFER_COSTS[p.id].finishedGoods;

        const cPrice = isOwner ? cTransfer : cfg.componentCosts[p.id];
        const fgPrice = isOwner ? fgTransfer : cfg.finishedGoodsCosts[p.id];

        tUnits += cUnits + fgUnits;
        tRev += cUnits * cPrice + fgUnits * fgPrice;
        tCost += cUnits * cTransfer + fgUnits * fgTransfer;
      });

      const tProfit = isOwner ? 0 : tRev - tCost;
      if (!isOwner) {
        grandTotalUnits += tUnits;
        grandTotalRevenue += tRev;
        grandTotalTransferCost += tCost;
        grandTotalProfit += tProfit;
      }

      return {
        teamId: team.id,
        teamName: team.name,
        isOwner,
        ownershipPct: jvSplits[team.id] || 0,
        paymentTerms: cfg.paymentTerms,
        quality: cfg.quality,
        service: cfg.service,
        innovation: cfg.innovation,
        totalUnits: tUnits,
        totalRevenue: tRev,
        totalTransferCost: tCost,
        totalProfit: tProfit
      };
    });

    const winningBidAmount = awardedBid?.amount || currentHighBid?.amount || ZEN_RESERVE_PRICE;
    const ownerAllocations = ownerTeamIds.map(tid => {
      const team = SANDBOX_TEAMS.find(t => t.id === tid);
      const pct = jvSplits[tid] || 0;
      return {
        teamId: tid,
        teamName: team?.name || tid,
        ownershipPct: pct,
        purchasePriceShare: (winningBidAmount * pct) / 100,
        otherIncomeFromB2B: (grandTotalProfit * pct) / 100
      };
    });

    return {
      rows,
      grandTotalUnits,
      grandTotalRevenue,
      grandTotalTransferCost,
      grandTotalProfit,
      winningBidAmount,
      ownerAllocations
    };
  }, [clientOverrides, ownerTeamIds, jvSplits, awardedBid, currentHighBid]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* ── Top Header & Clock Presets (Light Mode) ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> ALP Year 3 Interactive Test Sandbox
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Zen Open-Bid Auction, JV Split & B2B Negotiations Sandbox
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Test the <code className="text-indigo-700 font-semibold">15:00:59</code> cutoff, increment buttons, self-outbid prevention, post-award JV splits, and multi-team Price & KPI adjustments.
            </p>
          </div>

          {/* Simulated Clock Card (Light Mode) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <div className="text-center sm:text-left">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" /> Simulated Server Clock
              </div>
              <div className="text-2xl font-mono font-black text-slate-900 tracking-wider mt-0.5">
                {formatClock(simClockSeconds)}
              </div>
              <div className="text-xs text-slate-500">
                Window: <span className="text-slate-800 font-semibold">{startHourMin}:00</span> →{' '}
                <span className="text-indigo-700 font-bold">{endHourMin}:59</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-center border ${
                  auctionWindowState === 'OPEN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : auctionWindowState === 'NOT_STARTED'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {auctionWindowState === 'OPEN'
                  ? `LIVE • ${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s left`
                  : auctionWindowState === 'NOT_STARTED'
                  ? 'WAITING FOR START'
                  : 'AUCTION CLOSED'}
              </span>
              <button
                onClick={() => setIsClockRunning(!isClockRunning)}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold transition"
              >
                {isClockRunning ? '⏸ Pause Clock' : '▶ Resume Clock'}
              </button>
            </div>
          </div>
        </div>

        {/* Facilitator Clock Presets */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold mr-1">Clock Test Presets:</span>
          <button
            onClick={() => {
              setManualLockStatus('AUTO');
              setIsAwarded(false);
              setSimClockSeconds(windowBounds.startSec - 15);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition"
          >
            14:44:45 (Before Open)
          </button>
          <button
            onClick={() => {
              setManualLockStatus('AUTO');
              setIsAwarded(false);
              setSimClockSeconds(windowBounds.startSec + 60);
            }}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition"
          >
            14:46:00 (Auction Open)
          </button>
          <button
            onClick={() => {
              setManualLockStatus('AUTO');
              setIsAwarded(false);
              setSimClockSeconds(windowBounds.endSecInclusive - 14);
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold transition"
          >
            ⚡ 15:00:45 (Last 15s Rush before :59)
          </button>
          <button
            onClick={() => {
              setManualLockStatus('AUTO');
              setSimClockSeconds(windowBounds.endSecInclusive + 1);
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition"
          >
            🔒 15:01:00 (Past Cutoff — Test Late Block)
          </button>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-slate-600 font-semibold">Start:</label>
            <input
              type="time"
              value={startHourMin}
              onChange={e => setStartHourMin(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 text-xs font-semibold"
            />
            <label className="text-slate-600 font-semibold">Close:</label>
            <input
              type="time"
              value={endHourMin}
              onChange={e => setEndHourMin(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* ── STEP 1: LIVE BIDDING TERMINAL (LIGHT MODE + NO SELF-OUTBIDDING) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Gavel className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-lg text-slate-900">Step 1: Live Team Bidding Terminal</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">Reserve Price: R 190,000,000</span>
          </div>

          <div className="p-6 space-y-6 flex-1">
            {/* Current Highest Bid Banner */}
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" /> Current Highest Bid on the Floor
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                  {currentHighBid ? formatZAR(currentHighBid.amount) : formatZAR(ZEN_RESERVE_PRICE)}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {currentHighBid ? (
                    <>
                      Held by <span className="font-bold text-slate-900">{currentHighBid.teamName}</span> • Placed at{' '}
                      <span className="font-mono font-semibold text-indigo-700">{currentHighBid.timestampDisplay}</span>
                    </>
                  ) : (
                    'No bids placed yet — Opening Reserve is R 190m'
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-right shrink-0 shadow-2xs">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Minimum to Lead</div>
                <div className="text-lg font-extrabold text-emerald-700">
                  {formatMillions((currentHighBid ? currentHighBid.amount : ZEN_RESERVE_PRICE) + 1_000_000)}
                </div>
                <div className="text-[11px] text-slate-500">No Self-Outbidding Rule</div>
              </div>
            </div>

            {/* Select Team to Act As */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Simulate Bidding As Team:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SANDBOX_TEAMS.map(team => {
                  const isSelected = team.id === activeBidderTeamId;
                  const isLeading = currentHighBid?.teamId === team.id;
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        setActiveBidderTeamId(team.id);
                        setLastBidFeedback(null);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-left transition relative ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="truncate">{team.name.split(' (')[0]}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {team.name.split(' (')[1]?.replace(')', '')}
                      </div>
                      {isLeading && (
                        <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                          HIGHEST
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Increment Selector Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Choose Bid Increment Above Current High ({formatMillions(baseForNextBid)})
                </label>
                <span className="text-xs text-indigo-700 font-bold">
                  Selected: +{formatMillions(selectedIncrement)}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2.5">
                {INCREMENT_OPTIONS.map(inc => {
                  const active = selectedIncrement === inc.value;
                  const resultingBid = baseForNextBid + inc.value;
                  return (
                    <button
                      key={inc.value}
                      type="button"
                      disabled={isCurrentBidderLeading}
                      onClick={() => setSelectedIncrement(inc.value)}
                      className={`p-3 rounded-xl border-2 text-center transition flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950'
                          : 'border-slate-200 hover:border-indigo-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-black text-indigo-600">{inc.label}</span>
                      <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        → {formatMillions(resultingBid)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Bid Button (Disabled if team already has the highest bid!) */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => handlePlaceBid()}
                disabled={isAwarded || isCurrentBidderLeading}
                className={`flex-1 py-3.5 px-6 rounded-xl font-black text-sm transition flex items-center justify-center gap-2.5 ${
                  isCurrentBidderLeading
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-not-allowed'
                    : isAwarded
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : auctionWindowState === 'OPEN'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                <Gavel className="w-4 h-4" />
                <span>
                  {isCurrentBidderLeading
                    ? 'You Currently Hold the Highest Bid (Cannot Outbid Yourself)'
                    : `Submit Bid of ${formatZAR(proposedBidAmount)} (+${formatMillions(selectedIncrement)})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePlaceBid(
                    currentHighBid ? currentHighBid.amount - 5_000_000 : ZEN_RESERVE_PRICE - 5_000_000,
                    0
                  )
                }
                className="px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shrink-0"
              >
                🧪 Test Lower Bid Block
              </button>
            </div>

            {lastBidFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
                  lastBidFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {lastBidFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>{lastBidFeedback.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: Live Auction Ticker (Light Mode) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-lg text-slate-900">Live Auction Ticker</h2>
            </div>
            <button
              onClick={() => {
                setBids([
                  {
                    id: 'bid_reset',
                    teamId: 'team_2',
                    teamName: 'Team 2 (Nova Corp)',
                    amount: 190_000_000,
                    incrementUsed: 0,
                    timestampDisplay: '14:45:12',
                    status: 'ACCEPTED'
                  }
                ]);
                setIsAwarded(false);
                setAwardedBid(null);
                setLastBidFeedback(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Bids
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-80 space-y-2.5 bg-slate-50/50">
            {bids.map(b => {
              const isAccepted = b.status === 'ACCEPTED';
              const isTop = currentHighBid?.id === b.id;
              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border text-xs ${
                    isTop
                      ? 'bg-amber-50 border-amber-300'
                      : isAccepted
                      ? 'bg-white border-slate-200'
                      : 'bg-rose-50/70 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {isTop && '👑 '}
                      {b.teamName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">{b.timestampDisplay}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-sm font-black ${isAccepted ? 'text-slate-900' : 'text-rose-700 line-through'}`}>
                      {formatZAR(b.amount)}
                      {b.incrementUsed > 0 && isAccepted && (
                        <span className="ml-1.5 text-[11px] font-semibold text-emerald-700">
                          (+{formatMillions(b.incrementUsed)})
                        </span>
                      )}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isTop
                          ? 'bg-amber-200 text-amber-900'
                          : isAccepted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {isTop ? 'HIGHEST BID' : isAccepted ? 'OUTBID' : b.status.replace('BLOCKED_', 'BLOCKED: ')}
                    </span>
                  </div>
                  {b.reason && <p className="text-[11px] text-rose-700 mt-1 font-medium">{b.reason}</p>}
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-bold text-slate-900">Facilitator Award Control</div>
              <div className="text-slate-500">
                {isAwarded && awardedBid
                  ? `Awarded to ${awardedBid.teamName} at ${formatMillions(awardedBid.amount)}`
                  : 'Close bidding and award Zen to the highest bidder.'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAwardAuction}
              disabled={!currentHighBid}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 shadow-xs transition flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              {isAwarded ? 'Re-Award Current High' : 'Close & Award Zen'}
            </button>
          </div>
        </div>
      </div>

      {/* ── STEP 2: POST-AUCTION JOINT VENTURE (JV) SPLIT CONFIRMATION (LIGHT MODE) ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Handshake className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-lg text-slate-900">
                Step 2: Post-Auction Joint Venture (JV) & Purchase Split Confirmation
              </h2>
              <p className="text-xs text-slate-500">
                Confirm which teams are part of the JV and set their % share of the purchase price and Zen sales profit.
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
              jvConfirmed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {jvConfirmed ? '✓ JV Ownership Locked' : 'Awaiting Post-Award Split Confirmation'}
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Teams in the Winning JV Consortium:
            </label>
            {SANDBOX_TEAMS.map(team => {
              const isInJv = jvSplits[team.id] !== undefined;
              const isLead = (awardedBid?.teamId || currentHighBid?.teamId) === team.id;
              return (
                <div
                  key={team.id}
                  onClick={() => {
                    if (isLead) return;
                    setJvSplits(prev => {
                      const next = { ...prev };
                      if (next[team.id] !== undefined) delete next[team.id];
                      else next[team.id] = 25;
                      return next;
                    });
                    setJvConfirmed(false);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isInJv ? 'bg-indigo-50/70 border-indigo-400 text-slate-900' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input type="checkbox" checked={isInJv} readOnly className="rounded text-indigo-600" />
                    <span className="text-xs font-bold">{team.name}</span>
                    {isLead && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        Lead Winner
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-indigo-700">
                    {isInJv ? `${jvSplits[team.id]}% Stake` : 'Not in JV'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Ownership % Split (Must Total 100%)</h3>
              <button
                type="button"
                onClick={() => {
                  const keys = Object.keys(jvSplits);
                  if (!keys.length) return;
                  const base = Math.floor((100 / keys.length) * 100) / 100;
                  const next: Record<string, number> = {};
                  keys.forEach((k, idx) => {
                    next[k] = idx === 0 ? Number((100 - base * (keys.length - 1)).toFixed(2)) : base;
                  });
                  setJvSplits(next);
                }}
                className="text-xs bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 px-3 py-1 rounded-lg font-bold"
              >
                Equalize Split %
              </button>
            </div>

            <div className="space-y-2.5">
              {Object.keys(jvSplits).map(tid => {
                const team = SANDBOX_TEAMS.find(t => t.id === tid);
                const pct = jvSplits[tid] || 0;
                const priceShare = (b2bFinancialSummary.winningBidAmount * pct) / 100;
                const incomeShare = (b2bFinancialSummary.grandTotalProfit * pct) / 100;

                return (
                  <div key={tid} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{team?.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Purchase Share: <strong>{formatZAR(priceShare)}</strong> • B2B Other Income Share:{' '}
                        <strong className="text-emerald-700">+{formatZAR(incomeShare)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={e =>
                          setJvSplits(prev => ({
                            ...prev,
                            [tid]: Math.max(0, Math.min(100, Number(e.target.value) || 0))
                          }))
                        }
                        className="w-20 border border-slate-300 rounded-lg px-2.5 py-1 text-right font-bold text-xs text-slate-900"
                      />
                      <span className="text-xs text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="text-xs font-bold">
                Total Allocation:{' '}
                <span className={Math.round(totalJvPct) === 100 ? 'text-emerald-700' : 'text-rose-600'}>
                  {totalJvPct}% {Math.round(totalJvPct) === 100 ? '(Valid 100%)' : '(Must equal 100%)'}
                </span>
              </div>
              <button
                type="button"
                disabled={Math.round(totalJvPct) !== 100}
                onClick={() => setJvConfirmed(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs transition"
              >
                {jvConfirmed ? '✓ JV Split Confirmed' : 'Confirm Post-Auction JV Split'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3: ZEN NEGOTIATIONS — PRICE & KPI ADJUSTMENTS FOR NON-OWNER TEAMS (NO UNIT INPUTS) ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-lg text-slate-900">
                Step 3: Zen Negotiations — Adjust Pricing & Performance Indicators (KPIs)
              </h2>
              <p className="text-xs text-slate-500">
                Select any or all teams that do not own Zen (not part of the JV), adjust their prices and KPIs, and submit. Units come automatically from the buyer&apos;s Procurement decisions.
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Total Zen Sales Profit → Other Income
            </div>
            <div className="text-xl font-black text-emerald-700">
              +{formatZAR(b2bFinancialSummary.grandTotalProfit)}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 1. Multi-Select All Non-Owner Teams */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Select Non-Owning Teams to Adjust Prices & KPIs For:
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedClientTeamIds(nonOwnerTeams.map(t => t.id))}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Select All Non-Owner Teams ({nonOwnerTeams.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedClientTeamIds([])}
                  className="font-bold text-slate-500 hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {nonOwnerTeams.map(team => {
                const isSelected = selectedClientTeamIds.includes(team.id);
                const cfg = clientOverrides[team.id];
                return (
                  <div
                    key={team.id}
                    onClick={() =>
                      setSelectedClientTeamIds(prev =>
                        prev.includes(team.id) ? prev.filter(id => id !== team.id) : [...prev, team.id]
                      )
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-400 text-slate-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs">
                      <div className="font-bold">{team.name.split(' (')[0]}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Terms: {cfg.paymentTerms}d • Q: {cfg.quality}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Pricing & KPI Adjustment Panels (No Unit Inputs) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Agreed Unit Prices (R / Unit)
              </h3>
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Transfer Cost (Raw)</th>
                      <th className="py-2.5 px-3">Agreed Raw Material Price</th>
                      <th className="py-2.5 px-3">Transfer Cost (FG)</th>
                      <th className="py-2.5 px-3">Agreed Finished Goods Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {PRODUCTS.map(p => {
                      const rawTransfer = ZEN_TRANSFER_COSTS[p.id].components;
                      const fgTransfer = ZEN_TRANSFER_COSTS[p.id].finishedGoods;
                      const rawPrice = draftNegotiationForm.componentCosts[p.id];
                      const fgPrice = draftNegotiationForm.finishedGoodsCosts[p.id];
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
                                setDraftNegotiationForm(prev => ({
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
                                setDraftNegotiationForm(prev => ({
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

            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Performance Indicators (Supplier KPIs)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-500">Payment Terms (Days)</label>
                  <select
                    value={draftNegotiationForm.paymentTerms}
                    onChange={e =>
                      setDraftNegotiationForm(prev => ({ ...prev, paymentTerms: Number(e.target.value) }))
                    }
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
                  <label className="block text-[11px] font-bold text-slate-500">Quality (1–10, Std {SUPPLIER_METRICS.Zen.quality})</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={draftNegotiationForm.quality}
                    onChange={e => setDraftNegotiationForm(prev => ({ ...prev, quality: Number(e.target.value) }))}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-500">Service (1–10, Std {SUPPLIER_METRICS.Zen.service})</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={draftNegotiationForm.service}
                    onChange={e => setDraftNegotiationForm(prev => ({ ...prev, service: Number(e.target.value) }))}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-500">Innovation (1–10, Std {SUPPLIER_METRICS.Zen.innovation})</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={draftNegotiationForm.innovation}
                    onChange={e => setDraftNegotiationForm(prev => ({ ...prev, innovation: Number(e.target.value) }))}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-500">Capacity (1–10, Std {SUPPLIER_METRICS.Zen.capacity})</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={draftNegotiationForm.capacity}
                    onChange={e => setDraftNegotiationForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-500">Lead Time (1–10, Std {SUPPLIER_METRICS.Zen.leadTime})</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={draftNegotiationForm.leadTime}
                    onChange={e => setDraftNegotiationForm(prev => ({ ...prev, leadTime: Number(e.target.value) }))}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1 font-bold text-slate-900"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={selectedClientTeamIds.length === 0}
                onClick={handleSubmitClientPricingAndKPIs}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition"
              >
                Submit Pricing & KPIs to Selected Teams ({selectedClientTeamIds.length})
              </button>

              {savedNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
                  ✓ {savedNotice}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 4: LIGHT-MODE DEBRIEF SLIDE PREVIEW (ZEN ACQUISITION & OTHER INCOME SPLIT) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
              <Presentation className="w-4 h-4" /> Year 3 Debrief Slide Preview (Light Mode)
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Zen Acquisition, JV Split & B2B Other Income Impact
            </h2>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            Total B2B Other Income Pool: +{formatZAR(b2bFinancialSummary.grandTotalProfit)}
          </span>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Winning Open-Bid Price</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatZAR(b2bFinancialSummary.winningBidAmount)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Reserve: R 190,000,000</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Buyer Units from Zen</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {b2bFinancialSummary.grandTotalUnits.toLocaleString()} units
            </div>
            <div className="text-xs text-slate-500 mt-1">
              B2B Sales: {formatMillions(b2bFinancialSummary.grandTotalRevenue)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Total Transfer Cost</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatZAR(b2bFinancialSummary.grandTotalTransferCost)}
            </div>
            <div className="text-xs text-slate-500 mt-1">TechBook R540/624 • Zroid R664/893 • iTab R575/900</div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-800">
              Net Profit → Other Income
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              +{formatZAR(b2bFinancialSummary.grandTotalProfit)}
            </div>
            <div className="text-xs text-emerald-700 mt-1">Split across JV Partners by % Share</div>
          </div>
        </div>

        {/* Table of Buyer Purchases & JV Split */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                <th className="py-3 px-4 sticky left-0 bg-slate-50">Team</th>
                <th className="py-3 px-4">Role / JV %</th>
                <th className="py-3 px-4">Agreed Terms & KPIs</th>
                <th className="py-3 px-4 text-right">Buyer&apos;s Zen Units</th>
                <th className="py-3 px-4 text-right">Sales (Units × Agreed Price)</th>
                <th className="py-3 px-4 text-right">Transfer Cost</th>
                <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-900">
                  Other Income Credited (by JV %)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {b2bFinancialSummary.rows.map(row => {
                const ownerShare = b2bFinancialSummary.ownerAllocations.find(o => o.teamId === row.teamId);
                return (
                  <tr key={row.teamId} className="hover:bg-slate-50">
                    <th className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white">{row.teamName}</th>
                    <td className="py-3 px-4">
                      {row.isOwner ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                          JV Owner ({row.ownershipPct}%)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          External Buyer
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.isOwner
                        ? 'Transfer Cost Base'
                        : `${row.paymentTerms}d • Q:${row.quality} • S:${row.service} • I:${row.innovation}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{row.totalUnits.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatZAR(row.totalRevenue)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {formatZAR(row.totalTransferCost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold bg-emerald-50/30">
                      {row.isOwner ? (
                        <span className="text-emerald-700">
                          +{formatZAR(ownerShare?.otherIncomeFromB2B || 0)}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          (Generated +{formatZAR(row.totalProfit)} for JV)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
