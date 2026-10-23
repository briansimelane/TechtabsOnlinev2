import fs from 'fs';
import path from 'path';
import { PRODUCTS, INITIAL_DECISIONS } from '../constants';
import { Team, ProductId } from '../types';
import { computeMarketShareBackModel } from '../utils/marketShareBackModel';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance } from '../utils/industryPerformance';

/**
 * Audit script for opening stock discrepancy in closed periods.
 *
 * Usage:
 *   npx tsx tests/audit_opening_stock.ts [path-to-exported-class.json]
 *
 * Accepts a Firestore class export JSON (either `{ teams: [...] }`, an array of classes,
 * or a map of classes containing `class_1790761487502` or other classes).
 * If no file path is provided, runs against a mock of `class_1790761487502` (Team 4 repro).
 */

function extractClasses(raw: any): Array<{ id: string; name?: string; currentPeriod?: number; teams: Team[] }> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length > 0 && raw[0] && Array.isArray(raw[0].teams)) {
      return raw;
    }
    if (raw.length > 0 && raw[0] && ('currentPeriod' in raw[0] || 'history' in raw[0])) {
      return [{ id: 'exported_class', teams: raw }];
    }
  }
  if (Array.isArray(raw.teams)) {
    return [{ id: raw.id || 'exported_class', name: raw.name, currentPeriod: raw.currentPeriod, teams: raw.teams }];
  }
  if (Array.isArray(raw.classes)) {
    return raw.classes;
  }
  if (typeof raw === 'object') {
    const classes: Array<{ id: string; name?: string; currentPeriod?: number; teams: Team[] }> = [];
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === 'object' && Array.isArray((v as any).teams)) {
        classes.push({ id: (v as any).id || k, name: (v as any).name, currentPeriod: (v as any).currentPeriod, teams: (v as any).teams });
      }
    }
    if (classes.length > 0) return classes;
  }
  return [];
}

/**
 * Simulates the UNPATCHED computeMarketShareBackModel by stripping stored closed-period
 * availability snapshots (`market.availableUnits` and `industry.units`) on a deep clone
 * so `computeMarketShareBackModel` falls through to the live `t.inventory` recompute.
 */
function computeUnpatchedBackModel(teams: Team[], period: number) {
  const strippedTeams: Team[] = JSON.parse(JSON.stringify(teams)).map((t: any) => {
    const rec = t.history?.[period] || t.history?.[String(period)];
    if (rec) {
      if (rec.market) {
        delete rec.market.availableUnits;
      }
      if (rec.industry) {
        delete rec.industry.units;
      }
    }
    return t;
  });
  return computeMarketShareBackModel(strippedTeams, period);
}

