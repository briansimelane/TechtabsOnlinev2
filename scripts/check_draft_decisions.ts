import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: "AIzaSyCsqHryZ5-oL_6hz06g4KFuIjpAC1nyhtU",
	authDomain: "techtabssim.firebaseapp.com",
	projectId: "techtabssim",
	storageBucket: "techtabssim.firebasestorage.app",
	messagingSenderId: "63556623298",
	appId: "1:63556623298:web:c56238f8601c627dc0d45b",
	measurementId: "G-LHPW399Z6R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const classId = 'class_1795711242234';
  const teamsSnap = await getDocs(collection(db, 'classes', classId, 'teams'));
  const teams = teamsSnap.docs.map(d => d.data());

  for (const t of teams) {
    console.log(`\nTeam: ${t.name} (${t.id})`);
    console.log('Current status:', t.status);
    console.log('Current Period:', t.currentPeriod);
    const p1Rec = t.history?.[1] || t.history?.['1'];
    console.log('P1 History decisions pricing:', p1Rec?.decisions?.marketing?.prices);
    console.log('Draft decisions pricing:', t.draftDecisions?.marketing?.prices);
  }
}

main().catch(console.error);
