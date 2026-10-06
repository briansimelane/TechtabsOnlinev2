import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance } from '../utils/industryPerformance';
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

  console.log('✅ Regression test passed: Standard class produces 100% identical outputs byte for byte!');
}

runRegressionTest();
