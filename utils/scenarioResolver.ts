import { SimulationClass, ScenarioVariant, HRRole } from '../types';
import { SCENARIO_TEMPLATES, ZEN_RESERVE_PRICE, ZEN_TRANSFER_COSTS } from '../constants';
import { getTeamRoleHeadcountForPeriod } from './marketShareBackModel';
import { computeIndustryPerformance } from './industryPerformance';
import { formatNumber } from './numberFormat';

export interface ResolvedScenario {
  period: number;
  title: string;
  body: string;
  hidden: boolean;          // true => must not be shown to students
  source: 'override' | 'variant' | 'none';
  variantId?: string;
  availableVariants: ScenarioVariant[];  // for the facilitator variant picker
}

const SCENARIO_ATTRITION_ROLES: { id: HRRole; label: string }[] = [
  { id: 'engineers', label: 'Engineers' },
  { id: 'technicians', label: 'Technicians' },
  { id: 'semiSkilled', label: 'Semi-skilled' },
  { id: 'adminSales', label: 'Admin & Sales' },
  { id: 'customerService', label: 'Customer Service' },
];

export function buildDynamicAttritionTable(cls: SimulationClass | undefined, period: number): string {
  const prevPeriod = Math.max(1, period - 1);
  const activeTeams = cls?.teams
    ? cls.teams.filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id))
    : [];

  if (activeTeams.length === 0) {
    return '_No active teams available to calculate previous round staff attrition._';
  }

  const headerRow = `| | ${activeTeams.map(t => t.name).join(' | ')} |`;
  const separatorRow = `| --- | ${activeTeams.map(() => '---').join(' | ')} |`;

  const rateRow = `| Attrition Rate (1 - ESAT) | ${activeTeams
    .map(t => {
      const breakdown = getTeamRoleHeadcountForPeriod(t, 'engineers', prevPeriod, true);
      const ratePct = Math.max(0, 1 - breakdown.closingEsat) * 100;
      return `${ratePct.toFixed(1)}%`;
    })
    .join(' | ')} |`;

  const roleRows = SCENARIO_ATTRITION_ROLES.map(({ id, label }) => {
    const values = activeTeams.map(t => {
      const breakdown = getTeamRoleHeadcountForPeriod(t, id, prevPeriod, true);
      // In Year 3 (prevPeriod === 2), show the ESAT-based attrition in the main table and break down the +2 salary penalty below
      if (period === 3 && id === 'engineers') {
        return String(breakdown.baseAttrition);
      }
      return String(breakdown.attrition);
    });
    return `| ${label} | ${values.join(' | ')} |`;
  });

  const mainTable = [headerRow, separatorRow, rateRow, ...roleRows].join('\n');

  if (period === 3) {
    const engBreakdowns = activeTeams.map(t => getTeamRoleHeadcountForPeriod(t, 'engineers', 2, true));
    const salaryRow = `| Year 2 Engineer Salary | ${engBreakdowns.map(b => `R ${formatNumber(b.salaryPaid, 0)}`).join(' | ')} |`;
    const baseEngRow = `| Engineers (ESAT Attrition) | ${engBreakdowns.map(b => String(b.baseAttrition)).join(' | ')} |`;
    const extraEngRow = `| Additional Engineers Lost (Salary < R60,000) | ${engBreakdowns.map(b => String(b.additionalAttrition)).join(' | ')} |`;
    const totalEngRow = `| **Total Engineers Lost (into Year 3 Opening Staff)** | ${engBreakdowns.map(b => `**${b.attrition}**`).join(' | ')} |`;

    const investorSection = [
      '',
      'It also appears the influential shareholder (investor), Mrs Smith, was correct in her worry about the salaries of engineers and the information she received has proved to have been reliable. The minimum salary of **R60,000** was wanted by the Engineers, and companies that paid their engineers less than **R60,000** at the end of Year 2 have incurred an additional attrition of **2 engineers** leading into Year 3 Opening Staff:',
      '',
      headerRow,
      separatorRow,
      salaryRow,
      baseEngRow,
      extraEngRow,
      totalEngRow,
    ].join('\n');

    return `${mainTable}\n${investorSection}`;
  }

  return mainTable;
}

