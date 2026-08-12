import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ClassMarksResult, TeamMarksResult, MARK_KPIS, BASE_CRITERIA, SupplierQualityBreakdown } from './marksEngine';
import { SimulationClass, MarksConfig } from '../types';
import { formatCurrency, formatNumber, formatPercent } from './numberFormat';

interface PdfOptions {
  includeQualityAppendix?: boolean;
}

export function getTeamPdfFilename(classObj: SimulationClass, teamResult: TeamMarksResult): string {
  const cleanClassName = classObj.name.replace(/[/\\?%*:|"<>]/g, '').trim();
  return `T${teamResult.groupNumber} ${cleanClassName} Results.pdf`;
}

export function generateTeamMarksPdf(
  classObj: SimulationClass,
  classResult: ClassMarksResult,
  teamResult: TeamMarksResult,
  config: MarksConfig,
  options: PdfOptions = { includeQualityAppendix: true }
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Block
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('ASSIGNMENTS - In Class Business Simulation', margin, 16);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(classObj.name, margin, 21);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Group Number: T${teamResult.groupNumber}    Group Name: ${teamResult.teamName}`, margin, 27);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const periodText = teamResult.scoringPeriod ? `Period ${teamResult.scoringPeriod}` : 'N/A';
  doc.text(`Scoring period: ${periodText}    Generated: ${dateStr}`, margin, 32);

  // Note for Rank Score (Ascending explanation)
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`* Rank score is ascending: Rank 1 = lowest performance, Rank ${classResult.activeTeamCount} = highest performance (higher rank = more marks awarded).`, margin, 36);

  let currentY = 38;

  const formatKpiValue = (key: string, val: number) => {
    switch (key) {
      case 'grossProfitPct':
      case 'netProfitPct':
      case 'roe':
      case 'csat':
      case 'esat':
        return formatPercent(val, 1);
      case 'accRevenue':
      case 'accInnovation':
        return formatCurrency(val, 0);
      case 'capacity':
        return formatNumber(val, 0);
      case 'quality':
        return val.toFixed(1);
      default:
        return formatNumber(val, 0);
    }
  };

  // Table 1: Criteria Reviewed
  const table1Data = MARK_KPIS.map(kpi => {
    const val = teamResult.values[kpi.key];
    const rank = teamResult.ranks[kpi.key];
    return [kpi.label, formatKpiValue(kpi.key, val), teamResult.hasResults ? String(rank) : '-'];
  });

  table1Data.push([
    'Bank Balance',
    formatCurrency(teamResult.bankBalance, 0),
    '-',
  ]);
  table1Data.push([
    'Missed Sales',
    formatNumber(teamResult.missedSales, 0),
    '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Criteria Reviewed', 'Value', `Rank Score (1..${classResult.activeTeamCount})`]],
    body: table1Data,
    theme: 'grid',
    styles: { cellPadding: 1.1, fontSize: 7.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: 'right', cellWidth: 50 },
      2: { halign: 'center', cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Table 2: MARK CALCULATION (Base Marks)
  const passStr = `${(config.csatHurdle * 100).toFixed(0)}`;
  const failStr = `${config.baseMarkFail}`;
  const passMarkVal = config.baseMarkPass;

  const table2Data = BASE_CRITERIA.map(crit => {
    let label: string = crit.label;
    if (crit.key === 'csatHurdle') label = `Customer Satisfaction >= ${passStr}%`;
    if (crit.key === 'esatHurdle') label = `Employee Satisfaction >= ${(config.esatHurdle * 100).toFixed(0)}%`;

    const res = teamResult.baseResults[crit.key];
    return [label, teamResult.hasResults ? `${res.mark}` : '-'];
  });

  table2Data.push(['Total Base Mark', teamResult.hasResults ? `${teamResult.totalBase}` : '-']);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[`Base Mark: (${passMarkVal}% if Ok, ${failStr}% if not)`, 'Mark']],
    body: table2Data,
    theme: 'grid',
    styles: { cellPadding: 1.1, fontSize: 7.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 145 },
      1: { halign: 'right', cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.row.index === table2Data.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Table 3: Additional Marks based on Rank
  const table3Data = MARK_KPIS.map(kpi => {
    const addMark = teamResult.additionalMarks[kpi.key];
    return [kpi.label, teamResult.hasResults ? `${addMark}` : '-'];
  });
  table3Data.push(['Total additional marks', teamResult.hasResults ? `${teamResult.totalAdditional}` : '-']);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Additional marks based on Rank', 'Mark']],
    body: table3Data,
    theme: 'grid',
    styles: { cellPadding: 1.1, fontSize: 7.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 145 },
      1: { halign: 'right', cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.row.index === table3Data.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Table 4: Summary & Total
  const table4Data = [
    ['Class Adjustment (All Teams)', `${teamResult.classAdjustment}`],
    ['TOTAL GROUP MARKS', `${teamResult.total} / ${classResult.maxAttainable}`],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: table4Data,
    theme: 'grid',
    styles: { cellPadding: 1.3, fontSize: 8, textColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 145 },
      1: { halign: 'right', cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.row.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
        data.cell.styles.fillColor = [224, 242, 254]; // sky-100
        data.cell.styles.textColor = [3, 105, 161]; // sky-700
      }
    },
  });

  // Appendix (Page 2): Quality Breakdown
  if (options.includeQualityAppendix) {
    doc.addPage();

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Appendix: Supplier Evaluation for Quality Breakdown', margin, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Quality is calculated from each team\'s current procurement allocation and negotiated supplier terms.',
      margin,
      24
    );

    const qb = teamResult.qualityBreakdown;
    const qData: string[][] = [];

    for (const s of ['Alpha', 'Neepo', 'Zen', 'Cheng']) {
      const sp = qb.perSupplier[s];
      if (sp) {
        qData.push([
          s,
          formatNumber(sp.componentUnits, 0),
          formatCurrency(sp.componentValue, 0),
          formatNumber(sp.finishedGoodsUnits, 0),
          formatCurrency(sp.finishedGoodsValue, 0),
          formatNumber(sp.weight, 0),
          formatPercent(sp.weightShare, 1),
          sp.quality.toFixed(1),
          sp.contribution.toFixed(1),
        ]);
      }
    }

    qData.push([
      'Total / Average',
      '-',
      '-',
      '-',
      '-',
      formatNumber(qb.totalWeight, 0),
      '100.0%',
      '-',
      qb.quality.toFixed(1),
    ]);

    autoTable(doc, {
      startY: 28,
      margin: { left: margin, right: margin },
      head: [['Supplier', 'Comp Units', 'Comp Value', 'FG Units', 'FG Value', 'Weight', 'Share', 'Quality', 'Contrib']],
      body: qData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'center' },
        8: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.row.index === qData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      },
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `${classObj.name}  ·  ${teamResult.teamName}  ·  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  return doc;
}

export async function exportAllTeamPdfs(
  classObj: SimulationClass,
  classResult: ClassMarksResult,
  config: MarksConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  const scoredTeams = classResult.teams;
  const total = scoredTeams.length;

  for (let i = 0; i < total; i++) {
    const teamRes = scoredTeams[i];
    if (onProgress) onProgress(i + 1, total);

    const doc = generateTeamMarksPdf(classObj, classResult, teamRes, config);
    const filename = getTeamPdfFilename(classObj, teamRes);
    doc.save(filename);

    // Yield control to browser to prevent blocked downloads
    await new Promise(r => setTimeout(r, 250));
  }
}

export function exportMarksXlsx(
  classObj: SimulationClass,
  classResult: ClassMarksResult,
  config: MarksConfig
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Marks Summary
  const headerRow = ['Criterion', ...classResult.teams.map(t => t.teamName)];

  const summaryRows: (string | number)[][] = [
    headerRow,
    ['--- PERFORMANCE KPIS ---'],
  ];

  for (const kpi of MARK_KPIS) {
    const rowData: (string | number)[] = [kpi.label];
    for (const t of classResult.teams) {
      if (!t.hasResults) {
        rowData.push('No results');
      } else {
        const val = t.values[kpi.key];
        const rank = t.ranks[kpi.key];
        rowData.push(`${val} (Rank ${rank})`);
      }
    }
    summaryRows.push(rowData);
  }

  summaryRows.push([
    'Bank Balance',
    ...classResult.teams.map(t => t.hasResults ? t.bankBalance : 'No results'),
  ]);
  summaryRows.push([
    'Missed Sales',
    ...classResult.teams.map(t => t.hasResults ? t.missedSales : 'No results'),
  ]);

  summaryRows.push(['--- BASE MARKS ---']);
  for (const crit of BASE_CRITERIA) {
    const rowData: (string | number)[] = [crit.label];
    for (const t of classResult.teams) {
      if (!t.hasResults) {
        rowData.push('-');
      } else {
        const res = t.baseResults[crit.key];
        rowData.push(`${res.mark} (${res.passed ? 'Pass' : 'Fail'})`);
      }
    }
    summaryRows.push(rowData);
  }

  summaryRows.push([
    'Total Base Mark',
    ...classResult.teams.map(t => t.hasResults ? t.totalBase : '-'),
  ]);

  summaryRows.push(['--- ADDITIONAL MARKS (RANK-BASED) ---']);
  for (const kpi of MARK_KPIS) {
    const rowData: (string | number)[] = [kpi.label];
    for (const t of classResult.teams) {
      rowData.push(t.hasResults ? t.additionalMarks[kpi.key] : '-');
    }
    summaryRows.push(rowData);
  }

  summaryRows.push([
    'Total Additional Marks',
    ...classResult.teams.map(t => t.hasResults ? t.totalAdditional : '-'),
  ]);

  summaryRows.push([
    'Class Adjustment',
    ...classResult.teams.map(t => t.classAdjustment),
  ]);

  summaryRows.push([
    'TOTAL GROUP MARKS',
    ...classResult.teams.map(t => t.total),
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Marks Summary');

  // Sheet 2: Quality Breakdown
  const qRows: (string | number)[][] = [
    ['Team Name', 'Supplier', 'Comp Units', 'Comp Value (R)', 'FG Units', 'FG Value (R)', 'Weight', 'Share (%)', 'Quality', 'Contribution'],
  ];

  for (const t of classResult.teams) {
    const qb = t.qualityBreakdown;
    for (const s of ['Alpha', 'Neepo', 'Zen', 'Cheng']) {
      const sp = qb.perSupplier[s];
      if (sp) {
        qRows.push([
          t.teamName,
          s,
          sp.componentUnits,
          sp.componentValue,
          sp.finishedGoodsUnits,
          sp.finishedGoodsValue,
          sp.weight,
          (sp.weightShare * 100).toFixed(1),
          sp.quality.toFixed(1),
          sp.contribution.toFixed(1),
        ]);
      }
    }
    qRows.push([
      `${t.teamName} (Total)`,
      'ALL',
      '-',
      '-',
      '-',
      '-',
      qb.totalWeight,
      '100.0%',
      '-',
      qb.quality.toFixed(1),
    ]);
  }

  const wsQuality = XLSX.utils.aoa_to_sheet(qRows);
  XLSX.utils.book_append_sheet(wb, wsQuality, 'Quality Breakdown');

  // Sheet 3: Settings
  const settingsRows: (string | number)[][] = [
    ['Setting', 'Value'],
    ['Base Mark Pass', config.baseMarkPass],
    ['Base Mark Fail', config.baseMarkFail],
    ['Customer Satisfaction Hurdle (%)', (config.csatHurdle * 100).toFixed(1)],
    ['Employee Satisfaction Hurdle (%)', (config.esatHurdle * 100).toFixed(1)],
    ['Active Team Count Override', config.activeTeamCountOverride ?? 'Auto'],
    ['Active Team Count Used', classResult.activeTeamCount],
    ['Rank Divisor', classResult.divisor],
    ['Additional Marks Scale', config.additionalMarksScale],
    ['Missed Sales Basis', config.missedSalesBasis],
    ['Scoring Period', classResult.scoringPeriod ?? 1],
  ];

  const wsSettings = XLSX.utils.aoa_to_sheet(settingsRows);
  XLSX.utils.book_append_sheet(wb, wsSettings, 'Settings');

  const filename = `GroupMarks_${sanitizeFilename(classObj.name)}_P${classResult.scoringPeriod ?? 1}.xlsx`;
  XLSX.writeFile(wb, filename);
}
