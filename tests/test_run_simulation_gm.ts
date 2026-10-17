import assert from 'assert';
import { EDITIONS, getEdition } from '../utils/editions';
import { processTurnGlobalMarkets } from '../utils/editions/globalMarkets/engine';
import { scoreYearGlobalMarkets, scoreCumulativeGlobalMarkets } from '../utils/editions/globalMarkets/scoring';
import { Team, TurnDecisions, SimulationClass } from '../types';
import { INITIAL_DECISIONS, YEAR_0_RECORD } from '../constants';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance } from '../utils/industryPerformance';
import { mergeGlobalMarketsDecisions } from '../utils/editions/globalMarkets/defaults';

console.log('--- Testing Run Simulation with Global Markets Edition ---');

const gmEdition = EDITIONS['global-markets'];
assert(gmEdition, 'Global Markets edition must exist');

// 1. Setup mock teams for a Global Markets class
const initialTeam1: Team = {
  id: 'team-1',
  name: 'Global Alpha',
  ceoName: 'CEO Alpha',
  universeId: 'default',
  currentPeriod: 1,
  factoryCapacity: 50000,
  storeCount: 15,
  cashBalance: 106316215,
  inventory: { techbook: 1000, zroid: 1000, itab: 1000 },
  staffCounts: { engineers: 50, technicians: 150, semiSkilled: 200, adminSales: 20, customerService: 15 },
  longTermDebt: 50000000,
  shareholdersEquity: 250000000,
  status: 'Submitted',
  draftDecisions: {
    ...INITIAL_DECISIONS,
    markets: {
      za: {
        active: true,
        channel: 'OWN',
        prices: { techbook: 3000, zroid: 4800, itab: 6500 },
        debtorDays: { techbook: 45, zroid: 45, itab: 45 }
      },
      ng: {
        active: true,
        channel: 'DISTRIBUTOR',
        prices: { techbook: 220000, zroid: 350000, itab: 480000 },
        debtorDays: { techbook: 75, zroid: 75, itab: 75 }
      },
      ke: {
        active: true,
        channel: 'OWN',
        prices: { techbook: 20000, zroid: 32000, itab: 43000 },
        debtorDays: { techbook: 40, zroid: 40, itab: 40 }
      }
    },
    treasury: {
      hedges: {
        USD_COSTS: { coverPct: 75, tenorMonths: 12 },
        NGN_REVENUE: { coverPct: 50, tenorMonths: 12 },
        KES_REVENUE: { coverPct: 25, tenorMonths: 6 },
        USD_DEBT: { coverPct: 0, tenorMonths: 12 }
      },
      fundingCurrency: 'USD',
      rateBasis: 'FIXED',
      fixedPct: 100,
      plannedNetProfit: 25000000
    }
  } as TurnDecisions,
  history: {
    0: YEAR_0_RECORD
  }
};

const initialTeam2: Team = {
  id: 'team-2',
  name: 'Domestic Beta',
  ceoName: 'CEO Beta',
  universeId: 'default',
  currentPeriod: 1,
  factoryCapacity: 50000,
  storeCount: 15,
  cashBalance: 106316215,
  inventory: { techbook: 1000, zroid: 1000, itab: 1000 },
  staffCounts: { engineers: 50, technicians: 150, semiSkilled: 200, adminSales: 20, customerService: 15 },
  longTermDebt: 50000000,
  shareholdersEquity: 250000000,
  status: 'Submitted',
  draftDecisions: {
    ...INITIAL_DECISIONS,
    markets: {
      za: {
        active: true,
        channel: 'OWN',
        prices: { techbook: 3000, zroid: 4800, itab: 6500 },
        debtorDays: { techbook: 45, zroid: 45, itab: 45 }
      },
      ng: {
        active: false,
        channel: 'DISTRIBUTOR',
        prices: { techbook: 220000, zroid: 350000, itab: 480000 },
        debtorDays: { techbook: 75, zroid: 75, itab: 75 }
      },
      ke: {
        active: false,
        channel: 'DISTRIBUTOR',
        prices: { techbook: 20000, zroid: 32000, itab: 43000 },
        debtorDays: { techbook: 40, zroid: 40, itab: 40 }
      }
    },
    treasury: {
      hedges: {
        USD_COSTS: { coverPct: 0, tenorMonths: 12 },
        NGN_REVENUE: { coverPct: 0, tenorMonths: 12 },
        KES_REVENUE: { coverPct: 0, tenorMonths: 6 },
        USD_DEBT: { coverPct: 0, tenorMonths: 12 }
      },
      fundingCurrency: 'ZAR',
      rateBasis: 'FLOATING',
      fixedPct: 0,
      plannedNetProfit: 15000000
    }
  } as TurnDecisions,
  history: {
    0: YEAR_0_RECORD
  }
};

