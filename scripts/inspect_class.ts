import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

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
    console.log(`\n================ Team: ${t.name} (${t.id}) ================`);
    const p1Rec = t.history?.[1] || t.history?.['1'];
    if (p1Rec) {
      console.log('p1Rec keys:', Object.keys(p1Rec));
      console.log('decisions:', JSON.stringify(p1Rec.decisions?.marketing || p1Rec.marketing, null, 2));
      console.log('units:', JSON.stringify(p1Rec.units, null, 2));
      console.log('revenue:', JSON.stringify(p1Rec.revenue, null, 2));
      console.log('cogs:', JSON.stringify(p1Rec.cogs, null, 2));
      console.log('industry:', JSON.stringify(p1Rec.industry, null, 2));
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
