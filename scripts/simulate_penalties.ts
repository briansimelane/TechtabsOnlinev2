import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { computeClassMarks, DEFAULT_MARKS_CONFIG } from '../utils/marksEngine';
import { Team, ProductId } from '../types';

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

const MAX_PRICES: Record<ProductId, number> = {
  techbook: 6000,
  zroid: 8250,
  itab: 11850
};

async function main() {
  const classId = 'class_1795711242234';
  const classSnap = await getDoc(doc(db, 'classes', classId));
  const clsData = classSnap.data();
  const teamsSnap = await getDocs(collection(db, 'classes', classId, 'teams'));
  const rawTeams = teamsSnap.docs.map(d => d.data() as Team);

  // Compute baseline marks
  const baseMarks = computeClassMarks(rawTeams, DEFAULT_MARKS_CONFIG);

  console.log("==========================================================================");
  console.log("BASELINE FINANCIALS & MARKS (BEFORE ANY PENALTY) FOR YEAR 1");
  console.log("==========================================================================");

  for (const t of rawTeams) {
    const p1 = t.history?.[1] || t.history?.['1'];
    const markRes = baseMarks.teams.find(m => m.teamId === t.id);
    const rev = p1?.revenue?.total ?? 0;
    const cogs = p1?.cogs?.total ?? 0;
    const gp = p1?.grossProfit?.total ?? 0;
    const np = p1?.netProfit ?? 0;
    const cash = p1?.balanceSheet?.cash ?? 0;
    const cosPct = rev > 0 ? (cogs / rev) * 100 : 0;
    const gpPct = rev > 0 ? (gp / rev) * 100 : 0;

    console.log(`\nTeam: ${t.name} (${t.id})`);
    console.log(`  Revenue: R ${rev.toLocaleString()} | COGS: R ${cogs.toLocaleString()} (COS: ${cosPct.toFixed(1)}%, GP: ${gpPct.toFixed(1)}%)`);
    console.log(`  Gross Profit: R ${gp.toLocaleString()} | Net Profit: R ${np.toLocaleString()}`);
    console.log(`  Closing Cash: R ${cash.toLocaleString()}`);
    console.log(`  Marks: Base = ${markRes?.totalBase}, Additional = ${markRes?.totalAdditional}, TOTAL = ${markRes?.total}`);
  }

  // Calculate penalties under both models
  console.log("\n==========================================================================");
  console.log("CALCULATING PENALTIES UNDER BOTH INTERPRETATIONS");
  console.log("==========================================================================");

  for (const t of rawTeams) {
    const p1 = t.history?.[1] || t.history?.['1'];
    const prices = p1?.industry?.price || p1?.decisions?.marketing?.prices;
    const revByProd = p1?.revenue?.byProduct || p1?.industry?.revenueByProduct;
    const units = p1?.industry?.units;

    let excessPenaltyTotal = 0;
    let fullProdPenaltyTotal = 0;
    const breakdown: string[] = [];

    for (const prod of ['techbook', 'zroid', 'itab'] as const) {
      const price = prices?.[prod] ?? 0;
      const maxP = MAX_PRICES[prod];
      const prodRev = revByProd?.[prod] ?? 0;
      const actualUnits = units?.[prod]?.actual ?? 0;

      if (price > maxP) {
        const excessPerUnit = price - maxP;
        const excessRev = excessPerUnit * actualUnits;
        excessPenaltyTotal += excessRev;
        fullProdPenaltyTotal += prodRev;
        breakdown.push(`    - ${prod.toUpperCase()}: Price R${price.toLocaleString()} vs Max R${maxP.toLocaleString()} (+R${excessPerUnit.toLocaleString()}/unit). Units: ${actualUnits.toLocaleString()}. Excess Rev = R${excessRev.toLocaleString()}, Full Rev = R${prodRev.toLocaleString()}`);
      }
    }

    if (breakdown.length > 0) {
      console.log(`\nTeam: ${t.name} (${t.id}) [BREACHED PRICE LIMITS]`);
      breakdown.forEach(b => console.log(b));
      console.log(`  --> INTERPRETATION 1 (Excess Revenue Penalty): R ${excessPenaltyTotal.toLocaleString()}`);
      console.log(`  --> INTERPRETATION 2 (Full Product Revenue Loss): R ${fullProdPenaltyTotal.toLocaleString()}`);
    } else {
      console.log(`\nTeam: ${t.name}: COMPLIANT (No price gouging)`);
    }
  }

  // Now simulate adjusted marks under Interpretation 1 (Excess Revenue Penalty)
  const teamsInterp1: Team[] = JSON.parse(JSON.stringify(rawTeams));
  for (const t of teamsInterp1) {
    const p1 = t.history?.[1] || t.history?.['1'];
    const prices = p1?.industry?.price || p1?.decisions?.marketing?.prices;
    const revByProd = p1?.revenue?.byProduct || p1?.industry?.revenueByProduct;
    const units = p1?.industry?.units;

    let penalty = 0;
    for (const prod of ['techbook', 'zroid', 'itab'] as const) {
      const price = prices?.[prod] ?? 0;
      const maxP = MAX_PRICES[prod];
      const actualUnits = units?.[prod]?.actual ?? 0;
      if (price > maxP) {
        penalty += (price - maxP) * actualUnits;
      }
    }

    if (penalty > 0 && p1) {
      // Adjust p1 records
      const origRev = p1.revenue.total;
      const origGp = p1.grossProfit.total;
      const origNp = p1.netProfit;
      const origCash = p1.balanceSheet.cash;
      const origEquity = p1.balanceSheet.equity;

      // Expense deduction: EBT drops by penalty, tax drops by 28% of penalty (or tax unchanged if penalty is non-deductible)
      // Let's assume tax is 28% of (EBT - penalty) if EBT > 0
      const origEbt = p1.ebt ?? (p1.ebitda - p1.depreciation - p1.interest);
      const adjEbt = origEbt - penalty;
      const adjTax = adjEbt > 0 ? Math.round(adjEbt * 0.28) : 0;
      const adjNp = adjEbt - adjTax;
      const npDiff = adjNp - origNp; // penalty after tax

      // If user says "removed from cash" directly:
      // Does cash reduce by full penalty or by after-tax net profit?
      // "This will be an expense in the income statement and should be taken into account for all profitability numbers after it and also removed from the Cash."
      // If it's an expense in the IS: EBITDA = EBITDA - Penalty, EBT = EBT - Penalty, Tax = 28% * EBT, NP = EBT - Tax.
      // And in cash: Cash = Cash - Penalty (or Cash = Cash + net profit diff).
      // Let's also test where revenue is adjusted down for marks!
      p1.maxRevenuePenalty = penalty;
      p1.revenue.total = origRev - penalty;
      p1.grossProfit.total = origGp - penalty;
      p1.netProfit = adjNp;
      p1.balanceSheet.cash = origCash - penalty;
      p1.balanceSheet.equity = origEquity + npDiff;
    }
  }

  const marksInterp1 = computeClassMarks(teamsInterp1, DEFAULT_MARKS_CONFIG);

  console.log("\n==========================================================================");
  console.log("MARKS COMPARISON UNDER INTERPRETATION 1 (EXCESS REVENUE PENALTY)");
  console.log("==========================================================================");
  for (const t of rawTeams) {
    const origM = baseMarks.teams.find(m => m.teamId === t.id);
    const newM = marksInterp1.teams.find(m => m.teamId === t.id);
    console.log(`Team: ${t.name.padEnd(22)} | Orig Mark: ${origM?.total.toString().padStart(3)} (Base: ${origM?.totalBase}, Add: ${origM?.totalAdditional}) | New Mark: ${newM?.total.toString().padStart(3)} (Base: ${newM?.totalBase}, Add: ${newM?.totalAdditional}) | Diff: ${(newM!.total - origM!.total) >= 0 ? '+' : ''}${newM!.total - origM!.total}`);
  }

  // Now simulate adjusted marks under Interpretation 2 (Full Product Revenue Loss)
  const teamsInterp2: Team[] = JSON.parse(JSON.stringify(rawTeams));
  for (const t of teamsInterp2) {
    const p1 = t.history?.[1] || t.history?.['1'];
    const prices = p1?.industry?.price || p1?.decisions?.marketing?.prices;
    const revByProd = p1?.revenue?.byProduct || p1?.industry?.revenueByProduct;

    let penalty = 0;
    for (const prod of ['techbook', 'zroid', 'itab'] as const) {
      const price = prices?.[prod] ?? 0;
      const maxP = MAX_PRICES[prod];
      const prodRev = revByProd?.[prod] ?? 0;
      if (price > maxP) {
        penalty += prodRev;
      }
    }

    if (penalty > 0 && p1) {
      const origRev = p1.revenue.total;
      const origGp = p1.grossProfit.total;
      const origNp = p1.netProfit;
      const origCash = p1.balanceSheet.cash;
      const origEquity = p1.balanceSheet.equity;

      const origEbt = p1.ebt ?? (p1.ebitda - p1.depreciation - p1.interest);
      const adjEbt = origEbt - penalty;
      const adjTax = adjEbt > 0 ? Math.round(adjEbt * 0.28) : 0;
      const adjNp = adjEbt - adjTax;
      const npDiff = adjNp - origNp;

      p1.maxRevenuePenalty = penalty;
      p1.revenue.total = Math.max(0, origRev - penalty);
      p1.grossProfit.total = origGp - penalty;
      p1.netProfit = adjNp;
      p1.balanceSheet.cash = origCash - penalty;
      p1.balanceSheet.equity = origEquity + npDiff;
    }
  }

  const marksInterp2 = computeClassMarks(teamsInterp2, DEFAULT_MARKS_CONFIG);

  console.log("\n==========================================================================");
  console.log("MARKS COMPARISON UNDER INTERPRETATION 2 (FULL PRODUCT REVENUE LOSS)");
  console.log("==========================================================================");
  for (const t of rawTeams) {
    const origM = baseMarks.teams.find(m => m.teamId === t.id);
    const newM = marksInterp2.teams.find(m => m.teamId === t.id);
    console.log(`Team: ${t.name.padEnd(22)} | Orig Mark: ${origM?.total.toString().padStart(3)} (Base: ${origM?.totalBase}, Add: ${origM?.totalAdditional}) | New Mark: ${newM?.total.toString().padStart(3)} (Base: ${newM?.totalBase}, Add: ${newM?.totalAdditional}) | Diff: ${(newM!.total - origM!.total) >= 0 ? '+' : ''}${newM!.total - origM!.total}`);
  }
}

main().catch(console.error);