const mockClass: SimulationClass = {
  id: 'class-gm-1',
  name: 'Global Markets Test Class',
  facilitatorCode: 'FAC123',
  teamCodes: {},
  currentPeriod: 1,
  editionId: 'global-markets',
  createdAt: new Date().toISOString(),
  teams: [initialTeam1, initialTeam2]
};

// 2. Simulate runClassSimulation execution logic for Period 1 -> Period 2
const edition = getEdition(mockClass);
assert(edition && edition.id === 'global-markets', 'Edition should resolve to global-markets');

const industryPerfList = computeIndustryPerformance(mockClass.teams, mockClass.currentPeriod);
const perfMap = new Map(industryPerfList.map(p => [p.teamId, p]));

const updatedTeams = mockClass.teams.map(team => {
  const decs = team.draftDecisions || INITIAL_DECISIONS;
  const result = processTurn(team, decs, [], edition);
  const rawTeamPerf = perfMap.get(team.id);
  const totRev = result.periodRecord.revenue?.total ?? rawTeamPerf?.totalRevenue ?? 0;
  const totCogs = result.periodRecord.cogs?.total ?? rawTeamPerf?.totalCogs ?? 0;
  const gp = result.periodRecord.grossProfit?.total ?? (totRev - totCogs);
  const np = result.periodRecord.netProfit ?? rawTeamPerf?.netProfit ?? 0;
  const eq = result.periodRecord.balanceSheet?.equity ?? rawTeamPerf?.equity ?? 0;

  const teamPerf = rawTeamPerf ? {
    ...rawTeamPerf,
    revenueByProduct: result.periodRecord.revenue?.byProduct ?? rawTeamPerf.revenueByProduct,
    totalRevenue: totRev,
    cogsByProduct: result.periodRecord.cogs?.byProduct ?? rawTeamPerf.cogsByProduct,
    totalCogs: totCogs,
    grossProfit: gp,
    gpMargin: totRev > 0 ? (gp / totRev) * 100 : 0,
    netProfit: np,
    npMargin: totRev > 0 ? (np / totRev) * 100 : 0,
    equity: eq,
    roe: eq > 0 ? (np / eq) * 100 : 0
  } : undefined;

  const periodRecordWithIndustry = {
    ...result.periodRecord,
    decisions: decs,
    draftDecisions: decs,
    industry: teamPerf,
    fullIndustryReport: industryPerfList
  };

  const carriedNegotiation = (decs.negotiation && decs.negotiation.status === 'AGREED')
    ? {
        ...decs.negotiation,
        contractPeriods: decs.negotiation.contractPeriods && decs.negotiation.contractPeriods > 1
          ? decs.negotiation.contractPeriods - 1
          : decs.negotiation.contractPeriods
      }
    : {
        ...INITIAL_DECISIONS.negotiation
      };

  const carriedDecisions: TurnDecisions = {
    ...decs,
    operations: {
      ...decs.operations,
      capacityChange: 0,
      reqFinishedGoods: { techbook: 0, zroid: 0, itab: 0 }
    },
    hr: {
      ...decs.hr,
      hiring: { engineers: 0, technicians: 0, semiSkilled: 0, adminSales: 0, customerService: 0 }
    },
    finance: {
      ...decs.finance,
      debtChange: 0,
      equityChange: 0
    },
    negotiation: carriedNegotiation
  };

  const newTeam: Team = {
    ...result.newTeamState,
    currentPeriod: team.currentPeriod + 1,
    status: 'Saved',
    draftDecisions: carriedDecisions,
    history: {
      ...(team.history || {}),
      [team.currentPeriod]: periodRecordWithIndustry
    }
  };

  return newTeam;
});

// 3. Verification Assertions
console.log('Verifying Period 1 execution outcomes...');
const team1Updated = updatedTeams[0];
const team2Updated = updatedTeams[1];

