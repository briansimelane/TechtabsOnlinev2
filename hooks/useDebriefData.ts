import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { getAppDb } from '../firebase';
import { PeriodRecord, SimulationClass, Team, EditionId } from '../types';
import { ensurePeriodMarketRecord } from '../utils/debriefBackfill';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance, TeamIndustryPerformance } from '../utils/industryPerformance';
import { INITIAL_DECISIONS } from '../constants';
import { getEdition } from '../utils/editions';

export interface DebriefTeam {
  id: string;
  name: string;
  ceoName?: string;
  colorIndex: number;
  record: PeriodRecord;
  prior?: PeriodRecord;
  perf: TeamIndustryPerformance;
  fullHistory: Record<number, PeriodRecord>;
}

export interface DebriefDataset {
  className: string;
  period: number;
  teams: DebriefTeam[];
  loading: boolean;
  error: string | null;
  editionId?: string;
}

export function useDebriefData(classId: string | null, period: number): DebriefDataset {
  const [dataset, setDataset] = useState<DebriefDataset>({
    className: '',
    period,
    teams: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!classId) {
      setDataset(prev => ({ ...prev, loading: false, error: 'No class ID specified' }));
      return;
    }

    const db = getAppDb();
    const classRef = doc(db, 'classes', classId);
    const teamsRef = collection(db, 'classes', classId, 'teams');

    let unsubClass: (() => void) | null = null;
    let unsubTeams: (() => void) | null = null;

    let currentClassName = '';
    let currentEditionId: EditionId | undefined = undefined;
    let rawTeams: Team[] = [];

    const loadFallbackTeams = (): Team[] => {
      try {
        const keys = ['techtabs_classes', 'simulation_classes', 'classes'];
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const found = parsed.find((c: any) => c.id === classId);
              if (found && found.teams && found.teams.length > 0) {
                if (!currentClassName) currentClassName = found.name || '';
                if (!currentEditionId) currentEditionId = found.editionId;
                return found.teams;
              }
            }
          }
        }
      } catch (e) {}
      return [];
    };

    const mergeTeamsWithHistory = (primary: Team[], secondary: Team[]): Team[] => {
      if (!secondary || secondary.length === 0) return primary;
      if (!primary || primary.length === 0) return secondary;

      const secondaryMap = new Map(secondary.map(t => [t.id, t]));

      return primary.map(pTeam => {
        const sTeam = secondaryMap.get(pTeam.id);
        if (!sTeam) return pTeam;

        const pHist = pTeam.history || {};
        const sHist = sTeam.history || {};

        // Primary (Firestore) data ALWAYS takes precedence over secondary
        const mergedHistory = { ...sHist, ...pHist };

        return {
          ...sTeam,
          ...pTeam,
          history: mergedHistory
        };
      });
    };

    const updateCombined = () => {
      let teamsToUse = rawTeams;
      if (!teamsToUse || teamsToUse.length === 0) {
        teamsToUse = loadFallbackTeams();
      }

      // Filter out archived teams, keep bots
      const activeTeams = teamsToUse
        .filter(t => !t.isArchived)
        .sort((a, b) => a.id.localeCompare(b.id));

      let livePerfList: TeamIndustryPerformance[] = [];
      try {
        if (activeTeams.length > 0) {
          livePerfList = computeIndustryPerformance(activeTeams, period);
        }
      } catch (err) {
        console.warn("Error running industry performance calculation in debrief:", err);
      }

      const livePerfMap = new Map(livePerfList.map(p => [p.teamId, p]));

      const debriefTeams: DebriefTeam[] = activeTeams.map((t, index) => {
        const rawRec = t.history?.[period] || t.history?.[String(period)];
        const rawPriorRec = t.history?.[period - 1] || t.history?.[String(period - 1)];

        const edition = currentEditionId ? getEdition({ editionId: currentEditionId }) : null;

        const record = rawRec 
          ? ensurePeriodMarketRecord(rawRec) 
          : ensurePeriodMarketRecord(processTurn(t, t.draftDecisions || INITIAL_DECISIONS, [], edition).periodRecord);

        const prior = rawPriorRec ? ensurePeriodMarketRecord(rawPriorRec) : undefined;
        
        const match = t.id.match(/\d+/);
        const teamNum = match ? match[0] : String(index + 1);
        const formattedName = t.name.startsWith(`(${teamNum})`) ? t.name : `(${teamNum}) ${t.name}`;

        let perf: TeamIndustryPerformance;
        const effectiveRec = rawRec || record;
        const basePerf = rawRec?.industry || livePerfMap.get(t.id) || livePerfList[index];

        if (effectiveRec) {
          const totRev = effectiveRec.revenue?.total ?? basePerf?.totalRevenue ?? 0;
          const revByProd = effectiveRec.revenue?.byProduct ?? basePerf?.revenueByProduct ?? { techbook: 0, zroid: 0, itab: 0 };
          const totCogs = effectiveRec.cogs?.total ?? basePerf?.totalCogs ?? 0;
          const cogsByProd = effectiveRec.cogs?.byProduct ?? basePerf?.cogsByProduct ?? { techbook: 0, zroid: 0, itab: 0 };
          const gp = effectiveRec.grossProfit?.total ?? (totRev - totCogs);
          const gpPct = totRev > 0 ? (gp / totRev) * 100 : 0;
          const np = effectiveRec.netProfit ?? basePerf?.netProfit ?? 0;
          const npPct = totRev > 0 ? (np / totRev) * 100 : 0;
          const eq = effectiveRec.balanceSheet?.equity ?? basePerf?.equity ?? 0;
          const roeVal = eq > 0 ? (np / eq) * 100 : 0;

          perf = {
            ...(basePerf || {}),
            teamId: t.id,
            teamName: formattedName,
            revenueByProduct: revByProd,
            totalRevenue: totRev,
            cogsByProduct: cogsByProd,
            totalCogs: totCogs,
            grossProfit: gp,
            gpMargin: gpPct,
            opex: basePerf?.opex || {
              marketing: effectiveRec.opex?.marketing || 0,
              store: effectiveRec.opex?.store || 0,
              payroll: effectiveRec.opex?.payroll || 0,
              rd: effectiveRec.opex?.rd || 0,
              agents: effectiveRec.opex?.agents || 0,
              training: effectiveRec.opex?.training || 0,
              other: effectiveRec.opex?.other || 0,
              total: effectiveRec.opex?.total || 0
            },
            ebitda: effectiveRec.operatingProfit ?? basePerf?.ebitda ?? (gp - (effectiveRec.opex?.total || 0)),
            depreciation: basePerf?.depreciation || 0,
            financeCharges: effectiveRec.interestExpense ?? basePerf?.financeCharges ?? 0,
            ebt: effectiveRec.ebt ?? basePerf?.ebt ?? (gp - (effectiveRec.opex?.total || 0) - (effectiveRec.interestExpense || 0)),
            taxation: effectiveRec.taxExpense ?? basePerf?.taxation ?? 0,
            netProfit: np,
            npMargin: npPct,
            equity: eq,
            roe: roeVal,
            units: basePerf?.units || {
              techbook: { marketSize: 0, forecast: 0, demand: effectiveRec.market?.demandUnits?.techbook || 0, available: 0, actual: effectiveRec.market?.actualUnits?.techbook || 0 },
              zroid: { marketSize: 0, forecast: 0, demand: effectiveRec.market?.demandUnits?.zroid || 0, available: 0, actual: effectiveRec.market?.actualUnits?.zroid || 0 },
              itab: { marketSize: 0, forecast: 0, demand: effectiveRec.market?.demandUnits?.itab || 0, available: 0, actual: effectiveRec.market?.actualUnits?.itab || 0 }
            },
            totalScore: basePerf?.totalScore || { techbook: 0, zroid: 0, itab: 0 },
            marketShare: basePerf?.marketShare || effectiveRec.market?.marketShare || { techbook: 0, zroid: 0, itab: 0 },
            price: basePerf?.price || effectiveRec.marketing?.prices || { techbook: 0, zroid: 0, itab: 0 },
            staffCounts: basePerf?.staffCounts || { engineers: 0, technicians: 150, semiSkilled: 200, adminSales: 20, customerService: 15 },
            trainingLevels: basePerf?.trainingLevels || { engineers: 'Basic', technicians: 'Basic', semiSkilled: 'Basic', adminSales: 'Basic', customerService: 'Basic' },
            unitsProduced: basePerf?.unitsProduced || (effectiveRec.market?.actualUnits?.techbook || 0) + (effectiveRec.market?.actualUnits?.zroid || 0) + (effectiveRec.market?.actualUnits?.itab || 0),
            unitsSold: basePerf?.unitsSold || (effectiveRec.market?.actualUnits?.techbook || 0) + (effectiveRec.market?.actualUnits?.zroid || 0) + (effectiveRec.market?.actualUnits?.itab || 0)
          } as TeamIndustryPerformance;
        } else {
          perf = basePerf;
        }

        return {
          id: t.id,
          name: formattedName,
          ceoName: t.ceoName || (t.draftDecisions as any)?.general?.ceoName || (t.draftDecisions as any)?.ceoName,
          colorIndex: index,
          record,
          prior,
          perf,
          fullHistory: t.history || {}
        };
      });

      setDataset({
        className: currentClassName || 'Simulation Class',
        period,
        teams: debriefTeams,
        loading: false,
        error: null,
        editionId: currentEditionId
      });
    };

    unsubClass = onSnapshot(classRef, (snap) => {
      if (snap.exists()) {
        const cData = snap.data() as SimulationClass;
        currentClassName = cData.name || '';
        currentEditionId = cData.editionId;
        if (cData.teams && cData.teams.length > 0) {
          rawTeams = mergeTeamsWithHistory(cData.teams, rawTeams);
        }
        updateCombined();
      } else {
        const fallback = loadFallbackTeams();
        if (fallback.length > 0) {
          rawTeams = mergeTeamsWithHistory(fallback, rawTeams);
          updateCombined();
        } else {
          setDataset(prev => ({ ...prev, loading: false, error: 'Class not found' }));
        }
      }
    }, (err) => {
      const fallback = loadFallbackTeams();
      if (fallback.length > 0) {
        rawTeams = mergeTeamsWithHistory(fallback, rawTeams);
        updateCombined();
      } else {
        setDataset(prev => ({ ...prev, loading: false, error: err.message }));
      }
    });

    unsubTeams = onSnapshot(teamsRef, (snap) => {
      if (!snap.empty) {
        const dbTeams = snap.docs.map(d => d.data() as Team);
        rawTeams = mergeTeamsWithHistory(dbTeams, rawTeams);
        updateCombined();
      }
    }, () => {});

    return () => {
      if (unsubClass) unsubClass();
      if (unsubTeams) unsubTeams();
    };
  }, [classId, period]);

  return dataset;
}
