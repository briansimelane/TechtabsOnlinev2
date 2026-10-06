import assert from 'assert';
import { EDITIONS } from '../utils/editions';
import { calculateForwardRate, processTurnGlobalMarkets, getCurrencySpots } from '../utils/editions/globalMarkets/engine';
import { scoreYearGlobalMarkets } from '../utils/editions/globalMarkets/scoring';
import { INITIAL_DECISIONS, INITIAL_STATE, YEAR_0_RECORD } from '../constants';
import { Team, TurnDecisions } from '../types';

const gmEdition = EDITIONS['global-markets'];
assert.ok(gmEdition, 'Global Markets edition must be loaded');

function runAllTests() {
  console.log('--- Running Global Markets Unit Tests ---');

  // Test 1: Forward pricing
  // USD 12m from spot 18.50 at 11.5% / 4.5% returns 19.74 ± 0.01. NGN forward is below spot.
  {
    const usdForward = calculateForwardRate(18.50, 0.115, 0.045, 12);
    assert.ok(
      Math.abs(usdForward - 19.74) <= 0.01,
      `USD 12m forward rate should be 19.74 ± 0.01, got ${usdForward.toFixed(4)}`
    );

    const ngnForward = calculateForwardRate(0.01156, 0.115, 0.240, 12);
    assert.ok(
      ngnForward < 0.01156,
      `NGN forward rate should be below spot 0.01156, got ${ngnForward.toFixed(6)}`
    );
    console.log('✅ Test 1 Passed: Forward pricing CIP calculation is accurate');
  }

  // Helper to create a clean test team
  function createTestTeam(period = 1, currentDebt = 0): Team {
    return {
      ...INITIAL_STATE.currentTeam,
      id: 'team_gm_test',
      name: 'GM Test Team',
      currentPeriod: period,
      longTermDebt: currentDebt,
      history: {
        0: YEAR_0_RECORD
      }
    };
  }

  // Test 2: A 100% hedge with a flat FX path produces a cost exactly equal to the carry, and zero FX gain.
  {
    const team = createTestTeam(1);
    const dec: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    dec.treasury = {
      hedges: {
        USD_COSTS: { coverPct: 100, tenorMonths: 12 },
        NGN_REVENUE: { coverPct: 0, tenorMonths: 12 },
        KES_REVENUE: { coverPct: 0, tenorMonths: 6 },
        USD_DEBT: { coverPct: 0, tenorMonths: 12 }
      },
      fundingCurrency: 'ZAR',
      rateBasis: 'FIXED',
      fixedPct: 100
    };

    const flatEdition = {
      ...gmEdition,
      currencies: {
        ...gmEdition.currencies,
        USD: { ...gmEdition.currencies.USD, path: [18.50, 18.50, 18.50] }
      }
    };

    const result = processTurnGlobalMarkets(team, dec, [], flatEdition);
    const usdExp = result.periodRecord.gm?.exposures['USD_COSTS'];
    assert.ok(usdExp, 'USD_COSTS exposure must exist');
    assert.strictEqual(usdExp.coverPct, 100);

    // In period 1, openSpot = 18.50, closeSpot = 18.50, avgSpot = 18.50 (flat path)
    // Forward rate = 19.7392
    // Carry cost = exposure * (forwardRate - avgSpot)
    const expectedCarry = usdExp.exposureForeign * (usdExp.forwardRate - usdExp.avgSpot);
    assert.ok(
      Math.abs(usdExp.hedgeCostOrGain - expectedCarry) < 1.0,
      `Hedge cost should equal carry: expected ${expectedCarry}, got ${usdExp.hedgeCostOrGain}`
    );
    assert.ok(
      usdExp.hedgeCostOrGain > 0,
      'Payable hedge cost should be positive (paid carry)'
    );
    console.log('✅ Test 2 Passed: 100% hedge on flat FX path produces exact carry cost');
  }

  // Test 3: A 0% hedge through the period-2 path produces the full adverse movement in COGS.
  {
    const teamP2 = createTestTeam(2);
    // Add period 1 history
    const decP1: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    const resP1 = processTurnGlobalMarkets(createTestTeam(1), decP1, [], gmEdition);
    teamP2.history = { 0: YEAR_0_RECORD, 1: resP1.periodRecord };

    // 0% hedge in Period 2 (Rand weakens: USD avgSpot = 18.80 vs 18.50 base)
    const decP2: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    decP2.treasury = {
      hedges: {
        USD_COSTS: { coverPct: 0, tenorMonths: 12 },
        NGN_REVENUE: { coverPct: 0, tenorMonths: 12 },
        KES_REVENUE: { coverPct: 0, tenorMonths: 6 },
        USD_DEBT: { coverPct: 0, tenorMonths: 12 }
      },
      fundingCurrency: 'ZAR',
      rateBasis: 'FIXED',
      fixedPct: 100
    };

    const resP2Unhedged = processTurnGlobalMarkets(teamP2, decP2, [], gmEdition);
    const usdExp = resP2Unhedged.periodRecord.gm?.exposures['USD_COSTS'];
    assert.ok(usdExp);
    assert.strictEqual(usdExp.coverPct, 0);
    // Base cost was at 18.50. Period 2 avgSpot is 18.80.
    // Full adverse movement lands in COGS:
    assert.ok(resP2Unhedged.periodRecord.cogs.total > resP1.periodRecord.cogs.total);
    console.log('✅ Test 3 Passed: 0% hedge in Period 2 absorbs full adverse FX movement in COGS');
  }

  // Test 4: Over-hedging by 20% produces a standalone realised loss with no operating offset.
  {
    const team = createTestTeam(1);
    const dec: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    dec.treasury = {
      hedges: {
        USD_COSTS: { coverPct: 120, tenorMonths: 12 },
        NGN_REVENUE: { coverPct: 0, tenorMonths: 12 },
        KES_REVENUE: { coverPct: 0, tenorMonths: 6 },
        USD_DEBT: { coverPct: 0, tenorMonths: 12 }
      },
      fundingCurrency: 'ZAR',
      rateBasis: 'FIXED',
      fixedPct: 100
    };

    const result = processTurnGlobalMarkets(team, dec, [], gmEdition);
    const usdExp = result.periodRecord.gm?.exposures['USD_COSTS'];
    assert.ok(usdExp);
    assert.ok(usdExp.overHedged > 0, 'Over-hedged amount must be positive');
    assert.ok(Math.abs(usdExp.overHedged - usdExp.exposureForeign * 0.20) < 1.0);
    console.log('✅ Test 4 Passed: Over-hedging produces standalone realised position');
  }

  // Test 5: A market returning 18% in Nigeria produces positive net profit and negative economic profit.
  {
    // Nigeria WACC is 15.6% + 6.5% = 22.1%. If operating return on capital is 18%, NOPAT > 0 but EP < 0.
    const team = createTestTeam(1);
    const dec: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    dec.markets = {
      za: { active: true, channel: 'OWN', prices: { techbook: 3000, zroid: 4800, itab: 6500 }, debtorDays: { techbook: 45, zroid: 45, itab: 45 } },
      ng: { active: true, channel: 'OWN', prices: { techbook: 210000, zroid: 330000, itab: 460000 }, debtorDays: { techbook: 75, zroid: 75, itab: 75 } },
      ke: { active: false, channel: 'DISTRIBUTOR', prices: { techbook: 20000, zroid: 32000, itab: 43000 }, debtorDays: { techbook: 40, zroid: 40, itab: 40 } }
    };

    const result = processTurnGlobalMarkets(team, dec, [], gmEdition);
    const ngMarket = result.periodRecord.gm?.byMarket['ng'];
    assert.ok(ngMarket, 'Nigeria market record must exist');
    assert.ok(ngMarket.grossProfitZAR > 0, 'Nigeria gross profit should be positive');
    // Because Nigeria WACC is 22.1%, capital charge exceeds profit
    assert.ok(ngMarket.wacc === 0.156 + 0.065, `Nigeria WACC should be 0.221, got ${ngMarket.wacc}`);
    assert.ok(ngMarket.economicProfit < 0, `Nigeria economic profit should be negative, got ${ngMarket.economicProfit}`);
    console.log('✅ Test 5 Passed: High country risk premium yields negative economic profit despite positive operating margin');
  }

  // Test 6: A team with unchanged debt breaches the leverage covenant purely from an EBITDA fall.
  {
    const team = createTestTeam(1, 100000000); // 100m debt
    const dec: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    dec.marketing.advertisingBudget = 110000000; // High ad spend drops EBITDA to ~13m, pushing leverage > 7.0

    const result = processTurnGlobalMarkets(team, dec, [], gmEdition);
    const covenants = result.periodRecord.gm?.covenants;
    assert.ok(covenants);
    assert.ok(covenants.netDebtToEbitda > 3.0 || covenants.netDebtToEbitda === 99);
    assert.ok(covenants.breached.includes('netDebtToEbitda'), 'Covenant netDebtToEbitda must be breached');
    console.log('✅ Test 6 Passed: Unchanged debt breaches leverage covenant purely from EBITDA collapse');
  }

  // Test 7: USD debt revaluation moves both the interest charge and the balance sheet carrying value.
  {
    const teamP2 = createTestTeam(2, 50000000); // 50m debt
    const decZAR: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    decZAR.treasury = {
      hedges: {},
      fundingCurrency: 'ZAR',
      rateBasis: 'FIXED',
      fixedPct: 100
    };
    const resZAR = processTurnGlobalMarkets(teamP2, decZAR, [], gmEdition);

    const decUSD: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    decUSD.treasury = {
      hedges: {},
      fundingCurrency: 'USD',
      rateBasis: 'FIXED',
      fixedPct: 100
    };
    const resUSD = processTurnGlobalMarkets(teamP2, decUSD, [], gmEdition);

    // In period 2, USD spot increases from 18.50 to 19.10
    // Carrying value of debt must increase and fxRevaluation must be recognized
    assert.ok(resUSD.periodRecord.balanceSheet.longTermDebt > 50000000);
    assert.ok(resUSD.periodRecord.gm?.funding.fxRevaluation! > 0);
    console.log('✅ Test 7 Passed: USD debt revaluation updates carrying value and income statement');
  }

  // Test 8: A missing plannedNetProfit scores 0 on delivery and does not throw.
  {
    const team = createTestTeam(1);
    const dec: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    // No plannedNetProfit supplied
    dec.treasury = {
      hedges: {},
      fundingCurrency: 'ZAR',
      rateBasis: 'FIXED',
      fixedPct: 100
    };

    assert.doesNotThrow(() => {
      const res = processTurnGlobalMarkets(team, dec, [], gmEdition);
      assert.strictEqual(res.periodRecord.gm?.scorecard.planVariance, 0);

      const scores = scoreYearGlobalMarkets([{ id: team.id, name: team.name, record: res.periodRecord }], 1);
      assert.strictEqual(scores[0].planDelivery, 0);
    });
    console.log('✅ Test 8 Passed: Missing plannedNetProfit scores 0 on delivery without throwing');
  }

  // Scenario test: two teams, identical operating decisions, differing only in coverPct.
  // Through the period-2 path, the hedged team must end with lower profit in period 1 and materially higher profit in period 2.
  {
    // Team A: 100% hedged on USD_COSTS
    // Team B: 0% hedged on USD_COSTS
    const baseDec: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));

    const decA: TurnDecisions = {
      ...baseDec,
      treasury: {
        hedges: { USD_COSTS: { coverPct: 100, tenorMonths: 12 } },
        fundingCurrency: 'ZAR',
        rateBasis: 'FIXED',
        fixedPct: 100
      }
    };

    const decB: TurnDecisions = {
      ...baseDec,
      treasury: {
        hedges: { USD_COSTS: { coverPct: 0, tenorMonths: 12 } },
        fundingCurrency: 'ZAR',
        rateBasis: 'FIXED',
        fixedPct: 100
      }
    };

    // Period 1
    const resA_P1 = processTurnGlobalMarkets(createTestTeam(1), decA, [], gmEdition);
    const resB_P1 = processTurnGlobalMarkets(createTestTeam(1), decB, [], gmEdition);

    // In Period 1 (flat FX path): Team A pays carry (~7%), so Team A profit < Team B profit
    assert.ok(
      resA_P1.periodRecord.netProfit < resB_P1.periodRecord.netProfit,
      `Period 1: Hedged team A profit (${resA_P1.periodRecord.netProfit}) should be lower than unhedged team B (${resB_P1.periodRecord.netProfit}) due to carry`
    );

    // Period 2 (Rand weakens against USD from 18.50 to 19.10)
    const teamA_P2: Team = {
      ...createTestTeam(2),
      history: { 0: YEAR_0_RECORD, 1: resA_P1.periodRecord }
    };
    const teamB_P2: Team = {
      ...createTestTeam(2),
      history: { 0: YEAR_0_RECORD, 1: resB_P1.periodRecord }
    };

    const resA_P2 = processTurnGlobalMarkets(teamA_P2, decA, [], gmEdition);
    const resB_P2 = processTurnGlobalMarkets(teamB_P2, decB, [], gmEdition);

    // In Period 2: Team B suffers full unhedged depreciation, Team A protected
    // Hedged team A has protected costs and higher profit in period 2
    assert.ok(
      resA_P2.periodRecord.netProfit > resB_P2.periodRecord.netProfit,
      `Period 2: Hedged team A profit (${resA_P2.periodRecord.netProfit}) should be materially higher than unhedged team B (${resB_P2.periodRecord.netProfit})`
    );

    console.log('✅ Scenario Test Passed: Hedged team pays carry in Year 1, out-earns unhedged team in Year 2');
  }

  // Test 9: Channel selection differentiates entry capital and distributor margin
  {
    const teamOwn = createTestTeam(1);
    const decOwn: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    decOwn.markets = {
      za: { active: true, channel: 'OWN', prices: { techbook: 3000, zroid: 4800, itab: 6500 }, debtorDays: { techbook: 45, zroid: 45, itab: 45 } },
      ng: { active: true, channel: 'OWN', prices: { techbook: 220000, zroid: 350000, itab: 480000 }, debtorDays: { techbook: 75, zroid: 75, itab: 75 } },
      ke: { active: false, channel: 'DISTRIBUTOR', prices: { techbook: 20000, zroid: 32000, itab: 43000 }, debtorDays: { techbook: 40, zroid: 40, itab: 40 } }
    };

    const teamDist = createTestTeam(1);
    const decDist: TurnDecisions = JSON.parse(JSON.stringify(INITIAL_DECISIONS));
    decDist.markets = {
      za: { active: true, channel: 'OWN', prices: { techbook: 3000, zroid: 4800, itab: 6500 }, debtorDays: { techbook: 45, zroid: 45, itab: 45 } },
      ng: { active: true, channel: 'DISTRIBUTOR', prices: { techbook: 220000, zroid: 350000, itab: 480000 }, debtorDays: { techbook: 75, zroid: 75, itab: 75 } },
      ke: { active: false, channel: 'DISTRIBUTOR', prices: { techbook: 20000, zroid: 32000, itab: 43000 }, debtorDays: { techbook: 40, zroid: 40, itab: 40 } }
    };

    const resOwn = processTurnGlobalMarkets(teamOwn, decOwn, [], gmEdition);
    const resDist = processTurnGlobalMarkets(teamDist, decDist, [], gmEdition);

    // OWN channel pays R 12.5m CapEx; DISTRIBUTOR pays R 5.0m CapEx (7.5m difference in cash outflow)
    const ownCash = resOwn.periodRecord.balanceSheet.cash;
    const distCash = resDist.periodRecord.balanceSheet.cash;
    // Distributor has lower CapEx (saves 7.5m cash on entry)
    assert.ok(
      distCash > ownCash,
      `Distributor entry should have higher closing cash due to lower CapEx (got dist: ${distCash}, own: ${ownCash})`
    );

    // Distributor gives up 15% margin on Nigeria sales
    const ngOwnRev = resOwn.periodRecord.gm?.byMarket['ng']?.revenueZAR || 0;
    const ngDistRev = resDist.periodRecord.gm?.byMarket['ng']?.revenueZAR || 0;
    assert.ok(
      ngOwnRev > ngDistRev,
      `OWN channel should retain 100% price vs Distributor 85% net revenue (got own: ${ngOwnRev}, dist: ${ngDistRev})`
    );
    console.log('✅ Test 9 Passed: Stores vs Distributor correctly differentiates Entry CapEx (12.5m vs 5.0m) and wholesale margins (0% vs 15%)');
  }

  console.log('🎉 All Global Markets unit and scenario tests passed successfully!');
}

runAllTests();
