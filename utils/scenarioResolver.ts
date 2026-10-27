import { SimulationClass, ScenarioVariant, HRRole } from '../types';
import { SCENARIO_TEMPLATES } from '../constants';
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
      const breakdown = getTeamRoleHeadcountForPeriod(t, 'engineers', prevPeriod);
      const ratePct = Math.max(0, 1 - breakdown.closingEsat) * 100;
      return `${ratePct.toFixed(1)}%`;
    })
    .join(' | ')} |`;

  const roleRows = SCENARIO_ATTRITION_ROLES.map(({ id, label }) => {
    const values = activeTeams.map(t => {
      const breakdown = getTeamRoleHeadcountForPeriod(t, id, prevPeriod);
      return String(breakdown.attrition);
    });
    return `| ${label} | ${values.join(' | ')} |`;
  });

  return [headerRow, separatorRow, rateRow, ...roleRows].join('\n');
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

  let updated = body;
  if (updated.includes('{{STAFF_ATTRITION_TABLE}}')) {
    updated = updated.replace(/\{\{STAFF_ATTRITION_TABLE\}\}/g, dynamicTable);
  }

  if (period === 3 && updated.includes('{{REGIONAL_OPPORTUNITIES_YEAR2_TABLE}}')) {
    const oppSection = buildDynamicRegionalOpportunitiesYear2Section(cls);
    updated = updated.replace(/\{\{REGIONAL_OPPORTUNITIES_YEAR2_TABLE\}\}/g, oppSection);
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
