import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { getAppDb } from '../firebase';
import { PeriodRecord, SimulationClass, Team } from '../types';
import { ensurePeriodMarketRecord } from '../utils/debriefBackfill';
import { processTurn } from '../utils/SimulationEngine';
import { computeMarketShareBackModel } from '../utils/marketShareBackModel';
import { INITIAL_DECISIONS } from '../constants';

export interface DebriefTeam {
  id: string;
  name: string;
  colorIndex: number;
  record: PeriodRecord;
  prior?: PeriodRecord;
}

export interface DebriefDataset {
  className: string;
  period: number;
  teams: DebriefTeam[];
  loading: boolean;
  error: string | null;
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

        const mergedHistory = { ...pHist, ...sHist };

        return {
          ...pTeam,
          ...sTeam,
          history: mergedHistory
        };
      });
    };

    const updateCombined = () => {
      const fallback = loadFallbackTeams();
      rawTeams = mergeTeamsWithHistory(rawTeams, fallback);

      // Filter out archived teams, keep bots
      const activeTeams = rawTeams
        .filter(t => !t.isArchived)
        .sort((a, b) => a.id.localeCompare(b.id));

      let backModelCurrent: any[] = [];
      try {
        if (activeTeams.length > 0) {
          backModelCurrent = computeMarketShareBackModel(activeTeams, period);
        }
      } catch (err) {
        console.warn("Error running market share back model in debrief:", err);
      }

      const debriefTeams: DebriefTeam[] = activeTeams.map((t, index) => {
        const rawRec = t.history?.[period] || t.history?.[String(period)];
        const rawPriorRec = t.history?.[period - 1] || t.history?.[String(period - 1)];

        // If committed history exists for this period, use it directly to match reports exactly.
        // If not committed yet, compute live via processTurn passing [] for events.
        let record = rawRec 
          ? ensurePeriodMarketRecord(rawRec) 
          : ensurePeriodMarketRecord(processTurn(t, t.draftDecisions || INITIAL_DECISIONS, []).periodRecord);

        const prior = rawPriorRec ? ensurePeriodMarketRecord(rawPriorRec) : undefined;

        // ONLY enrich with backModelCurrent if previewing live uncommitted decisions
        if (!rawRec && backModelCurrent && backModelCurrent.length > 0) {
          const tbRes = backModelCurrent.find(r => r.productId === 'techbook');
          const zrRes = backModelCurrent.find(r => r.productId === 'zroid');
          const itRes = backModelCurrent.find(r => r.productId === 'itab');

          const tbShare = tbRes?.marketShareByTeam?.[index] ?? 0;
          const zrShare = zrRes?.marketShareByTeam?.[index] ?? 0;
          const itShare = itRes?.marketShareByTeam?.[index] ?? 0;

          const tbUnits = tbRes?.unitsSoldByTeam?.[index] ?? tbRes?.actualUnitsByTeam?.[index] ?? 0;
          const zrUnits = zrRes?.unitsSoldByTeam?.[index] ?? zrRes?.actualUnitsByTeam?.[index] ?? 0;
          const itUnits = itRes?.unitsSoldByTeam?.[index] ?? itRes?.actualUnitsByTeam?.[index] ?? 0;

          const tbDemand = tbRes?.demandUnitsByTeam?.[index] ?? 0;
          const zrDemand = zrRes?.demandUnitsByTeam?.[index] ?? 0;
          const itDemand = itRes?.demandUnitsByTeam?.[index] ?? 0;

          const tbForecast = tbRes?.forecastUnitsByTeam?.[index] ?? 0;
          const zrForecast = zrRes?.forecastUnitsByTeam?.[index] ?? 0;
          const itForecast = itRes?.forecastUnitsByTeam?.[index] ?? 0;

          const tbVal = tbRes?.valueScoreByTeam?.[index] ?? 50;
          const zrVal = zrRes?.valueScoreByTeam?.[index] ?? 50;
          const itVal = itRes?.valueScoreByTeam?.[index] ?? 50;

          const tbValEx = tbRes?.valueScoreExPriceByTeam?.[index] ?? 50;
          const zrValEx = zrRes?.valueScoreExPriceByTeam?.[index] ?? 50;
          const itValEx = itRes?.valueScoreExPriceByTeam?.[index] ?? 50;

          // Compute accurate product revenues from actual units won * price if previewing live
          const priceTB = t.draftDecisions?.marketing?.prices?.techbook ?? (record.prices?.techbook ?? 2500);
          const priceZR = t.draftDecisions?.marketing?.prices?.zroid ?? (record.prices?.zroid ?? 4500);
          const priceIT = t.draftDecisions?.marketing?.prices?.itab ?? (record.prices?.itab ?? 6000);

          const liveRevTB = tbUnits * priceTB;
          const liveRevZR = zrUnits * priceZR;
          const liveRevIT = itUnits * priceIT;
          const liveRevTotal = liveRevTB + liveRevZR + liveRevIT;

          // Compute Unit COGS accurately from simulation engine calculations
          const origUnitsTB = record.market?.actualUnits?.techbook || 0;
          const origUnitsZR = record.market?.actualUnits?.zroid || 0;
          const origUnitsIT = record.market?.actualUnits?.itab || 0;

          const cogsPerUnitTB = origUnitsTB > 0 ? (record.cogs.byProduct.techbook / origUnitsTB) : (priceTB * 0.55);
          const cogsPerUnitZR = origUnitsZR > 0 ? (record.cogs.byProduct.zroid / origUnitsZR) : (priceZR * 0.55);
          const cogsPerUnitIT = origUnitsIT > 0 ? (record.cogs.byProduct.itab / origUnitsIT) : (priceIT * 0.55);

          const liveCogsTB = Math.round(tbUnits * cogsPerUnitTB);
          const liveCogsZR = Math.round(zrUnits * cogsPerUnitZR);
          const liveCogsIT = Math.round(itUnits * cogsPerUnitIT);

          const liveGPTB = liveRevTB - liveCogsTB;
          const liveGPZR = liveRevZR - liveCogsZR;
          const liveGPIT = liveRevIT - liveCogsIT;
          const liveGPTotal = liveGPTB + liveGPZR + liveGPIT;

          record = {
            ...record,
            revenue: {
              total: liveRevTotal,
              byProduct: {
                techbook: liveRevTB,
                zroid: liveRevZR,
                itab: liveRevIT
              }
            },
            grossProfit: {
              total: liveGPTotal,
              byProduct: {
                techbook: liveGPTB,
                zroid: liveGPZR,
                itab: liveGPIT
              }
            },
            market: {
              marketSize: record.market?.marketSize || { techbook: 288750, zroid: 179888, itab: 89750 },
              availableUnits: record.market?.availableUnits || { techbook: tbUnits, zroid: zrUnits, itab: itUnits },
              actualShare: {
                techbook: tbShare,
                zroid: zrShare,
                itab: itShare
              },
              actualUnits: {
                techbook: tbUnits,
                zroid: zrUnits,
                itab: itUnits
              },
              demandUnits: {
                techbook: tbDemand,
                zroid: zrDemand,
                itab: itDemand
              },
              forecastUnits: {
                techbook: tbForecast,
                zroid: zrForecast,
                itab: itForecast
              },
              valueScore: {
                techbook: tbVal,
                zroid: zrVal,
                itab: itVal
              },
              valueScoreExPrice: {
                techbook: tbValEx,
                zroid: zrValEx,
                itab: itValEx
              }
            }
          };
        }

        const match = t.id.match(/\d+/);
        const teamNum = match ? match[0] : String(index + 1);
        const formattedName = t.name.startsWith(`(${teamNum})`) ? t.name : `(${teamNum}) ${t.name}`;

        return {
          id: t.id,
          name: formattedName,
          colorIndex: index,
          record,
          prior
        };
      });

      setDataset({
        className: currentClassName || 'Simulation Class',
        period,
        teams: debriefTeams,
        loading: false,
        error: null
      });
    };

    unsubClass = onSnapshot(classRef, (snap) => {
      if (snap.exists()) {
        const cData = snap.data() as SimulationClass;
        currentClassName = cData.name || '';
        if (cData.teams && cData.teams.length > 0) {
          rawTeams = mergeTeamsWithHistory(rawTeams, cData.teams);
        }
        updateCombined();
      } else {
        const fallback = loadFallbackTeams();
        if (fallback.length > 0) {
          rawTeams = mergeTeamsWithHistory(rawTeams, fallback);
          updateCombined();
        } else {
          setDataset(prev => ({ ...prev, loading: false, error: 'Class not found' }));
        }
      }
    }, (err) => {
      const fallback = loadFallbackTeams();
      if (fallback.length > 0) {
        rawTeams = mergeTeamsWithHistory(rawTeams, fallback);
        updateCombined();
      } else {
        setDataset(prev => ({ ...prev, loading: false, error: err.message }));
      }
    });

    unsubTeams = onSnapshot(teamsRef, (snap) => {
      if (!snap.empty) {
        const dbTeams = snap.docs.map(d => d.data() as Team);
        rawTeams = mergeTeamsWithHistory(rawTeams, dbTeams);
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