export function buildDynamicRegionalOpportunitiesYear2Section(cls: SimulationClass | undefined): string {
  const activeTeams = cls?.teams
    ? cls.teams.filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id))
    : [];

  if (activeTeams.length === 0) {
    return '';
  }

  const perfList = computeIndustryPerformance(activeTeams, 2);
  const perfMap = new Map(perfList.map(p => [p.teamId, p]));

  const getBw = (t: typeof activeTeams[0]) =>
    t.history?.[2]?.alpOpportunities?.botswana ??
    t.history?.[2]?.industry?.alpOpportunities?.botswana ??
    perfMap.get(t.id)?.alpOpportunities?.botswana;

  const getMz = (t: typeof activeTeams[0]) =>
    t.history?.[2]?.alpOpportunities?.mozambique ??
    t.history?.[2]?.industry?.alpOpportunities?.mozambique ??
    perfMap.get(t.id)?.alpOpportunities?.mozambique;

  const bwEnteredCount = activeTeams.filter(t => getBw(t)?.entered).length;
  const mzEnteredCount = activeTeams.filter(t => getMz(t)?.entered).length;

  const headerRow = `| | ${activeTeams.map(t => t.name).join(' | ')} |`;
  const separatorRow = `| --- | ${activeTeams.map(() => '---').join(' | ')} |`;

  const bwTable = [
    `**Botswana Opportunity** (Number of teams that entered: ${bwEnteredCount})`,
    '',
    headerRow,
    separatorRow,
    `| Entered? | ${activeTeams.map(t => (getBw(t)?.entered ? 'Yes' : '')).join(' | ')} |`,
    `| TechBook Units | ${activeTeams.map(t => formatNumber(getBw(t)?.productContribution?.techbook ?? 0, 0)).join(' | ')} |`,
    `| Zroid Units | ${activeTeams.map(t => formatNumber(getBw(t)?.productContribution?.zroid ?? 0, 0)).join(' | ')} |`,
    `| iTab Units | ${activeTeams.map(t => formatNumber(getBw(t)?.productContribution?.itab ?? 0, 0)).join(' | ')} |`,
    `| Cost | ${activeTeams.map(t => formatNumber(getBw(t)?.totalCost ?? 0, 0)).join(' | ')} |`,
    `| NET of Opportunity | ${activeTeams.map(t => formatNumber(getBw(t)?.netOfOpportunity ?? 0, 0)).join(' | ')} |`,
  ].join('\n');

  const mzTable = [
    `**Mozambique Opportunity** (Number of teams that entered: ${mzEnteredCount})`,
    '',
    headerRow,
    separatorRow,
    `| Entered? | ${activeTeams.map(t => (getMz(t)?.entered ? 'Yes' : '')).join(' | ')} |`,
    `| TechBook Units | ${activeTeams.map(t => formatNumber(getMz(t)?.productContribution?.techbook ?? 0, 0)).join(' | ')} |`,
    `| Zroid Units | ${activeTeams.map(t => formatNumber(getMz(t)?.productContribution?.zroid ?? 0, 0)).join(' | ')} |`,
    `| iTab Units | ${activeTeams.map(t => formatNumber(getMz(t)?.productContribution?.itab ?? 0, 0)).join(' | ')} |`,
    `| Cost | ${activeTeams.map(t => formatNumber(getMz(t)?.totalCost ?? 0, 0)).join(' | ')} |`,
    `| NET of Opportunity | ${activeTeams.map(t => formatNumber(getMz(t)?.netOfOpportunity ?? 0, 0)).join(' | ')} |`,
  ].join('\n');

  return [
    '### Past performance in Botswana and Mozambique',
    '',
    bwTable,
    '',
    mzTable,
  ].join('\n');
}

