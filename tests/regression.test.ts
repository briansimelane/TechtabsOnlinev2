import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { processTurn, getProductBuyingWeights } from '../utils/SimulationEngine';
import {
  computeIndustryPerformance,
  getSupplierComponentCost,
  getSupplierFinishedGoodsCost,
  getSupplierPaymentTerms,
  getSupplierQuality,
  getSupplierInnovation,
  getSupplierLeadTime,
  getSupplierService,
  getSupplierCapacity,
} from '../utils/industryPerformance';
import { computeTeamPeriodBalanceSheet, getTeamRoleHeadcountForPeriod, getTeamOpeningStaffForPeriod, getTeamFeaturesForPeriod, getCriterionRating } from '../utils/marketShareBackModel';
import { compileDebriefSlides } from '../utils/debriefSlides';
import { resolveScenario, buildDynamicRegionalOpportunitiesYear2Section } from '../utils/scenarioResolver';
import { getMarketSize, setActiveClassIsALP, ZEN_TRANSFER_COSTS } from '../constants';
import { Team, TurnDecisions, PeriodRecord, ClassRoom } from '../types';

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

  const alpTeamsY2Baseline = alpTeamsY2.map(tm => ({
    ...tm,
    draftDecisions: {
      ...tm.draftDecisions!,
      marketing: {
        ...tm.draftDecisions!.marketing,
        alpOpportunities: { botswana: false, mozambique: false }
      }
    }
  }));

  const alpPerfY2Baseline = computeIndustryPerformance(alpTeamsY2Baseline, 2);
  const alpPerfY2 = computeIndustryPerformance(alpTeamsY2, 2);

  // Team 0 and Team 1 split Botswana demand equally (2 teams: 25,000 TechBook, 40,000 Zroid, 30,000 iTab)
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana?.entered, true);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana?.enteringTeamsCount, 2);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana?.allocatedUnits.techbook, 25000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana?.allocatedUnits.zroid, 40000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana?.allocatedUnits.itab, 30000);
  assert.strictEqual(alpPerfY2[0].alpOpportunities?.botswana?.operatingCost, 90000000);

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

  // Verify Balance Sheet reconciliation (cash & equity increase by otherIncome, and balance sheet balances)
  const bsTeam0Base = computeTeamPeriodBalanceSheet(alpTeamsY2Baseline[0], 2, alpTeamsY2Baseline);
  const bsTeam0ALP = computeTeamPeriodBalanceSheet(alpTeamsY2[0], 2, alpTeamsY2);
  assert.strictEqual(bsTeam0ALP.netProfit, bsTeam0Base.netProfit + (alpPerfY2[0].otherIncome || 0));
  assert.strictEqual(bsTeam0ALP.equity, bsTeam0Base.equity + (alpPerfY2[0].otherIncome || 0));
  assert.ok(Math.abs((bsTeam0ALP.cash - bsTeam0Base.cash) - (alpPerfY2[0].otherIncome || 0)) < 0.01, 'Cash must increase by exact otherIncome');
  assert.ok(Math.abs(bsTeam0ALP.totalAssets - bsTeam0ALP.totalLiabilitiesAndEquity) < 0.01, 'Balance sheet must balance');

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
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.botswana?.entered, true);
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.botswana?.enteredInPreviousYear, true);
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.botswana?.operatingCost, 50000000);
  assert.strictEqual(alpPerfY3[0].alpOpportunities?.mozambique, undefined, 'Mozambique must be closed in Year 3');

  // Team 2 was NOT in Botswana in Year 2 -> pays R95m operating agreement + 50% tax on profit
  assert.strictEqual(alpPerfY3[2].alpOpportunities?.botswana?.entered, true);
  assert.strictEqual(alpPerfY3[2].alpOpportunities?.botswana?.enteredInPreviousYear, false);
  assert.strictEqual(alpPerfY3[2].alpOpportunities?.botswana?.operatingCost, 95000000);
  const t2PreTax = (alpPerfY3[2].alpOpportunities?.botswana?.totalGrossProfit || 0) - 95000000;
  assert.strictEqual(
    alpPerfY3[2].alpOpportunities?.botswana?.tax,
    t2PreTax > 0 ? Math.round(t2PreTax * 0.50) : 0
  );

  // Verify Debrief Slide compilation:
  // 1) Non-ALP Year 2 dataset does NOT include 'regional-opportunities'
  const nonAlpSlides = compileDebriefSlides({
    className: 'Standard Class',
    period: 2,
    teams: [],
    loading: false,
    error: null,
    isActionLearningProject: false,
  });
  assert.strictEqual(
    nonAlpSlides.some(s => s.id === 'regional-opportunities'),
    false,
    'Non-ALP debrief slides must not include regional-opportunities slide'
  );

  // 2) ALP Year 2 & Year 3 datasets include 'regional-opportunities' right after 'gross-profit'
  const alpSlidesY2 = compileDebriefSlides({
    className: 'ALP Class',
    period: 2,
    teams: [],
    loading: false,
    error: null,
    isActionLearningProject: true,
  });
  const gpIdx = alpSlidesY2.findIndex(s => s.id === 'gross-profit');
  const regIdx = alpSlidesY2.findIndex(s => s.id === 'regional-opportunities');
  assert.ok(gpIdx >= 0, 'gross-profit slide must exist');
  assert.strictEqual(regIdx, gpIdx + 1, 'regional-opportunities slide must be placed immediately after gross-profit slide');

  // 3) Verify ALP Year 2 Engineer minimum salary (< R60,000) additional attrition (+2 engineers lost) into Year 3 Opening Staff
  const engTestTeams: Team[] = alpTeamsY2.map((tm, idx) => {
    const engSalary = idx < 2 ? 55000 : 62000; // Teams 0 & 1 pay < R60,000; Teams 2 & 3 pay >= R60,000
    const y2Dec: TurnDecisions = {
      ...periodDecisions[2][tm.id],
      hr: {
        ...periodDecisions[2][tm.id].hr,
        salaries: {
          ...periodDecisions[2][tm.id].hr.salaries,
          engineers: engSalary,
        }
      }
    };
    return {
      ...tm,
      currentPeriod: 2,
      draftDecisions: y2Dec,
      history: {
        ...(tm.history || {}),
        1: expectedPeriodRecords[1][tm.id],
        2: {
          ...(expectedPeriodRecords[2][tm.id] || {}),
          decisions: y2Dec,
          salaries: y2Dec.hr.salaries,
        }
      }
    };
  });

  // Check getTeamRoleHeadcountForPeriod & getTeamOpeningStaffForPeriod under ALP = true vs ALP = false
  const t0BreakALP = getTeamRoleHeadcountForPeriod(engTestTeams[0], 'engineers', 2, true);
  const t0BreakStd = getTeamRoleHeadcountForPeriod(engTestTeams[0], 'engineers', 2, false);
  assert.strictEqual(t0BreakALP.salaryPaid, 55000);
  assert.strictEqual(t0BreakALP.additionalAttrition, 2, 'ALP Team paying R55,000 (< R60,000) in Year 2 must lose 2 additional engineers');
  assert.strictEqual(t0BreakStd.additionalAttrition, 0, 'Standard class must not apply additional engineer attrition');
  assert.strictEqual(t0BreakALP.attrition, t0BreakALP.baseAttrition + 2);
  assert.strictEqual(t0BreakALP.nextOpening, t0BreakStd.nextOpening - 2, 'Year 3 Opening Staff for Engineers must be 2 lower when salary < R60,000');

  const t2BreakALP = getTeamRoleHeadcountForPeriod(engTestTeams[2], 'engineers', 2, true);
  assert.strictEqual(t2BreakALP.salaryPaid, 62000);
  assert.strictEqual(t2BreakALP.additionalAttrition, 0, 'ALP Team paying R62,000 (>= R60,000) in Year 2 must lose 0 additional engineers');
  assert.strictEqual(t2BreakALP.attrition, t2BreakALP.baseAttrition);

  // Check getTeamOpeningStaffForPeriod(team, 3) when active class is ALP
  const t0OpeningY3 = getTeamOpeningStaffForPeriod(engTestTeams[0], 3);
  assert.strictEqual(t0OpeningY3.engineers, t0BreakALP.nextOpening, 'getTeamOpeningStaffForPeriod(team, 3).engineers must match Year 2 nextOpening');

  // Check processTurn in Year 2 under ALP vs non-ALP
  setActiveClassIsALP(false);
  const turnStd = processTurn(engTestTeams[0], engTestTeams[0].draftDecisions!, []);
  setActiveClassIsALP(true);
  const turnALP = processTurn(engTestTeams[0], engTestTeams[0].draftDecisions!, []);
  assert.strictEqual(
    turnALP.periodRecord.staffAttrition?.engineers,
    (turnStd.periodRecord.staffAttrition?.engineers || 0) + 2,
    'processTurn in ALP Year 2 must record +2 engineer attrition when salary < R60,000'
  );
  assert.strictEqual(
    turnALP.newTeamState.staffCounts.engineers,
    turnStd.newTeamState.staffCounts.engineers - 2,
    'processTurn in ALP Year 2 must reduce Year 3 opening engineers by 2 when salary < R60,000'
  );

  // Verify Scenario 3 dynamic attrition table reflects the influential investor & R60,000 minimum salary evaluation
  const mockAlpClassY3: ClassRoom = {
    id: 'alp-test-class',
    name: 'ALP Test Cohort',
    code: 'ALP26',
    currentPeriod: 3,
    isActionLearningProject: true,
    teams: engTestTeams,
  };
  const resolvedScenario3 = resolveScenario(mockAlpClassY3, 3);
  assert.ok(
    resolvedScenario3.body.includes('influential shareholder') && resolvedScenario3.body.includes('R60,000'),
    'Scenario 3 body must include the influential shareholder R60,000 engineer minimum salary evaluation'
  );
  assert.ok(
    resolvedScenario3.body.includes('| Additional Engineers Lost (Salary < R60,000) | 2 | 2 | 0 | 0 |'),
    'Scenario 3 dynamic table must show 2 additional engineers lost for Teams 1 & 2 (< R60,000) and 0 for Teams 3 & 4 (>= R60,000)'
  );

  // 4) Verify Year 3 Zen Auction JV Split (60% Team 0, 40% Team 1) & B2B Sales Profit -> Other Income
  const zenTestTeamsY3: Team[] = alpTeamsY3.map((tm, idx) => {
    const baseDec = tm.draftDecisions!;
    const isJvOwner = idx === 0 || idx === 1;
    const isExternalBuyer = idx === 2 || idx === 3;
    return {
      ...tm,
      draftDecisions: {
        ...baseDec,
        procurement: {
          ...baseDec.procurement,
          supplierAllocation: {
            ...baseDec.procurement.supplierAllocation,
            techbook: {
              ...baseDec.procurement.supplierAllocation.techbook,
              Zen: {
                components: idx === 0 ? 8000 : idx === 2 ? 10000 : 0,
                finishedGoods: idx === 2 ? 5000 : 0
              }
            },
            zroid: {
              ...baseDec.procurement.supplierAllocation.zroid,
              Zen: {
                components: idx === 3 ? 6000 : 0,
                finishedGoods: 0
              }
            },
            itab: {
              ...baseDec.procurement.supplierAllocation.itab,
              Zen: { components: 0, finishedGoods: 0 }
            }
          }
        },
        supplierOverrides: isJvOwner ? {
          componentCosts: {
            techbook: { Zen: ZEN_TRANSFER_COSTS.techbook.components },
            zroid: { Zen: ZEN_TRANSFER_COSTS.zroid.components },
            itab: { Zen: ZEN_TRANSFER_COSTS.itab.components },
          },
          finishedGoodsCosts: {
            techbook: { Zen: ZEN_TRANSFER_COSTS.techbook.finishedGoods },
            zroid: { Zen: ZEN_TRANSFER_COSTS.zroid.finishedGoods },
            itab: { Zen: ZEN_TRANSFER_COSTS.itab.finishedGoods },
          },
          status: { Zen: 'AGREED' }
        } : isExternalBuyer ? {
          componentCosts: {
            techbook: { Zen: 1040 }, // Margin = 1040 - 540 = R500/unit * 10,000 = R5,000,000
            zroid: { Zen: 1164 },    // Margin = 1164 - 664 = R500/unit * 6,000  = R3,000,000
          },
          finishedGoodsCosts: {
            techbook: { Zen: 1124 }, // Margin = 1124 - 624 = R500/unit * 5,000  = R2,500,000
          },
          paymentTerms: { Zen: 60 },
          quality: { Zen: 8.5 },
          innovation: { Zen: 9.0 },
          leadTime: { Zen: 7.5 },
          service: { Zen: 9.5 },
          capacity: { Zen: 8.0 },
          status: { Zen: 'AGREED' }
        } : undefined
      }
    };
  });

  // Verify Supplier Pricing & KPI overrides for JV Owners vs External Buyers
  assert.strictEqual(getSupplierComponentCost('techbook', 'Zen', zenTestTeamsY3[0].draftDecisions), 540, 'JV Owner must get R540 TechBook raw transfer cost');
  assert.strictEqual(getSupplierFinishedGoodsCost('techbook', 'Zen', zenTestTeamsY3[0].draftDecisions), 624, 'JV Owner must get R624 TechBook FG transfer cost');
  assert.strictEqual(getSupplierComponentCost('techbook', 'Zen', zenTestTeamsY3[2].draftDecisions), 1040, 'External buyer must get negotiated R1040 TechBook raw price');
  assert.strictEqual(getSupplierFinishedGoodsCost('techbook', 'Zen', zenTestTeamsY3[2].draftDecisions), 1124, 'External buyer must get negotiated R1124 TechBook FG price');
  assert.strictEqual(getSupplierPaymentTerms('Zen', zenTestTeamsY3[2].draftDecisions), 60);
  assert.strictEqual(getSupplierQuality('Zen', zenTestTeamsY3[2].draftDecisions), 8.5);
  assert.strictEqual(getSupplierInnovation('Zen', zenTestTeamsY3[2].draftDecisions), 9.0);
  assert.strictEqual(getSupplierLeadTime('Zen', zenTestTeamsY3[2].draftDecisions), 7.5);
  assert.strictEqual(getSupplierService('Zen', zenTestTeamsY3[2].draftDecisions), 9.5);
  assert.strictEqual(getSupplierCapacity('Zen', zenTestTeamsY3[2].draftDecisions), 8.0);

  const mockZenAuction = {
    startTime: '14:45',
    endTime: '15:00',
    reservePrice: 190_000_000,
    bids: [],
    isAwarded: true,
    winningTeamId: zenTestTeamsY3[0].id,
    winningTeamName: zenTestTeamsY3[0].name,
    winningAmount: 200_000_000,
    jvSplits: {
      [zenTestTeamsY3[0].id]: 60,
      [zenTestTeamsY3[1].id]: 40,
    },
    jvConfirmed: true,
  };

  const zenPerfY3 = computeIndustryPerformance(zenTestTeamsY3, 3, mockZenAuction);
  // Total B2B profit:
  // - Team 0 (JV Owner) buying 8,000 units at transfer cost generates R0 external profit
  // - Team 2 (Buyer) buying 10,000 TB raw (margin 500 = R5m) + 5,000 TB FG (margin 500 = R2.5m) = R7,500,000
  // - Team 3 (Buyer) buying 6,000 Zroid raw (margin 500 = R3m) = R3,000,000
  // Total External B2B Profit Pool = R10,500,000
  assert.strictEqual(zenPerfY3[0].alpOpportunities?.zen?.totalExternalUnitsSold, 21000);
  assert.strictEqual(zenPerfY3[0].alpOpportunities?.zen?.totalZenB2BProfit, 10_500_000);
  assert.strictEqual(zenPerfY3[0].alpOpportunities?.zen?.ownershipPct, 60);
  assert.strictEqual(zenPerfY3[0].alpOpportunities?.zen?.purchasePriceShare, 120_000_000); // 60% of R200m
  assert.strictEqual(zenPerfY3[0].alpOpportunities?.zen?.netOfOpportunity, 6_300_000); // 60% of 10.5m
  assert.strictEqual(zenPerfY3[1].alpOpportunities?.zen?.ownershipPct, 40);
  assert.strictEqual(zenPerfY3[1].alpOpportunities?.zen?.purchasePriceShare, 80_000_000); // 40% of R200m
  assert.strictEqual(zenPerfY3[1].alpOpportunities?.zen?.netOfOpportunity, 4_200_000); // 40% of 10.5m
  assert.strictEqual(zenPerfY3[2].alpOpportunities?.zen?.isOwner, false);
  assert.strictEqual(zenPerfY3[2].alpOpportunities?.zen?.netOfOpportunity, 0);

  // Verify combined Year 3 Other Income = Botswana Net + Zen B2B Net
  const t0BotswanaNetY3 = zenPerfY3[0].alpOpportunities?.botswana?.netOfOpportunity ?? 0;
  assert.strictEqual(
    zenPerfY3[0].otherIncome,
    t0BotswanaNetY3 + 6_300_000,
    'Team 0 Year 3 Other Income must equal Botswana Net + 60% Zen B2B Profit Share'
  );
  assert.strictEqual(
    zenPerfY3[1].otherIncome,
    4_200_000,
    'Team 1 (not in Botswana, 40% Zen JV owner) Year 3 Other Income must equal 40% Zen B2B Profit Share'
  );

  // Verify Year 3 Balance Sheet reconciliation with Zen Auction passed in
  const bsY3NoZen = computeTeamPeriodBalanceSheet(zenTestTeamsY3[1], 3, zenTestTeamsY3);
  const bsY3WithZen = computeTeamPeriodBalanceSheet(zenTestTeamsY3[1], 3, zenTestTeamsY3, mockZenAuction);
  assert.strictEqual(
    bsY3WithZen.netProfit - bsY3NoZen.netProfit,
    4_200_000,
    'Year 3 Balance Sheet Net Profit for Team 1 must increase by R4.2m Zen B2B Other Income'
  );
  assert.strictEqual(
    bsY3WithZen.equity - bsY3NoZen.equity,
    4_200_000,
    'Year 3 Balance Sheet Equity for Team 1 must increase by R4.2m Zen B2B Other Income'
  );
  assert.ok(
    Math.abs(bsY3WithZen.totalAssets - bsY3WithZen.totalLiabilitiesAndEquity) < 0.01,
    'Year 3 Balance Sheet with Zen B2B Other Income must balance'
  );

  // 5) Verify Facilitator-customized Zen Auction times, reserve price, and transfer costs in Year 3 Scenario & Engine
  const customZenClassY3: ClassRoom = {
    ...mockAlpClassY3,
    teams: alpTeamsY3,
    zenAuction: {
      ...mockZenAuction,
      startTime: '10:15',
      endTime: '10:30',
      reservePrice: 210_000_000,
      transferCosts: {
        techbook: { components: 500, finishedGoods: 600 },
        zroid: { components: 650, finishedGoods: 850 },
        itab: { components: 550, finishedGoods: 880 },
      }
    }
  };
  const resolvedCustomScenario3 = resolveScenario(customZenClassY3, 3);
  assert.ok(
    resolvedCustomScenario3.body.includes('between 10:15 and 10:30') &&
      resolvedCustomScenario3.body.includes('inclusive through 10:30:59'),
    'Scenario 3 must dynamically inject facilitator-configured auction open/close times'
  );
  assert.ok(
    resolvedCustomScenario3.body.includes('R210m') &&
      resolvedCustomScenario3.body.includes('**Asking Minimum Price: R 210 000 000**'),
    'Scenario 3 must dynamically inject facilitator-configured minimum asking price'
  );
  assert.ok(
    resolvedCustomScenario3.body.includes('| TechBook | R 500 |') &&
      resolvedCustomScenario3.body.includes('| TechBook | R 600 |'),
    'Scenario 3 must dynamically inject facilitator-configured transfer costs'
  );

  // Verify dynamic Year 2 regional opportunities table in Year 3 Scenario
  const dynRegSection = buildDynamicRegionalOpportunitiesYear2Section(customZenClassY3);
  assert.ok(
    dynRegSection.includes('**Botswana Opportunity** (Number of teams that entered: 2)') &&
      dynRegSection.includes('**Mozambique Opportunity** (Number of teams that entered: 1)'),
    'Year 3 Scenario must dynamically summarize Year 2 Botswana & Mozambique entrant counts and results'
  );

  // Verify custom transfer costs in computeIndustryPerformance
  const zenPerfCustomTC = computeIndustryPerformance(zenTestTeamsY3, 3, customZenClassY3.zenAuction);
  // With custom transfer costs:
  // - Team 2 TB raw: 10,000 * (1040 - 500) = 5,400,000
  // - Team 2 TB FG:  5,000  * (1124 - 600) = 2,620,000
  // - Team 3 ZR raw: 6,000  * (1164 - 650) = 3,084,000
  // Total = 11,104,000
  assert.strictEqual(
    zenPerfCustomTC[0].alpOpportunities?.zen?.totalZenB2BProfit,
    11_104_000,
    'computeIndustryPerformance must use facilitator-configured custom transfer costs when present'
  );

  // 6) Verify Year 3 ALP iTab Price Criteria adjusts to 8/10 (from 3/10 in Year 1 & 2)
  assert.strictEqual(getCriterionRating(1, 'itab', 1), 3, 'Year 1 iTab price criterion rating must be 3/10');
  assert.strictEqual(getCriterionRating(1, 'itab', 2), 3, 'Year 2 iTab price criterion rating must be 3/10');
  assert.strictEqual(getCriterionRating(1, 'itab', 3), 8, 'Year 3 iTab price criterion rating must be 8/10');
  assert.strictEqual(getProductBuyingWeights('itab', 1, true).price, 3, 'Year 1 ALP iTab price weight must be 3');
  assert.strictEqual(getProductBuyingWeights('itab', 2, true).price, 3, 'Year 2 ALP iTab price weight must be 3');
  assert.strictEqual(getProductBuyingWeights('itab', 3, true).price, 8, 'Year 3 ALP iTab price weight must be 8');

  // 7) Verify Year 3 ALP debrief slides include both 'regional-opportunities' and 'zen-acquisition' in order
  const alpSlidesY3 = compileDebriefSlides({
    className: 'ALP Class Y3',
    period: 3,
    teams: [],
    loading: false,
    error: null,
    isActionLearningProject: true,
    zenAuction: mockZenAuction,
  });
  const regIdxY3 = alpSlidesY3.findIndex(s => s.id === 'regional-opportunities');
  const zenIdxY3 = alpSlidesY3.findIndex(s => s.id === 'zen-acquisition');
  assert.ok(regIdxY3 >= 0, 'ALP Year 3 debrief must include regional-opportunities slide');
  assert.strictEqual(zenIdxY3, regIdxY3 + 1, 'zen-acquisition slide must appear immediately after regional-opportunities slide in Year 3 ALP');
  assert.strictEqual(
    nonAlpSlides.some(s => s.id === 'zen-acquisition'),
    false,
    'Non-ALP debrief slides must never include zen-acquisition slide'
  );

  setActiveClassIsALP(false);

  console.log('✅ Regression test passed: Standard class produces 100% identical outputs byte for byte, and all ALP items (demand, regional opportunities, engineer <R60k attrition, Zen auction, JV split, custom transfer costs, B2B profit & debrief slides) work accurately!');
}

runRegressionTest();

