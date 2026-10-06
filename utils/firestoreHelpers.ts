import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getAppDb } from '../firebase';
import { Facilitator, Role, SimulationClass, Team, Administrator } from '../types';

const db = getAppDb();

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  currentClassId: string | null;
  teamId?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  if ('_methodName' in (data as Record<string, any>) || 'toMillis' in (data as Record<string, any>)) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized as T;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as UserProfile;
};

export const upsertUserProfile = async (profile: UserProfile): Promise<void> => {
  const ref = doc(db, 'users', profile.uid);
  const cleanData = sanitizeForFirestore({
    ...profile,
    createdAt: profile.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await setDoc(ref, cleanData, { merge: true });
};

export const saveClass = async (simClass: SimulationClass): Promise<void> => {
  const ref = doc(db, 'classes', simClass.id);
  const cleanData = sanitizeForFirestore({
    ...simClass,
    updatedAt: serverTimestamp()
  });
  await setDoc(ref, cleanData, { merge: true });
};

export const deleteClassById = async (classId: string): Promise<void> => {
  const ref = doc(db, 'classes', classId);
  await deleteDoc(ref);
};

export const listClasses = async (): Promise<SimulationClass[]> => {
  const snapshot = await getDocs(collection(db, 'classes'));
  const classesList: SimulationClass[] = [];
  
  for (const docSnap of snapshot.docs) {
    const cls = docSnap.data() as SimulationClass;
    try {
      const teamsSnapshot = await getDocs(collection(db, 'classes', cls.id, 'teams'));
      const dbTeams = teamsSnapshot.docs.map(tSnap => tSnap.data() as Team);
      if (dbTeams.length > 0) {
        cls.teams = dbTeams.sort((a, b) => a.id.localeCompare(b.id));
        const maxTeamPeriod = Math.max(...dbTeams.map(t => t.currentPeriod || 1));
        if (maxTeamPeriod > (cls.currentPeriod || 1)) {
          console.log(`Auto-healing class ${cls.id} currentPeriod from ${cls.currentPeriod} to ${maxTeamPeriod}`);
          cls.currentPeriod = maxTeamPeriod;
          void setDoc(
            doc(db, 'classes', cls.id),
            sanitizeForFirestore({ currentPeriod: maxTeamPeriod, updatedAt: serverTimestamp() }),
            { merge: true }
          ).catch(err => console.warn(`Failed to auto-heal class ${cls.id} currentPeriod`, err));
        }
      }
    } catch (e) {
      console.error(`Failed to load subcollection teams for class ${cls.id}`, e);
    }
    classesList.push(cls);
  }
  
  return classesList;
};

export const saveFacilitator = async (facilitator: Facilitator): Promise<void> => {
  const ref = doc(db, 'facilitators', facilitator.id);
  const cleanData = sanitizeForFirestore({
    ...facilitator,
    updatedAt: serverTimestamp()
  });
  await setDoc(ref, cleanData, { merge: true });
};

export const deleteFacilitatorById = async (facilitatorId: string): Promise<void> => {
  const ref = doc(db, 'facilitators', facilitatorId);
  await deleteDoc(ref);
};

export const listFacilitators = async (): Promise<Facilitator[]> => {
  const snapshot = await getDocs(collection(db, 'facilitators'));
  return snapshot.docs.map((docSnap) => docSnap.data() as Facilitator);
};

export const saveAdministrator = async (admin: Administrator): Promise<void> => {
  const ref = doc(db, 'administrators', admin.id);
  const cleanData = sanitizeForFirestore({
    ...admin,
    updatedAt: serverTimestamp()
  });
  await setDoc(ref, cleanData, { merge: true });
};

export const deleteAdministratorById = async (adminId: string): Promise<void> => {
  const ref = doc(db, 'administrators', adminId);
  await deleteDoc(ref);
};

export const listAdministrators = async (): Promise<Administrator[]> => {
  const snapshot = await getDocs(collection(db, 'administrators'));
  return snapshot.docs.map((docSnap) => docSnap.data() as Administrator);
};

export const saveTeamState = async (classId: string, team: Team): Promise<void> => {
  const ref = doc(db, 'classes', classId, 'teams', team.id);
  const nowIso = new Date().toISOString();
  let teamToSave: Team = {
    ...team,
    updatedAt: nowIso
  };

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as Team;
      const existingOverrides = existingData?.draftDecisions?.supplierOverrides;
      if (existingOverrides) {
        const currentOverrides = team.draftDecisions?.supplierOverrides;
        teamToSave = {
          ...teamToSave,
          draftDecisions: {
            ...team.draftDecisions,
            supplierOverrides: currentOverrides 
              ? { ...existingOverrides, ...currentOverrides }
              : existingOverrides
          }
        };
      }
    }
  } catch (err) {
    console.warn("Could not fetch existing team doc during saveTeamState safeguard", err);
  }

  const cleanData = sanitizeForFirestore({
    ...teamToSave,
    updatedAt: nowIso
  });
  await setDoc(ref, cleanData, { merge: true });
};
