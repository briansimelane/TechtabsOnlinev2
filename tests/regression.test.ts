import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance } from '../utils/industryPerformance';
import { getMarketSize, setActiveClassIsALP } from '../constants';
import { Team, TurnDecisions, PeriodRecord } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runRegressionTest() {
  const fixturePath = path.join(__dirname, 'fixtures', 'standard_class_fixture.json');
  assert.ok(fs.existsSync(fixturePath), 'Fixture file must exist');

  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const { initialTeams, periodDecisions, expectedPeriodRecords, expectedIndustryPerf } = fixture;

  let currentTeams: Team[] = JSON.parse(JSON.stringify(initialTeams));

  for (let p = 1; p <= 3; p++) {
    // 1. Assign decisions
    currentTeams.forEach((team) => {
      team.draftDecisions = periodDecisions[p][team.id];
    });

    // 2. Compute industry performance
    const industryPerf = computeIndustryPerformance(currentTeams, p);
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(industryPerf)),
      expectedIndustryPerf[p],
      `Industry performance in period ${p} must match baseline fixture exactly`
    );

    // 3. Process turn with no edition (edition = undefined / null)
    const nextTeams: Team[] = [];
    currentTeams.forEach((team) => {
      const decs = team.draftDecisions!;
      const result = processTurn(team, decs, []);

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(result.periodRecord)),
        expectedPeriodRecords[p][team.id],
        `PeriodRecord for team ${team.id} in period ${p} must match baseline fixture exactly`
      );

      const updatedHistory = {
        ...(team.history || {}),
        [p]: result.periodRecord
      };

      nextTeams.push({
        ...result.newTeamState,
        history: updatedHistory,
        currentPeriod: p + 1
      });
    });

    currentTeams = nextTeams;
  }

  // Verify ALP vs Non-ALP Market Demand Isolation
  setActiveClassIsALP(false);
  assert.strictEqual(getMarketSize('itab', 2), 140953, 'Non-ALP Year 2 iTab demand must remain 140,953');
  assert.strictEqual(getMarketSize('techbook', 2), 197905, 'Non-ALP Year 2 TechBook demand must remain 197,905');
  assert.strictEqual(getMarketSize('zroid', 2), 279760, 'Non-ALP Year 2 Zroid demand must remain 279,760');
  assert.strictEqual(getMarketSize('techbook', 3), 208790, 'Non-ALP Year 3 TechBook demand must remain 208,790');
  assert.strictEqual(getMarketSize('zroid', 3), 300742, 'Non-ALP Year 3 Zroid demand must remain 300,742');
  assert.strictEqual(getMarketSize('itab', 3), 155753, 'Non-ALP Year 3 iTab demand must remain 155,753');

  setActiveClassIsALP(true);
  assert.strictEqual(getMarketSize('itab', 2), 251407, 'ALP Year 2 iTab demand must be 251,407 per scenario');
  assert.strictEqual(getMarketSize('techbook', 2), 240800, 'ALP Year 2 TechBook demand must be 240,800 per scenario');
  assert.strictEqual(getMarketSize('zroid', 2), 287930, 'ALP Year 2 Zroid demand must be 287,930 per scenario');
  assert.strictEqual(getMarketSize('techbook', 3), 82500, 'ALP Year 3 TechBook demand must be 82,500 per scenario');
  assert.strictEqual(getMarketSize('zroid', 3), 160000, 'ALP Year 3 Zroid demand must be 160,000 per scenario');
  assert.strictEqual(getMarketSize('itab', 3), 180000, 'ALP Year 3 iTab demand must be 180,000 per scenario');

  // Verify ALP Regional Market Opportunities (Botswana & Mozambique) in Year 2 and Year 3
  const alpTeamsY2: Team[] = JSON.parse(JSON.stringify(initialTeams)).map((tm: Team, idx: number) => ({
    ...tm,
    currentPeriod: 2,
    draftDecisions: {
      ...periodDecisions[2][tm.id],
      marketing: {
        ...periodDecisions[2][tm.id].marketing,
        // Team 0 and Team 1 enter Botswana; only Team 0 enters Mozambique
        alpOpportunities: {
          botswana: idx === 0 || idx === 1,
          mozambique: idx === 0,
        }
      }
    }
  }));

  const alpPerfY2Baseline = computeIndustryPerformance(
    alpTeamsY2.map(tm => ({
      ...tm,
      draftDecisions: {
        ...tm.draftDecisions!,
        marketing: {
          ...tm.draftDecisions!.marketing,
          alpOpportunities: { botswana: false, mozambique: false }
        }
      }
    })),
    2
  );
  const alpPerfY2 = computeIndustryPerformance(alpTeamsY2, 2);

  // Team 0 and Team 1 split Botswana demand equally (2 teams: 25,000 TechBook, 40,000 Zroid, 30,000 iTab)
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana.entered, true);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana.enteringTeamsCount, 2);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana.allocatedUnits.techbook, 25000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana.allocatedUnits.zroid, 40000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana.allocatedUnits.itab, 30000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana.operatingCost, 90000000);

  // Team 0 gets 100% of Mozambique demand (1 team: 20,000 TechBook, 45,000 Zroid, 40,000 iTab)
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.mozambique?.entered, true);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.mozambique?.enteringTeamsCount, 1);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.mozambique?.allocatedUnits.techbook, 20000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.mozambique?.allocatedUnits.zroid, 45000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.mozambique?.allocatedUnits.itab, 40000);
  assert.strictEqual(
    alpPerfY2[0].alpOpportunities?.mozambique?.operatingCost,
    Math.round((alpPerfY2[0].alpOpportunities?.mozambique?.totalRevenue || 0) * 0.045)
  );

  // Team 2 entered neither market -> otherIncome === 0
  assert.strictEqual(alpPerfY2[2].otherIncome, 0);
  assert.strictEqual(alpPerfY2[2].netProfit, alpPerfY2Baseline[2].netProfit);

  // Team 0 netProfit increases by exact otherIncome
  assert.strictEqual(
    alpPerfY2[0].netProfit,
    alpPerfY2Baseline[0].netProfit + (alpPerfY2[0].otherIncome || 0)
  );

  // Year 3: Team 0 (was in Botswana in Y2) and Team 2 (was NOT in Botswana in Y2) both enter Botswana in Year 3
  const alpTeamsY3: Team[] = alpTeamsY2.map((tm, idx) => ({
    ...tm,
    currentPeriod: 3,
    history: {
      ...(tm.history || {}),
      2: {
        ...(expectedPeriodRecords[2][tm.id] || {}),
        decisions: tm.draftDecisions,
        alpOpportunities: alpPerfY2[idx].alpOpportunities,
        otherIncome: alpPerfY2[idx].otherIncome,
      }
    },
    draftDecisions: {
      ...periodDecisions[3][tm.id],
      marketing: {
        ...periodDecisions[3][tm.id].marketing,
        alpOpportunities: {
          botswana: idx === 0 || idx === 2,
          mozambique: true, // Should be ignored in Year 3 since Mozambique is closed
        }
      }
    }
  }));

  const alpPerfY3 = computeIndustryPerformance(alpTeamsY3, 3);
  // Team 0 was in Botswana in Year 2 -> pays R50m operating agreement + 50% tax on profit
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.botswana.entered, true);
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.botswana.enteredInPreviousYear, true);
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.botswana.operatingCost, 50000000);
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.mozambique, undefined, 'Mozambique must be closed in Year 3');

  // Team 2 was NOT in Botswana in Year 2 -> pays R95m operating agreement + 50% tax on profit
  assert.strictEqual(alpPerfY3[2].alpOpportunities?.botswana.entered, true);
  assert.strictEqual(alpPerfY3[2].alpOpportunities?.botswana.enteredInPreviousYear, false);
  assert.strictEqual(alpPerfY3[2].alpOpportunities?.botswana.operatingCost, 95000000);
  const t2PreTax = (alpPerfY3[2].alpOpportunities?.botswana.totalGrossProfit || 0) - 95000000;
  assert.strictEqual(
    alpPerfY3[2].alpOpportunities?.botswana.tax,
    t2PreTax > 0 ? Math.round(t2PreTax * 0.50) : 0
  );

  setActiveClassIsALP(false);

  console.log('✅ Regression test passed: Standard class produces 100% identical outputs byte for byte, and ALP demand & regional opportunities work accurately!');
}

runRegressionTest();
