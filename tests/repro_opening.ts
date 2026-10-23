import assert from 'assert';
import { INITIAL_DECISIONS } from '../constants';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance } from '../utils/industryPerformance';
import { computeMarketShareBackModel } from '../utils/marketShareBackModel';

const mk = (id: string, price: number, fc: number, prod: number) => ({
  id,
  name: id,
  ceoName: id,
  universeId: 'default',
  currentPeriod: 1,
  factoryCapacity: 14000,
  storeCount: 5,
  cashBalance: 106316215,
  inventory: { techbook: 8533, zroid: 9200, itab: 0 },
  staffCounts: { engineers: 0, technicians: 150, semiSkilled: 200, adminSales: 20, customerService: 15 },
  longTermDebt: 50000000,
  shareholdersEquity: 286564937,
  status: 'Submitted',
  history: {},
  draftDecisions: {
    ...INITIAL_DECISIONS,
    marketing: {
      ...INITIAL_DECISIONS.marketing,
      prices: { techbook: price, zroid: 4800, itab: 6500 },
      forecastedMarketShare: { techbook: fc, zroid: 12, itab: 5 }
    },
    operations: {
      ...INITIAL_DECISIONS.operations,
      production: { techbook: prod, zroid: 3000, itab: 2000 },
      reqFinishedGoods: { techbook: 0, zroid: 0, itab: 0 }
    },
    procurement: {
      ...INITIAL_DECISIONS.procurement,
      supplierAllocation: Object.fromEntries(
        ['techbook', 'zroid', 'itab'].map(p => [
          p,
          Object.fromEntries(
            Object.entries((INITIAL_DECISIONS.procurement as any).supplierAllocation[p] || {}).map(([k, v]: any) => [
              k,
              { ...v, finishedGoods: 0 }
            ])
          )
        ])
      )
    }
  }
} as any);

const teams = [
  mk('team-1', 3000, 12, 8000),
  mk('team-2', 3200, 12, 8000),
  mk('team-3', 2900, 12, 8000),
  mk('team-4', 1990, 4.5, 0)
];

const show = (label: string, ts: any[], p: number) => {
  const r = computeMarketShareBackModel(ts, p).find(x => x.productId === 'techbook')!;
  console.log(label);
  ts.forEach((t, i) =>
    console.log(
      ' ',
      t.id,
      'demandEarned',
      Math.round(r.demandUnitsByTeam[i]),
      'available',
      Math.round(r.availableByTeam[i]),
      'unitsSold',
      Math.round(r.unitsSoldByTeam[i])
    )
  );
  return r;
};

// 1. Current period before run (live recompute)
const beforeResult = show('BEFORE run (what runClassSimulation sees):', teams, 1);
assert.strictEqual(Math.round(beforeResult.availableByTeam[3]), 8533, 'Before run: Team 4 available should be 8533');
assert.strictEqual(Math.round(beforeResult.unitsSoldByTeam[3]), 8533, 'Before run: Team 4 units sold should be 8533');

// Snapshot industry performance at run time (before processTurn, matching runClassSimulation)
const runTimeIndList = computeIndustryPerformance(teams, 1);
const runTimeIndMap = new Map(runTimeIndList.map(p => [p.teamId, p]));

const after = teams.map(t => {
  const res = processTurn(t, t.draftDecisions, []);
  console.log(
    t.id,
    'engine techbook: demand',
    res.periodRecord.market.demandUnits.techbook,
    'available',
    res.periodRecord.market.availableUnits.techbook,
    'sold',
    res.periodRecord.market.actualUnits.techbook,
    'rev',
    Math.round(res.periodRecord.revenue.byProduct.techbook),
    'closingInv',
    res.newTeamState.inventory.techbook
  );
  return {
    ...res.newTeamState,
    currentPeriod: 2,
    history: {
      1: {
        ...res.periodRecord,
        decisions: t.draftDecisions,
        industry: runTimeIndMap.get(t.id)
      }
    }
  } as any;
});

// 2. Acceptance test 1: After processTurn and period advance, closed period 1 gives available = 8533, sold = 8533
const afterResult = show('AFTER run, report for period 1 (what students/facilitator open later):', after, 1);
assert.strictEqual(Math.round(afterResult.availableByTeam[3]), 8533, 'After run: Team 4 available in P1 report must be 8533');
assert.strictEqual(Math.round(afterResult.unitsSoldByTeam[3]), 8533, 'After run: Team 4 unitsSold in P1 report must be 8533');

// 3. Acceptance test 3: Fallback to industry.units[p].available when market.availableUnits is missing
const afterWithoutMarketAvail = after.map(t => {
  const copy = JSON.parse(JSON.stringify(t));
  delete copy.history[1].market.availableUnits;
  return copy;
});
const fallbackResult = computeMarketShareBackModel(afterWithoutMarketAvail, 1).find(x => x.productId === 'techbook')!;
assert.strictEqual(
  Math.round(fallbackResult.availableByTeam[3]),
  8533,
  'Fallback: Team 4 available must come from industry.units.techbook.available (8533) when market.availableUnits is absent'
);
assert.strictEqual(
  Math.round(fallbackResult.unitsSoldByTeam[3]),
  8533,
  'Fallback: Team 4 unitsSold must be 8533 when using industry.units fallback'
);

console.log('✅ All opening stock reproduction and acceptance assertions passed!');
