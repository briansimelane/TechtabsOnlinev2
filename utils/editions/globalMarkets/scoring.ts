import { PeriodRecord } from '../../../types';

export interface TeamGlobalMarketsScore {
  teamId: string;
  teamName: string;
  economicProfit: number;
  netProfit: number;
  npMargin: number;
  cashConversion: number;
  planDelivery: number;
  epPoints: number;
  npPoints: number;
  ccPoints: number;
  pdPoints: number;
  rawScore?: number;
  score: number;
  maxScore: number;
  year: number;
  isDisqualified?: boolean;
  disqualificationReason?: string;
}

export function scoreYearGlobalMarkets(
  teams: { id: string; name: string; record: PeriodRecord }[],
  year: number
): TeamGlobalMarketsScore[] {
  const metricsList = teams.map(t => {
    const rec = t.record;
    const gm = rec?.gm;
    const ep = gm?.scorecard?.economicProfit ?? 0;
    const np = rec?.netProfit ?? 0;
    const rev = rec?.revenue?.total || 0;
    const npMargin = rev > 0 ? (np / rev) * 100 : 0;
    const cc = gm?.scorecard?.cashConversion ?? 0;
    const pd = gm?.scorecard?.planVariance ?? 0;

    // Check disqualification gates (§9.3):
    // CSAT < 71%, ESAT < 71%, an uncured covenant breach at final period end, cash below overdraft limit
    const csat = rec?.kpis?.customerSatisfaction ?? 0.70;
    const esat = rec?.kpis?.employeeSatisfaction ?? 0.70;
    const breached = (gm?.covenants?.breached?.length || 0) > 0;
    const cash = rec?.balanceSheet?.cash ?? 0;
    const isDisqualified = csat < 0.71 || esat < 0.71 || breached || cash < -50000000;
    let disqualificationReason = '';
    if (csat < 0.71) disqualificationReason = 'Customer satisfaction below 71%';
    else if (esat < 0.71) disqualificationReason = 'Employee satisfaction below 71%';
    else if (breached) disqualificationReason = 'Uncured covenant breach';
    else if (cash < -50000000) disqualificationReason = 'Overdraft limit exceeded';

    return {
      teamId: t.id,
      teamName: t.name,
      economicProfit: ep,
      netProfit: np,
      npMargin,
      cashConversion: cc,
      planDelivery: pd,
      year,
      isDisqualified,
      disqualificationReason
    };
  });

  const nTeams = metricsList.length;
  const maxScore = nTeams > 0 ? nTeams * 4 : 4;

  const sortedEP = [...metricsList].sort((a, b) => a.economicProfit - b.economicProfit);
  const epRankMap: Record<string, number> = {};
  sortedEP.forEach((m, idx) => { epRankMap[m.teamId] = idx + 1; });

  const sortedNP = [...metricsList].sort((a, b) => a.npMargin - b.npMargin);
  const npRankMap: Record<string, number> = {};
  sortedNP.forEach((m, idx) => { npRankMap[m.teamId] = idx + 1; });

  const sortedCC = [...metricsList].sort((a, b) => a.cashConversion - b.cashConversion);
  const ccRankMap: Record<string, number> = {};
  sortedCC.forEach((m, idx) => { ccRankMap[m.teamId] = idx + 1; });

  const sortedPD = [...metricsList].sort((a, b) => a.planDelivery - b.planDelivery);
  const pdRankMap: Record<string, number> = {};
  sortedPD.forEach((m, idx) => { pdRankMap[m.teamId] = idx + 1; });

  return metricsList.map(m => {
    const epPoints = epRankMap[m.teamId] || 1;
    const npPoints = npRankMap[m.teamId] || 1;
    const ccPoints = ccRankMap[m.teamId] || 1;
    const pdPoints = pdRankMap[m.teamId] || 1;
    const rawScore = epPoints + npPoints + ccPoints + pdPoints;
    const score = rawScore;

    return {
      ...m,
      epPoints,
      npPoints,
      ccPoints,
      pdPoints,
      rawScore,
      score,
      maxScore
    };
  });
}

export function scoreCumulativeGlobalMarkets(
  teams: { id: string; name: string; history?: Record<number, PeriodRecord>; fullHistory?: Record<number, PeriodRecord>; record?: PeriodRecord }[],
  throughYear: number
): {
  teamId: string;
  teamName: string;
  byYear: Record<number, number>;
  total: number;
}[] {
  const result: Record<string, { teamId: string; teamName: string; byYear: Record<number, number>; total: number }> = {};

  teams.forEach(t => {
    result[t.id] = {
      teamId: t.id,
      teamName: t.name,
      byYear: {},
      total: 0
    };
  });

  for (let yr = 1; yr <= throughYear; yr++) {
    const teamsWithYrRecord: { id: string; name: string; record: PeriodRecord }[] = [];
    teams.forEach(t => {
      const histMap = t.fullHistory || t.history;
      const rec = histMap?.[yr] || histMap?.[String(yr)] || (yr === throughYear ? t.record : undefined);
      if (rec) {
        teamsWithYrRecord.push({ id: t.id, name: t.name, record: rec });
      }
    });

    if (teamsWithYrRecord.length > 0) {
      const yearScores = scoreYearGlobalMarkets(teamsWithYrRecord, yr);
      yearScores.forEach(s => {
        if (result[s.teamId]) {
          result[s.teamId].byYear[yr] = s.score;
          result[s.teamId].total += s.score;
        }
      });
    }
  }

  return Object.values(result);
}

