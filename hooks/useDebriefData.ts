import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { getAppDb } from '../firebase';
import { PeriodRecord, SimulationClass, Team } from '../types';
import { ensurePeriodMarketRecord } from '../utils/debriefBackfill';

import { processTurn } from '../utils/SimulationEngine';
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

    const updateCombined = () => {
      // Filter out archived teams, keep bots
      const activeTeams = rawTeams
        .filter(t => !t.isArchived)
        .sort((a, b) => a.id.localeCompare(b.id));

      const debriefTeams: DebriefTeam[] = activeTeams.map((t, index) => {
        const rawRec = t.history?.[period];
        const rawPriorRec = t.history?.[period - 1];

        // If history for this period is not committed yet, compute live via processTurn
        const record = rawRec 
          ? ensurePeriodMarketRecord(rawRec) 
          : ensurePeriodMarketRecord(processTurn(t, t.draftDecisions || INITIAL_DECISIONS, []).periodRecord);

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
