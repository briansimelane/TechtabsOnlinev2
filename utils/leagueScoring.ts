import { PeriodRecord } from '../types';

export interface TeamYearMetrics {
  teamId: string;
  teamName: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  equity: number;
  gpMargin: number; // as %
  npMargin: number; // as %
  roe: number;      // as %
}

export interface TeamYearScore extends TeamYearMetrics {
  year: number;
  gpPoints: number;
  npPoints: number;
  roePoints: number;
  score: number;    // gpPoints + npPoints + roePoints
  maxScore: number; // nTeams * 3
}

export function metricsFromRecord(teamId: string, teamName: string, rec: PeriodRecord): TeamYearMetrics {
  const revenue = rec?.revenue?.total || 0;
  const grossProfit = rec?.grossProfit?.total || 0;
  const netProfit = rec?.netProfit || 0;
  const equity = rec?.balanceSheet?.equity || 0;

  const gpMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const npMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const roe = equity > 0 ? (netProfit / equity) * 100 : 0;

  return {
    teamId,
    teamName,
    revenue,
    grossProfit,
    netProfit,
    equity,
    gpMargin,
    npMargin,
    roe
  };
}

export function scoreYear(teams: { id: string; name: string; record: PeriodRecord }[], year: number): TeamYearScore[] {
  const metricsList = teams.map(t => metricsFromRecord(t.id, t.name, t.record));
  const nTeams = metricsList.length;
  const maxScore = nTeams > 0 ? nTeams * 3 : 3;

  // Rank by GP% (1 = lowest, nTeams = highest)
  const sortedGP = [...metricsList].sort((a, b) => a.gpMargin - b.gpMargin);
  const gpRankMap: Record<string, number> = {};
  sortedGP.forEach((m, idx) => { gpRankMap[m.teamId] = idx + 1; });

  // Rank by NP% (1 = lowest, nTeams = highest)
  const sortedNP = [...metricsList].sort((a, b) => a.npMargin - b.npMargin);
  const npRankMap: Record<string, number> = {};
  sortedNP.forEach((m, idx) => { npRankMap[m.teamId] = idx + 1; });

  // Rank by ROE (1 = lowest, nTeams = highest)
  const sortedROE = [...metricsList].sort((a, b) => a.roe - b.roe);
  const roeRankMap: Record<string, number> = {};
  sortedROE.forEach((m, idx) => { roeRankMap[m.teamId] = idx + 1; });

  return metricsList.map(m => {
    const gpPoints = gpRankMap[m.teamId] || 1;
    const npPoints = npRankMap[m.teamId] || 1;
    const roePoints = roeRankMap[m.teamId] || 1;
    const score = gpPoints + npPoints + roePoints;

    return {
      ...m,
      year,
      gpPoints,
      npPoints,
      roePoints,
      score,
      maxScore
    };
  });
}

export function scoreCumulative(
  teams: { id: string; name: string; history?: Record<number, PeriodRecord> }[],
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
      if (t.history && t.history[yr]) {
        teamsWithYrRecord.push({ id: t.id, name: t.name, record: t.history[yr] });
      }
    });

    if (teamsWithYrRecord.length > 0) {
      const yearScores = scoreYear(teamsWithYrRecord, yr);
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
