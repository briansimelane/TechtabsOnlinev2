import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { scoreYear, scoreYearFromPerformance } from '../utils/leagueScoring';
import { Team } from '../types';

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
  const teams = teamsSnap.docs.map(d => d.data() as Team);

  const teamsWithP1 = teams.map(t => ({
    id: t.id,
    name: t.name,
    record: (t.history?.[1] || t.history?.['1'])!
  }));

  const leagueScores = scoreYear(teamsWithP1, 1);
  // Sort descending by score
  leagueScores.sort((a, b) => b.score - a.score || (b.npMargin + b.gpMargin + b.roe) - (a.npMargin + a.gpMargin + a.roe));

  console.log("==========================================================================");
  console.log("CURRENT LEAGUE TABLE STANDINGS (YEAR 1) FOR CLASS ADMP2603 ALP");
  console.log("==========================================================================");
  console.log(String("Rank").padEnd(6) + String("Team Name").padEnd(24) + String("Revenue").padEnd(16) + String("GP Margin").padEnd(12) + String("NP Margin").padEnd(12) + String("ROE").padEnd(10) + String("Points (GP+NP+ROE)").padEnd(20) + "Total Score");
  console.log("---------------------------------------------------------------------------------------------------------------");

  leagueScores.forEach((s, idx) => {
    console.log(
      String(idx + 1).padEnd(6) +
      s.teamName.padEnd(24) +
      ("R " + Math.round(s.revenue / 1000000) + "m").padEnd(16) +
      (s.gpMargin.toFixed(1) + "%").padEnd(12) +
      (s.npMargin.toFixed(1) + "%").padEnd(12) +
      (s.roe.toFixed(1) + "%").padEnd(10) +
      `(${s.gpPoints} + ${s.npPoints} + ${s.roePoints})`.padEnd(20) +
      `${s.score} / ${s.maxScore}`
    );
  });
}

main().catch(console.error);
