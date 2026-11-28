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

const MAX_PRICES = {
  techbook: 6000,
  zroid: 8250,
  itab: 11850
};

async function main() {
  const classId = 'class_1795711242234';
  const teamsSnap = await getDocs(collection(db, 'classes', classId, 'teams'));
  const teams = teamsSnap.docs.map(d => d.data());

  console.log('TEAM PRICING AND REVENUE IN YEAR 1:');
  console.log('--------------------------------------------------');

  for (const t of teams) {
    const p1Rec = t.history?.[1] || t.history?.['1'];
    const p1Dec = p1Rec?.decisions?.marketing || t.draftDecisions?.marketing;
    const prices = p1Rec?.industry?.price || p1Dec?.prices;
    const revByProd = p1Rec?.revenue?.byProduct || p1Rec?.industry?.revenueByProduct;
    const units = p1Rec?.industry?.units;

    console.log(`\nTeam: ${t.name} (${t.id})`);
    console.log(`Total Revenue: R ${p1Rec?.revenue?.total?.toLocaleString()}`);
    console.log(`Gross Profit: R ${p1Rec?.grossProfit?.total?.toLocaleString()}`);
    console.log(`Net Profit: R ${p1Rec?.netProfit?.toLocaleString()}`);
    console.log(`Closing Cash: R ${p1Rec?.balanceSheet?.cash?.toLocaleString()}`);

    for (const prod of ['techbook', 'zroid', 'itab'] as const) {
      const price = prices?.[prod] ?? 0;
      const maxP = MAX_PRICES[prod];
      const prodRev = revByProd?.[prod] ?? 0;
      const actualUnits = units?.[prod]?.actual ?? 0;
      const isExceeded = price > maxP;
      console.log(`  ${prod.toUpperCase()}: Price = R ${price.toLocaleString()} (Max: R ${maxP.toLocaleString()}) | Units = ${actualUnits.toLocaleString()} | Rev = R ${prodRev.toLocaleString()} ${isExceeded ? '--> [EXCEEDED LIMIT!]' : ''}`);
    }
  }
}

main().catch(console.error);
