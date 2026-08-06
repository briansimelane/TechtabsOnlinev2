import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { getAppDb } from '../firebase';
import { PeriodRecord, SimulationClass, Team } from '../types';
import { ensurePeriodMarketRecord } from '../utils/debriefBackfill';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance, TeamIndustryPerformance } from '../utils/industryPerformance';
import { INITIAL_DECISIONS } from '../constants';

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

        const record = rawRec 
          ? ensurePeriodMarketRecord(rawRec) 
          : ensurePeriodMarketRecord(processTurn(t, t.draftDecisions || INITIAL_DECISIONS, []).periodRecord);

        const prior = rawPriorRec ? ensurePeriodMarketRecord(rawPriorRec) : undefined;
        const perf: TeamIndustryPerformance = livePerfMap.get(t.id) || rawRec?.industry || livePerfList[index];

        const match = t.id.match(/\d+/);
        const teamNum = match ? match[0] : String(index + 1);
        const formattedName = t.name.startsWith(`(${teamNum})`) ? t.name : `(${teamNum}) ${t.name}`;

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
        error: null
      });
    };

    unsubClass = onSnapshot(classRef, (snap) => {
      if (snap.exists()) {
        const cData = snap.data() as SimulationClass;
        currentClassName = cData.name || '';
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