function injectDynamicAttrition(body: string, cls: SimulationClass | undefined, period: number): string {
  if (period < 2 || !body) return body;
  const dynamicTable = buildDynamicAttritionTable(cls, period);

  // Strip any legacy static Mrs Smith / R60,000 engineer attrition paragraph & table before injecting {{STAFF_ATTRITION_TABLE}}
  let updated = body.replace(
    /\n*It also appears the shareholder, Mrs Smith, was correct in her worry about the salaries of engineers[\s\S]*?\|\s*Engineers\s*\|[^\n]*\n?/g,
    '\n'
  );

  if (updated.includes('{{STAFF_ATTRITION_TABLE}}')) {
    updated = updated.replace(/\{\{STAFF_ATTRITION_TABLE\}\}/g, dynamicTable);
  }

  if (period === 3 && updated.includes('{{REGIONAL_OPPORTUNITIES_YEAR2_TABLE}}')) {
    const oppSection = buildDynamicRegionalOpportunitiesYear2Section(cls);
    updated = updated.replace(/\{\{REGIONAL_OPPORTUNITIES_YEAR2_TABLE\}\}/g, oppSection);
  }

  // Dynamically inject Facilitator-configured Year 3 Zen Auction times, reserve price, and transfer costs
  if (period === 3 && cls?.zenAuction) {
    const zen = cls.zenAuction;
    const startTime = zen.startTime || '14:45';
    const endTime = zen.endTime || '15:00';
    const reservePrice = zen.reservePrice || ZEN_RESERVE_PRICE;
    const reservePriceMil = Math.round((reservePrice / 1_000_000) * 100) / 100;
    const tc = zen.transferCosts || ZEN_TRANSFER_COSTS;

    updated = updated.replace(
      /The company will be sold at an OPEN bid auction between \d{1,2}:\d{2} and \d{1,2}:\d{2}\.[^\n]*/g,
      `The company will be sold at an OPEN bid auction between ${startTime} and ${endTime}. Submit your bids live in the **Zen Auction** tab inside the simulation. Open bid means the highest price received on time wins the auction when the auction closes at ${endTime} (inclusive through ${endTime}:59).`
    );
    updated = updated.replace(
      /The minimum asking price for the auction is R\s*[\d.,]+m\./g,
      `The minimum asking price for the auction is R${reservePriceMil}m.`
    );
    updated = updated.replace(
      /\*\*Asking Minimum Price:\s*R\s*[\d\s,]+\*\*/g,
      `**Asking Minimum Price: R ${formatNumber(reservePrice, 0).replace(/,/g, ' ')}**`
    );
    updated = updated.replace(
      /(Transfer Costs – Input Costs \/ Unit \(Raw Material\):\s*\n+\|\s*Product\s*\|\s*Cost\s*\|\s*\n\|\s*---\s*\|\s*---\s*\|\s*\n)\|\s*TechBook\s*\|\s*R\s*\d+\s*\|\s*\n\|\s*Zroid\s*\|\s*R\s*\d+\s*\|\s*\n\|\s*iTab\s*\|\s*R\s*\d+\s*\|/,
      `$1| TechBook | R ${tc.techbook.components} |\n| Zroid | R ${tc.zroid.components} |\n| iTab | R ${tc.itab.components} |`
    );
    updated = updated.replace(
      /(Transfer Costs – Input Costs \/ Unit \(Finished Goods\):\s*\n+\|\s*Product\s*\|\s*Cost\s*\|\s*\n\|\s*---\s*\|\s*---\s*\|\s*\n)\|\s*TechBook\s*\|\s*R\s*\d+\s*\|\s*\n\|\s*Zroid\s*\|\s*R\s*\d+\s*\|\s*\n\|\s*iTab\s*\|\s*R\s*\d+\s*\|/,
      `$1| TechBook | R ${tc.techbook.finishedGoods} |\n| Zroid | R ${tc.zroid.finishedGoods} |\n| iTab | R ${tc.itab.finishedGoods} |`
    );
  }

  // Also upgrade any existing saved override that still has the legacy static Year 2 / Year 3 attrition table or placeholder sentence
  const legacyTableRegex = /(## Staff Attrition\s+Based on the ending employee satisfaction levels, the following number of staff members have been lost by the different teams:\s+)\|\s*\|\s*Team 1\s*\|\s*Team 2[\s\S]*?\|\s*Customer Service\s*\|[^\n]*\n?/;
  if (legacyTableRegex.test(updated)) {
    updated = updated.replace(legacyTableRegex, `$1${dynamicTable}\n`);
  }

  const legacySentenceRegex = /Based on the ending employee satisfaction levels your staff attrition would have been adjusted\./;
  if (legacySentenceRegex.test(updated)) {
    updated = updated.replace(
      legacySentenceRegex,
      `Based on the ending employee satisfaction levels, the following number of staff members have been lost by the different teams:\n\n${dynamicTable}`
    );
  }

  return updated;
}

export function resolveScenario(cls: SimulationClass | undefined, period: number): ResolvedScenario {
  const rawVariants = (cls && SCENARIO_TEMPLATES[period]) || SCENARIO_TEMPLATES[period] || [];
  const variants: ScenarioVariant[] = rawVariants.map(v => ({
    ...v,
    body: injectDynamicAttrition(v.body, cls, period)
  }));
  const override = cls?.scenarioOverrides?.[period];

  // 1. Full custom override body wins.
  if (override?.body != null && override.body.trim() !== '') {
    return {
      period,
      title: override.title?.trim() || `Period ${period} Scenario`,
      body: injectDynamicAttrition(override.body, cls, period),
      hidden: !!override.hidden,
      source: 'override',
      availableVariants: variants,
    };
  }

  // 2. Otherwise a selected template variant (or the first template variant).
  const chosen =
    variants.find(v => v.id === override?.activeVariantId) ?? variants[0];

  if (chosen) {
    return {
      period,
      title: chosen.title,
      body: chosen.body,
      hidden: !!override?.hidden,
      source: 'variant',
      variantId: chosen.id,
      availableVariants: variants,
    };
  }

  // 3. Nothing defined for this period.
  return {
    period,
    title: `Period ${period} Scenario`,
    body: '',
    hidden: !!override?.hidden,
    source: 'none',
    availableVariants: variants,
  };
}
