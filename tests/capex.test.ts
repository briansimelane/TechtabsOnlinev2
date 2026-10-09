import assert from 'assert';
import { capacityExpansionCost, getCapexPerUnit } from '../utils/capex';
import { processTurn } from '../utils/SimulationEngine';
import { INITIAL_DECISIONS, INITIAL_STATE, YEAR_0_RECORD } from '../constants';
import { Team, TurnDecisions } from '../types';

console.log('--- Running CAPEX Unit Tests ---');

// 1. Basic capacity expansion cost calculations
assert.strictEqual(capacityExpansionCost(0), 0, 'capacityExpansionCost(0) must be 0');
assert.strictEqual(capacityExpansionCost(10000), 7500000, 'capacityExpansionCost(10000) must be 7,500,000 (R750/unit)');
assert.strictEqual(capacityExpansionCost(20000), 15000000, 'capacityExpansionCost(20000) must be 15,000,000 (R750/unit)');
assert.strictEqual(capacityExpansionCost(-5000), 0, 'Negative capacityChange must cost 0 (selling capacity refund not supported)');
assert.strictEqual(capacityExpansionCost(-10000), 0, 'Negative capacityChange must cost 0');

console.log('✅ Basic capacityExpansionCost checks passed (0, 10000, 20000, negative -> 0)');

// 2. getCapexPerUnit default value
assert.strictEqual(getCapexPerUnit(), 750, 'Default CAPEX per unit must be 750');

// 3. Custom config overrides
const customConfig = {
  costs: {
    capacity: {
      capex_per_unit: 1200
    }
  }
};
assert.strictEqual(getCapexPerUnit(customConfig), 1200, 'Custom config CAPEX per unit must be respected');
assert.strictEqual(capacityExpansionCost(10000, customConfig), 12000000, 'Custom config rate must apply to capacityExpansionCost');

console.log('✅ Custom config override checks passed');

// 4. Simulation Engine integration test with capacityChange = 10,000
const testTeam: Team = {
  ...INITIAL_STATE.currentTeam,
  id: 'team_capex_test',
  name: 'Capex Test Team',
  universeId: 'class_capex_test',
  currentPeriod: 1,
  factoryCapacity: 40000,
  history: {
    0: YEAR_0_RECORD
  }
};

const decisionsWith10kCapacity: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
decisionsWith10kCapacity.operations.capacityChange = 10000;

const result10k = processTurn(testTeam, decisionsWith10kCapacity, []);

// Check investing cash flow matches R7.5m outflow
assert.strictEqual(
  result10k.periodRecord.cashFlow.investing,
  -7500000,
  `Investing cash flow for 10,000 units capacity expansion must be -7,500,000, got ${result10k.periodRecord.cashFlow.investing}`
);

// Check new factory capacity increased by 10,000
assert.strictEqual(
  result10k.newTeamState.factoryCapacity,
  50000,
  `Factory capacity should increase by 10,000 to 50,000, got ${result10k.newTeamState.factoryCapacity}`
);

// Check fixed assets change on balance sheet: endPPE = startPPE + capeX - depreciation
const startPPE = YEAR_0_RECORD.balanceSheet.fixedAssets; // 299459535
const depreciation = 1535965;
const expectedPPE = startPPE + 7500000 - depreciation;
assert.strictEqual(
  result10k.periodRecord.balanceSheet.fixedAssets,
  expectedPPE,
  `Fixed assets must equal startPPE + 7,500,000 - depreciation (${expectedPPE}), got ${result10k.periodRecord.balanceSheet.fixedAssets}`
);

// 5. Compare against capacityChange = 0
const decisionsWith0Capacity: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
decisionsWith0Capacity.operations.capacityChange = 0;

const result0 = processTurn(testTeam, decisionsWith0Capacity, []);
assert.strictEqual(result0.periodRecord.cashFlow.investing, 0, 'Investing cash flow for 0 capacity change must be 0');
assert.strictEqual(
  result10k.periodRecord.balanceSheet.fixedAssets - result0.periodRecord.balanceSheet.fixedAssets,
  7500000,
  'Fixed assets difference between 10k capacity change and 0 must be exactly 7,500,000'
);

console.log('✅ Simulation engine integration test passed: investing cash flow is -R7.5m, PP&E increased by R7.5m');
console.log('🎉 All CAPEX tests passed successfully!');
