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
  await setDoc(
    ref,
    {
      ...profile,
      createdAt: profile.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const saveClass = async (simClass: SimulationClass): Promise<void> => {
  const ref = doc(db, 'classes', simClass.id);
  await setDoc(
    ref,
    {
      ...simClass,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
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
  await setDoc(
    ref,
    {
      ...facilitator,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
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
  await setDoc(
    ref,
    {
      ...admin,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
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
  await setDoc(
    ref,
    {
      ...team,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};