export function auditClass(cls: { id: string; name?: string; currentPeriod?: number; teams: Team[] }) {
  const activeTeams = (cls.teams || [])
    .filter(t => !t.isArchived)
    .sort((a, b) => a.id.localeCompare(b.id));

  console.log(`\n================================================================================`);
  console.log(`Class: ${cls.id}${cls.name ? ` (${cls.name})` : ''} | Active teams: ${activeTeams.length}`);
  console.log(`================================================================================`);

  if (activeTeams.length === 0) {
    console.log('No non-archived teams found.');
    return;
  }

  const maxPeriod = Math.max(
    cls.currentPeriod || 1,
    ...activeTeams.map(t => t.currentPeriod || 1)
  );

  const missingBothRecords: Array<{ teamId: string; teamName: string; period: number; product: ProductId }> = [];

  console.log(
    [
      'Team ID'.padEnd(20),
      'Period'.padEnd(8),
      'Product'.padEnd(10),
      'Stored Avail'.padStart(14),
      'Live (Unpatched)'.padStart(18),
      'Diff'.padStart(12),
      'Stored Actual'.padStart(15),
      'Patched Avail'.padStart(15),
      'Flag'
    ].join(' | ')
  );
  console.log('-'.repeat(135));

  for (let p = 1; p < maxPeriod; p++) {
    const unpatchedResults = computeUnpatchedBackModel(activeTeams, p);
    const patchedResults = computeMarketShareBackModel(activeTeams, p);

    activeTeams.forEach((team, tIdx) => {
      if (p >= (team.currentPeriod || 1)) return;

      const rec = (team.history as any)?.[p] || (team.history as any)?.[String(p)];

      PRODUCTS.forEach(prod => {
        const pId = prod.id;
        const storedMarketAvail = rec?.market?.availableUnits?.[pId];
        const storedIndAvail = rec?.industry?.units?.[pId]?.available;
        const hasMarketAvail = typeof storedMarketAvail === 'number' && Number.isFinite(storedMarketAvail);
        const hasIndAvail = typeof storedIndAvail === 'number' && Number.isFinite(storedIndAvail);

        if (!hasMarketAvail && !hasIndAvail) {
          missingBothRecords.push({
            teamId: team.id,
            teamName: team.name,
            period: p,
            product: pId
          });
        }

        const stored = hasMarketAvail ? storedMarketAvail : (hasIndAvail ? storedIndAvail : NaN);
        const unpatchedProdRes = unpatchedResults.find(r => r.productId === pId);
        const patchedProdRes = patchedResults.find(r => r.productId === pId);

        const live = Math.round(unpatchedProdRes?.availableByTeam[tIdx] ?? 0);
        const patched = Math.round(patchedProdRes?.availableByTeam[tIdx] ?? 0);
        const storedRounded = Number.isFinite(stored) ? Math.round(stored) : NaN;
        const diff = Number.isFinite(storedRounded) ? storedRounded - live : NaN;
        const actualUnits = rec?.market?.actualUnits?.[pId] ?? rec?.industry?.units?.[pId]?.actual ?? 'N/A';

        const isMismatch = !Number.isFinite(storedRounded) || storedRounded !== live;
        const flag = !Number.isFinite(storedRounded)
          ? '⚠️ MISSING STORED'
          : (isMismatch ? '❌ MISMATCH (stored != live)' : 'OK');

        console.log(
          [
            team.id.padEnd(20),
            `P${p}`.padEnd(8),
            pId.padEnd(10),
            String(Number.isFinite(storedRounded) ? storedRounded : 'MISSING').padStart(14),
            String(live).padStart(18),
            String(Number.isFinite(diff) ? (diff >= 0 ? `+${diff}` : `${diff}`) : 'N/A').padStart(12),
            String(typeof actualUnits === 'number' ? Math.round(actualUnits) : actualUnits).padStart(15),
            String(patched).padStart(15),
            flag
          ].join(' | ')
        );
      });
    });
  }

  console.log('\n--- Records missing BOTH market.availableUnits AND industry.units ---');
  if (missingBothRecords.length === 0) {
    console.log('None! All closed-period records have stored availability.');
  } else {
    missingBothRecords.forEach(item => {
      console.log(`- Team ${item.teamId} (${item.teamName}), Period ${item.period}, Product ${item.product}`);
    });
  }
}

function buildMockClass1790761487502() {
  const mk = (id: string, price: number, fc: number, prod: number) => ({
    id,
    name: id,
    ceoName: id,
    universeId: 'class_1790761487502',
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

  const initialTeams = [
    mk('team-1', 3000, 12, 8000),
    mk('team-2', 3200, 12, 8000),
    mk('team-3', 2900, 12, 8000),
    mk('team-4', 1990, 4.5, 0)
  ];

  const perfList = computeIndustryPerformance(initialTeams, 1);
  const perfMap = new Map(perfList.map(p => [p.teamId, p]));

  const closedTeams = initialTeams.map(t => {
    const res = processTurn(t, t.draftDecisions, []);
    return {
      ...res.newTeamState,
      currentPeriod: 2,
      history: {
        1: {
          ...res.periodRecord,
          decisions: t.draftDecisions,
          industry: perfMap.get(t.id)
        }
      }
    } as Team;
  });

  return {
    id: 'class_1790761487502',
    name: 'Mock Class 1790761487502 (Repro)',
    currentPeriod: 2,
    teams: closedTeams
  };
}

const argPath = process.argv[2];
if (argPath) {
  const resolved = path.resolve(process.cwd(), argPath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  const classes = extractClasses(raw);
  if (classes.length === 0) {
    console.error('Could not find any class/teams structure in the provided JSON file.');
    process.exit(1);
  }
  classes.sort((a, b) => (a.id === 'class_1790761487502' ? -1 : b.id === 'class_1790761487502' ? 1 : 0));
  classes.forEach(cls => auditClass(cls));
} else {
  console.log('No input file specified; running built-in audit on mock class_1790761487502 (pass <exported_class.json> to audit a file):');
  auditClass(buildMockClass1790761487502());
}
