import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DebriefDataset } from '../hooks/useDebriefData';
import { scoreYearFromPerformance, scoreCumulative, getCumCsatEsat, getCumFinancialPct } from './leagueScoring';
import { formatCurrency, formatPercent } from './numberFormat';

export const downloadDebriefDeckPdf = (dataset: DebriefDataset) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate-900
  const emeraldColor: [number, number, number] = [16, 185, 129]; // Emerald-500
  const goldColor: [number, number, number] = [217, 119, 6]; // Gold-600

  // -------------------------------------------------------------
  // SLIDE 1: Title Slide
  // -------------------------------------------------------------
  // Top Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Gold accent bar
  doc.setFillColor(...goldColor);
  doc.rect(0, 55, pageWidth, 4, 'F');

  // Title text
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TECHTABS BUSINESS SIMULATION', 20, 26);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(52, 211, 153); // Emerald text
  doc.text(`Executive Debrief Presentation — Year ${dataset.period}`, 20, 42);

  // Content Area Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Class: ${dataset.className}`, 20, 80);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Active Teams: ${dataset.teams.length}`, 20, 92);
  doc.text(`Generated On: ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}`, 20, 102);

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 115, pageWidth - 40, 65, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, 115, pageWidth - 40, 65, 4, 4, 'D');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Debrief Deck Contents:', 30, 130);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('• Slide 1: Executive Title & Overview', 35, 142);
  doc.text(`• Slide 2: League Standings — Year ${dataset.period} Results`, 35, 150);
  doc.text('• Slide 3: Cumulative Championship Leaderboard', 35, 158);
  doc.text('• Slide 4: Financial Performance (Revenue, Profitability & ROE)', 35, 166);
  doc.text('• Slide 5: Product Revenue & Market Share Breakdown', 150, 142);
  doc.text('• Slide 6: Operations, HR & Customer Satisfaction KPIs', 150, 150);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential — For Internal Facilitation & Participant Review Only', 20, pageHeight - 12);

  // Helper function for slide page header
  const addSlideHeader = (title: string, eyebrow: string) => {
    doc.addPage();
    
    // Left team rail indicator accent line
    doc.setFillColor(...goldColor);
    doc.rect(0, 0, 4, pageHeight, 'F');

    // Header title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title, 16, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(eyebrow.toUpperCase(), 16, 9);

    doc.setLineWidth(0.4);
    doc.setDrawColor(226, 232, 240);
    doc.line(16, 20, pageWidth - 16, 20);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Techtabs Simulation | ${dataset.className} — Year ${dataset.period}`, 16, pageHeight - 8);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 25, pageHeight - 8);
  };

  // -------------------------------------------------------------
  // SLIDE 2: Year League Standings
  // -------------------------------------------------------------
  addSlideHeader(`League Standings — Year ${dataset.period}`, 'Class Competition');

  const perfList = dataset.teams.map(t => t.perf);
  const yearScores = scoreYearFromPerformance(perfList, dataset.period);
  const rankedScores = [...yearScores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const teamA = dataset.teams.find(t => t.id === a.teamId);
    const teamB = dataset.teams.find(t => t.id === b.teamId);
    const tb1A = getCumCsatEsat(teamA, dataset.period);
    const tb1B = getCumCsatEsat(teamB, dataset.period);
    if (Math.abs(tb1B - tb1A) > 0.001) return tb1B - tb1A;
    return getCumFinancialPct(teamB, dataset.period) - getCumFinancialPct(teamA, dataset.period);
  });

  const leagueRows = rankedScores.map((s, idx) => {
    const teamObj = dataset.teams.find(t => t.id === s.teamId);
    const tb1 = getCumCsatEsat(teamObj, dataset.period);
    const tb2 = getCumFinancialPct(teamObj, dataset.period);
    const rankLabel = idx === 0 ? '1st (Gold)' : idx === 1 ? '2nd (Silver)' : idx === 2 ? '3rd (Bronze)' : `${idx + 1}`;

    return [
      rankLabel,
      s.teamName,
      `${tb1.toFixed(1)}%`,
      `${tb2.toFixed(1)}%`,
      `${s.gpMargin.toFixed(1)}% (${s.gpPoints} pts)`,
      `${s.npMargin.toFixed(1)}% (${s.npPoints} pts)`,
      `${s.roe.toFixed(1)}% (${s.roePoints} pts)`,
      `${s.score} / ${s.maxScore} pts`
    ];
  });

  autoTable(doc, {
    startY: 25,
    head: [['Rank', 'Team Name', 'TB 1 (CSAT+ESAT)', 'TB 2 (FIN PCT)', 'GP % (Pts)', 'NP % (Pts)', 'ROE % (Pts)', 'Total Pts']],
    body: leagueRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 16, right: 16 }
  });

  // -------------------------------------------------------------
  // SLIDE 3: Cumulative Championship Leaderboard
  // -------------------------------------------------------------
  addSlideHeader('Cumulative Championship Leaderboard', 'Overall Class Standings');

  const cumScores = scoreCumulative(dataset.teams, dataset.period);
  const sortedCum = [...cumScores].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const teamA = dataset.teams.find(t => t.id === a.teamId);
    const teamB = dataset.teams.find(t => t.id === b.teamId);
    const tb1A = getCumCsatEsat(teamA, dataset.period);
    const tb1B = getCumCsatEsat(teamB, dataset.period);
    if (Math.abs(tb1B - tb1A) > 0.001) return tb1B - tb1A;
    return getCumFinancialPct(teamB, dataset.period) - getCumFinancialPct(teamA, dataset.period);
  });

  const cumRows = sortedCum.map((c, idx) => {
    const teamObj = dataset.teams.find(t => t.id === c.teamId);
    const tb1 = getCumCsatEsat(teamObj, dataset.period);
    const tb2 = getCumFinancialPct(teamObj, dataset.period);
    const rankLabel = idx === 0 ? '1st Champion' : idx === 1 ? '2nd Place' : idx === 2 ? '3rd Place' : `${idx + 1}`;

    return [
      rankLabel,
      c.teamName,
      `${tb1.toFixed(1)}%`,
      `${tb2.toFixed(1)}%`,
      c.byYear[1] !== undefined ? String(c.byYear[1]) : '-',
      c.byYear[2] !== undefined ? String(c.byYear[2]) : '-',
      c.byYear[3] !== undefined ? String(c.byYear[3]) : '-',
      `${c.total} pts`
    ];
  });

  autoTable(doc, {
    startY: 25,
    head: [['Rank', 'Team Name', 'TB 1 (CSAT+ESAT)', 'TB 2 (FIN PCT)', 'Year 1', 'Year 2', 'Year 3', 'Total Championship Score']],
    body: cumRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 16, right: 16 }
  });

  // -------------------------------------------------------------
  // SLIDE 4: Financial Performance
  // -------------------------------------------------------------
  addSlideHeader(`Financial Performance — Year ${dataset.period}`, 'Profitability & Returns');

  const finRows = dataset.teams.map(t => [
    t.name,
    formatCurrency(t.perf.totalRevenue),
    formatCurrency(t.perf.grossProfit),
    `${t.perf.gpMargin.toFixed(1)}%`,
    formatCurrency(t.perf.ebitda),
    formatCurrency(t.perf.netProfit),
    `${t.perf.npMargin.toFixed(1)}%`,
    `${t.perf.roe.toFixed(1)}%`
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Team Name', 'Total Revenue', 'Gross Profit', 'GP Margin %', 'EBITDA / Op Profit', 'Net Profit', 'NP Margin %', 'ROE %']],
    body: finRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    margin: { left: 16, right: 16 }
  });

  // -------------------------------------------------------------
  // SLIDE 5: Product Revenue & Market Share
  // -------------------------------------------------------------
  addSlideHeader(`Product Revenue & Market Share — Year ${dataset.period}`, 'Sales & Demand Mix');

  const prodRows = dataset.teams.map(t => {
    const tbShare = (t.perf.marketShare?.techbook || 0) * 100;
    const zrShare = (t.perf.marketShare?.zroid || 0) * 100;
    const itShare = (t.perf.marketShare?.itab || 0) * 100;
    const avgShare = (tbShare + zrShare + itShare) / 3;

    return [
      t.name,
      formatCurrency(t.perf.revenueByProduct.techbook || 0),
      `${tbShare.toFixed(1)}%`,
      formatCurrency(t.perf.revenueByProduct.zroid || 0),
      `${zrShare.toFixed(1)}%`,
      formatCurrency(t.perf.revenueByProduct.itab || 0),
      `${itShare.toFixed(1)}%`,
      `${avgShare.toFixed(1)}%`
    ];
  });

  autoTable(doc, {
    startY: 25,
    head: [['Team Name', 'TechBook Rev', 'TB Share', 'ZRoid Rev', 'ZR Share', 'iTab Rev', 'iTab Share', 'Avg Share']],
    body: prodRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    margin: { left: 16, right: 16 }
  });

  // -------------------------------------------------------------
  // SLIDE 6: Operations & HR Performance
  // -------------------------------------------------------------
  addSlideHeader(`Operations & Service KPIs — Year ${dataset.period}`, 'Operational Efficiency');

  const opsRows = dataset.teams.map(t => [
    t.name,
    formatPercent((t.perf as any)?.kpis?.utilization ?? 0.85, 1),
    formatPercent(t.record?.kpis?.employeeSatisfaction ?? (t.perf as any)?.kpis?.employeeSatisfaction ?? 0.70, 1),
    formatPercent(t.record?.kpis?.customerSatisfaction ?? (t.perf as any)?.kpis?.customerSatisfaction ?? 0.70, 1),
    formatPercent((t.perf as any)?.kpis?.deliveryReliability ?? 0.95, 1),
    formatPercent((t.perf as any)?.kpis?.brandReputation ?? 0.75, 1)
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Team Name', 'Plant Utilization', 'Employee Satisfaction', 'Customer Satisfaction', 'Delivery Reliability', 'Brand Reputation']],
    body: opsRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    margin: { left: 16, right: 16 }
  });

  // Save PDF file
  const fileName = `Techtabs_Debrief_Year_${dataset.period}_${(dataset.className || 'Class').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
};
