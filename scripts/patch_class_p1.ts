import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { Team, ProductId } from '../types';
import { MAX_RETAIL_PRICES } from '../constants';

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

async function previewAndPatch(doWrite: boolean) {
  const classId = 'class_1795711242234';
  const teamsSnap = await getDocs(collection(db, 'classes', classId, 'teams'));
  const teams = teamsSnap.docs.map(d => ({ docId: d.id, data: d.data() as Team }));

  console.log(`Class: ${classId} | Teams: ${teams.length} | Mode: ${doWrite ? 'LIVE WRITE' : 'DRY RUN'}\n`);

  for (const { docId, data: team } of teams) {
    const p1 = team.history?.[1] || team.history?.['1'];
    if (!p1) {
      console.log(`Team ${team.name} has no Period 1 history! Skipping.`);
      continue;
    }

    const prices = p1.industry?.price || p1.decisions?.marketing?.prices;
    const units = p1.industry?.units;
    let penalty = 0;
    const productPenalties: Record<string, { price: number; maxPrice: number; units: number; penalty: number }> = {};

    for (const prod of ['techbook', 'zroid', 'itab'] as const) {
      const price = prices?.[prod] ?? 0;
      const maxP = MAX_RETAIL_PRICES[prod];
      const actualUnits = units?.[prod]?.actual ?? 0;
      if (price > maxP) {
        const prodPen = (price - maxP) * actualUnits;
        penalty += prodPen;
        productPenalties[prod] = { price, maxPrice: maxP, units: actualUnits, penalty: prodPen };
      }
    }

    console.log(`================ Team: ${team.name} (${docId}) ================`);
    if (penalty === 0) {
      console.log(`Status: COMPLIANT (No penalty). P1 Net Profit: R ${p1.netProfit?.toLocaleString()}, Cash: R ${p1.balanceSheet?.cash?.toLocaleString()}\n`);
      continue;
    }

    console.log(`Status: PENALTY APPLICABLE! Total Penalty = R ${penalty.toLocaleString()}`);
    Object.entries(productPenalties).forEach(([prod, info]) => {
      console.log(`  - ${prod.toUpperCase()}: Price R${info.price.toLocaleString()} vs Max R${info.maxPrice.toLocaleString()} (+R${(info.price - info.maxPrice).toLocaleString()}/unit) | Units: ${info.units.toLocaleString()} | Penalty: R${info.penalty.toLocaleString()}`);
    });

    const oldRev = p1.revenue?.total ?? 0;
    const oldGp = p1.grossProfit?.total ?? 0;
    const oldOpex = p1.opex?.total ?? p1.industry?.opex?.total ?? 0;
    const oldDepr = p1.depreciation ?? 1535965;
    const oldFin = p1.interest ?? p1.industry?.financeCharges ?? 0;
    const oldNp = p1.netProfit ?? 0;
    const oldCash = p1.balanceSheet?.cash ?? 0;
    const oldEq = p1.balanceSheet?.equity ?? 0;

    // Recalculate with penalty as IS expense before EBITDA
    const newEbitda = oldGp - penalty - oldOpex;
    const newEbt = newEbitda - oldDepr - oldFin;
    const newTax = newEbt > 0 ? Math.round(newEbt * 0.28) : 0;
    const newNp = newEbt - newTax;
    const npDiff = newNp - oldNp;

    // Balance sheet update:
    // Equity changes by npDiff
    const newEq = oldEq + npDiff;
    // Cash changes by npDiff so Balance Sheet remains 100% in equilibrium
    const newCash = oldCash + npDiff;

    console.log(`\n  FINANCIAL RECALCULATION:`);
    console.log(`    Gross Profit:          R ${oldGp.toLocaleString()} (Unchanged)`);
    console.log(`    Max Revenue Penalty:   R ${penalty.toLocaleString()} (New Line Item)`);
    console.log(`    Operating Expenses:    R ${oldOpex.toLocaleString()} (Unchanged)`);
    console.log(`    EBITDA:                R ${p1.ebitda?.toLocaleString()} -> R ${newEbitda.toLocaleString()}`);
    console.log(`    EBT:                   R ${p1.ebt?.toLocaleString()} -> R ${newEbt.toLocaleString()}`);
    console.log(`    Taxation (28%):        R ${p1.tax?.toLocaleString()} -> R ${newTax.toLocaleString()}`);
    console.log(`    Net Profit:            R ${oldNp.toLocaleString()} -> R ${newNp.toLocaleString()} (Diff: R ${npDiff.toLocaleString()})`);
    console.log(`    Closing Cash (P1):     R ${oldCash.toLocaleString()} -> R ${newCash.toLocaleString()}`);
    console.log(`    Closing Equity (P1):   R ${oldEq.toLocaleString()} -> R ${newEq.toLocaleString()}`);
    console.log(`    Year 2 Opening Cash:   R ${team.cashBalance?.toLocaleString()} -> R ${newCash.toLocaleString()}`);
    console.log(`    Year 2 Opening Equity: R ${team.shareholdersEquity?.toLocaleString()} -> R ${newEq.toLocaleString()}`);

    if (doWrite) {
      const updatedP1 = {
        ...p1,
        maxRevenuePenalty: penalty,
        ebitda: newEbitda,
        ebt: newEbt,
        tax: newTax,
        netProfit: newNp,
        balanceSheet: {
          ...p1.balanceSheet,
          cash: newCash,
          equity: newEq,
          totalAssets: (p1.balanceSheet?.fixedAssets ?? 0) + newCash + (p1.balanceSheet?.receivables ?? 0) + (p1.balanceSheet?.inventory ?? 0),
          totalLiabilitiesAndEquity: newEq + (p1.balanceSheet?.longTermDebt ?? 0) + (p1.balanceSheet?.currentLiabilities ?? 0)
        },
        industry: {
          ...p1.industry,
          maxRevenuePenalty: penalty,
          ebitda: newEbitda,
          ebt: newEbt,
          taxation: newTax,
          netProfit: newNp,
          npMargin: oldRev > 0 ? (newNp / oldRev) * 100 : 0,
          equity: newEq,
          roe: newEq > 0 ? (newNp / newEq) * 100 : 0
        }
      };

      const teamRef = doc(db, 'classes', classId, 'teams', docId);
      await updateDoc(teamRef, {
        'history.1': updatedP1,
        cashBalance: newCash,
        shareholdersEquity: newEq
      });
      console.log(`  >>> Successfully updated Firestore for ${team.name}!`);
    }
  }
}

const isWrite = process.argv.includes('--write');
previewAndPatch(isWrite).catch(console.error);
