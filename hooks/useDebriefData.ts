import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { getAppDb } from '../firebase';
import { PeriodRecord, SimulationClass, Team } from '../types';
import { ensurePeriodMarketRecord } from '../utils/debriefBackfill';

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

    const updateCombined = () => {
      // Filter out archived teams, keep bots
      const activeTeams = rawTeams
        .filter(t => !t.isArchived)
        .sort((a, b) => a.id.localeCompare(b.id));

      const debriefTeams: DebriefTeam[] = activeTeams.map((t, index) => {
        const rawRec = t.history?.[period];
        const rawPriorRec = t.history?.[period - 1];

        const record = rawRec ? ensurePeriodMarketRecord(rawRec) : ensurePeriodMarketRecord({
          period,
          revenue: { total: 0, byProduct: { techbook: 0, zroid: 0, itab: 0 } },
          cogs: { total: 0, byProduct: { techbook: 0, zroid: 0, itab: 0 } },
          grossProfit: { total: 0, byProduct: { techbook: 0, zroid: 0, itab: 0 } },
          opex: { marketing: 0, store: 0, agents: 0, payroll: 0, training: 0, rd: 0, other: 0, total: 0 },
          ebitda: 0, depreciation: 0, interest: 0, ebt: 0, tax: 0, netProfit: 0,
          balanceSheet: { cash: 0, receivables: 0, inventory: 0, fixedAssets: 0, totalAssets: 0, equity: 0, longTermDebt: 0, currentLiabilities: 0, totalLiabilitiesAndEquity: 0 },
          cashFlow: { operating: 0, investing: 0, financing: 0, net: 0 },
          debtorDays: { techbook: 30, zroid: 30, itab: 30 },
          creditorDays: 30,
          interestCoverage: 0,
          kpis: { revenue: 0, netProfit: 0, marketShare: { techbook: 0, zroid: 0, itab: 0 }, customerSatisfaction: 0.7, employeeSatisfaction: 0.7 }
        });

        const prior = rawPriorRec ? ensurePeriodMarketRecord(rawPriorRec) : undefined;

        return {
          id: t.id,
          name: t.name,
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
        if (cData.teams && cData.teams.length > 0 && rawTeams.length === 0) {
          rawTeams = cData.teams;
        }
        updateCombined();
      } else {
        // Fallback for local demo mode stored in localStorage
        try {
          const localClassesRaw = localStorage.getItem('techtabs_classes');
          if (localClassesRaw) {
            const localClasses = JSON.parse(localClassesRaw) as SimulationClass[];
            const found = localClasses.find(c => c.id === classId);
            if (found) {
              currentClassName = found.name;
              rawTeams = found.teams || [];
              updateCombined();
              return;
            }
          }
        } catch (e) {}
        setDataset(prev => ({ ...prev, loading: false, error: 'Class not found' }));
      }
    }, (err) => {
      // Local fallback on error
      try {
        const localClassesRaw = localStorage.getItem('techtabs_classes');
        if (localClassesRaw) {
          const localClasses = JSON.parse(localClassesRaw) as SimulationClass[];
          const found = localClasses.find(c => c.id === classId);
          if (found) {
            currentClassName = found.name;
            rawTeams = found.teams || [];
            updateCombined();
            return;
          }
        }
      } catch (e) {}
      setDataset(prev => ({ ...prev, loading: false, error: err.message }));
    });

    unsubTeams = onSnapshot(teamsRef, (snap) => {
      if (!snap.empty) {
        rawTeams = snap.docs.map(d => d.data() as Team);
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
