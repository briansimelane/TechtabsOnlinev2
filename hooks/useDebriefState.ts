import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getAppDb } from '../firebase';

export interface DebriefState {
  slideIndex: number;    // 0-based index into the compiled slide list
  revealStep: number;    // within-slide stagger step (0 = nothing revealed)
  period: number;        // which simulation year is being debriefed
  isLive: boolean;       // false = presenter shows a holding card
  updatedAt: string;     // ISO string
}

const DEFAULT_STATE: DebriefState = {
  slideIndex: 0,
  revealStep: 0,
  period: 1,
  isLive: true,
  updatedAt: new Date().toISOString()
};

export function useDebriefState(classId: string | null, initialPeriod?: number) {
  const [state, setState] = useState<DebriefState>(() => ({
    ...DEFAULT_STATE,
    period: initialPeriod || 1
  }));

  const timeoutRef = useRef<any>(null);

  // Subscribe to Firestore doc: classes/{classId}/debrief/state
  useEffect(() => {
    if (!classId) return;

    const db = getAppDb();
    const docRef = doc(db, 'classes', classId, 'debrief', 'state');

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as DebriefState;
        setState(prev => {
          // Compare ISO strings or indices to avoid loop
          if (JSON.stringify(data) !== JSON.stringify(prev)) {
            return data;
          }
          return prev;
        });
      }
    }, (err) => {
      console.warn("Error listening to debrief state:", err);
    });

    return () => unsubscribe();
  }, [classId]);

  // Debounced write function
  const updateState = useCallback((patch: Partial<DebriefState>) => {
    if (!classId) return;

    setState(prev => {
      const nextState: DebriefState = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString()
      };

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const db = getAppDb();
        const docRef = doc(db, 'classes', classId, 'debrief', 'state');
        void setDoc(docRef, nextState, { merge: true }).catch(err => {
          console.warn("Failed to publish debrief state:", err);
        });
      }, 150);

      return nextState;
    });
  }, [classId]);

  return { state, updateState };
}
