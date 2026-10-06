import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { INITIAL_DECISIONS, INITIAL_STATE, YEAR_0_RECORD } from '../constants';
import { Team, TurnDecisions, PeriodRecord } from '../types';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance, TeamIndustryPerformance } from '../utils/industryPerformance';

// Create 4 distinct teams
function createTestTeams(): Team[] {
  const teams: Team[] = [];
  for (let i = 1; i <= 4; i++) {
    const teamId = `team_${i}_test`;
    teams.push({
      ...INITIAL_STATE.currentTeam,
      id: teamId,
      name: `Team ${i}`,
      universeId: 'class_test_reg',
      currentPeriod: 1,
      status: 'InProgress',
      history: {
        0: YEAR_0_RECORD
      }
    });
  }
  return teams;
}

// Generate varied decisions for each team and period
function getDecisionsForPeriod(teamIndex: number, period: number): TurnDecisions {
  const dec: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
  if (teamIndex === 1) {
    // Team 1: Higher prices, higher advertising
    dec.marketing.prices.techbook = 3200 + period * 50;
    dec.marketing.prices.zroid = 5000 + period * 100;
    dec.marketing.prices.itab = 6800 + period * 100;
    dec.marketing.advertisingBudget = 28000000 + period * 1000000;
    dec.operations.production.techbook = 16000;
    dec.operations.production.zroid = 16000;
    dec.operations.production.itab = 11000;
  } else if (teamIndex === 2) {
    // Team 2: Discount pricing, lower budget, hire technicians
    dec.marketing.prices.techbook = 2850;
    dec.marketing.prices.zroid = 4600;
    dec.marketing.prices.itab = 6300;
    dec.marketing.advertisingBudget = 22000000;
    dec.hr.hiring.technicians = 5;
    dec.hr.salaries.technicians = 22000;
  } else if (teamIndex === 3) {
    // Team 3: Debt change, R&D boost
    dec.finance.debtChange = 10000000;
    dec.operations.rdBudget = 18000000;
    dec.marketing.openCloseStores = 2;
  } else {
    // Team 4: Standard default decisions
  }
  return dec;
}

interface FixtureData {
  initialTeams: Team[];
  periodDecisions: Record<number, Record<string, TurnDecisions>>;
  expectedPeriodRecords: Record<number, Record<string, PeriodRecord>>;
  expectedIndustryPerf: Record<number, TeamIndustryPerformance[]>;
}

function runSimulation() {
  const teams = createTestTeams();
  const fixture: FixtureData = {
    initialTeams: JSON.parse(JSON.stringify(teams)),
    periodDecisions: {},
    expectedPeriodRecords: {},
    expectedIndustryPerf: {}
  };

  let currentTeams = teams;

  for (let p = 1; p <= 3; p++) {
    fixture.periodDecisions[p] = {};
    fixture.expectedPeriodRecords[p] = {};

    // 1. Assign draft decisions
    currentTeams.forEach((t, idx) => {
      const dec = getDecisionsForPeriod(idx + 1, p);
      t.draftDecisions = dec;
      fixture.periodDecisions[p][t.id] = dec;
    });

    // 2. Compute industry performance
    const industryPerf = computeIndustryPerformance(currentTeams, p);
    fixture.expectedIndustryPerf[p] = JSON.parse(JSON.stringify(industryPerf));

    // 3. Process turn for each team
    const nextTeams: Team[] = [];
    currentTeams.forEach((team) => {
      const decs = team.draftDecisions || INITIAL_DECISIONS;
      const result = processTurn(team, decs, []);
      fixture.expectedPeriodRecords[p][team.id] = JSON.parse(JSON.stringify(result.periodRecord));

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

  const outDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const filePath = path.join(outDir, 'standard_class_fixture.json');
  fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf-8');
  console.log(`Saved baseline fixture to ${filePath}`);
}

runSimulation();