assert.strictEqual(team1Updated.currentPeriod, 2, 'Team 1 currentPeriod must advance to 2');
assert.strictEqual(team2Updated.currentPeriod, 2, 'Team 2 currentPeriod must advance to 2');

const rec1 = team1Updated.history[1];
const rec2 = team2Updated.history[1];
assert(rec1, 'Team 1 Period 1 record must exist');
assert(rec2, 'Team 2 Period 1 record must exist');
assert(rec1.gm, 'Team 1 record must include gm data');
assert(rec2.gm, 'Team 2 record must include gm data');

console.log('Team 1 Total Revenue:', rec1.revenue.total);
console.log('Team 2 Total Revenue:', rec2.revenue.total);
assert(rec1.revenue.total > rec2.revenue.total, 'Team 1 (expanded to NG and KE) should have higher revenue than Team 2 (domestic only)');

console.log('Team 1 Exposures:', Object.keys(rec1.gm.exposures || {}));
console.log('Team 2 Exposures:', Object.keys(rec2.gm.exposures || {}));
assert(rec1.gm.exposures, 'Team 1 exposures data must exist');
assert(rec2.gm.exposures, 'Team 2 exposures data must exist');

// Check covenants
console.log('Team 1 Covenants:', rec1.gm.covenants);
assert(typeof rec1.gm.covenants.netDebtToEbitda === 'number', 'Leverage ratio must be calculated');
assert(typeof rec1.gm.covenants.interestCover === 'number', 'Interest cover must be calculated');

// Check carried decisions into Period 2
const gmDecCarried = mergeGlobalMarketsDecisions(team1Updated.draftDecisions as TurnDecisions);
assert(gmDecCarried.markets?.ng?.active === true, 'Nigeria active state must carry forward');
assert(gmDecCarried.markets?.ke?.active === true, 'Kenya active state must carry forward');
assert(gmDecCarried.treasury?.hedges?.USD_COSTS?.coverPct === 75, 'USD hedge cover must carry forward');
assert(gmDecCarried.treasury?.fundingCurrency === 'USD', 'USD debt currency must carry forward');

// 4. Test Scoring
console.log('\nTesting Global Markets Scoring...');
const teamsForScoring = [
  { id: team1Updated.id, name: team1Updated.name, record: rec1 },
  { id: team2Updated.id, name: team2Updated.name, record: rec2 }
];

const period1Scores = scoreYearGlobalMarkets(teamsForScoring, 1);
console.log('Period 1 Scores:', period1Scores.map(s => ({ team: s.teamName, score: s.score, ep: s.economicProfit, np: s.npMargin, dq: s.isDisqualified })));
assert.strictEqual(period1Scores.length, 2, 'Should score 2 teams');
assert(period1Scores[0].maxScore > 0, 'Max score should be positive');

const cumulativeScores = scoreCumulativeGlobalMarkets(updatedTeams, 1);
console.log('Cumulative Scores:', cumulativeScores);
assert.strictEqual(cumulativeScores.length, 2, 'Should have cumulative scores for 2 teams');

// 5. Test Pro-Forma Forecast for Period 2 on Dashboard
console.log('\nTesting Period 2 Pro-Forma Forecast on Dashboard...');
const forecastP2Result = processTurnGlobalMarkets(team1Updated, team1Updated.draftDecisions || INITIAL_DECISIONS, [], edition);
assert(forecastP2Result.periodRecord, 'Period 2 forecast record must exist');
assert(forecastP2Result.periodRecord.gm?.scorecard, 'Period 2 forecast must produce GM scorecard');
console.log('P2 Forecast Revenue:', forecastP2Result.periodRecord.revenue.total);
console.log('P2 Forecast Net Profit:', forecastP2Result.periodRecord.netProfit);
console.log('P2 Forecast Scorecard EP:', forecastP2Result.periodRecord.gm.scorecard.economicProfit);
console.log('P2 Forecast Cash Conversion:', forecastP2Result.periodRecord.gm.scorecard.cashConversion);
console.log('P2 Forecast Plan Delivery:', forecastP2Result.periodRecord.gm.scorecard.planVariance);

console.log('\n✅ ALL SIMULATION AND TREASURY INTEGRATION TESTS PASSED SUCCESSFULLY!');
