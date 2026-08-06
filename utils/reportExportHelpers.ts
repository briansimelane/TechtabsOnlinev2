import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportDataParams {
  className: string;
  period: number;
  activeTeams: string[];
  decisionsData: {
    marketing: { label: string; values: string[] }[];
    operations: { label: string; values: string[] }[];
    hr: { label: string; values: string[] }[];
    procurement: { label: string; values: string[] }[];
    finance: { label: string; values: string[] }[];
  } | null;
  performanceData: {
    income: { label: string; values: string[]; bold?: boolean; bg?: string }[];
    balance: { label: string; values: string[]; bold?: boolean; bg?: string }[];
    kpis: { label: string; values: string[] }[];
  } | null;
  marketData: {
    product: string;
    data: { criteria: string; rating: number | null; scores: string[]; bold?: boolean; bg?: string }[];
  }[] | null;
}

/**
 * Sanitizes cell text for CSV and PDF output (strips R currency symbol for compact single-line display)
 */
const cleanValue = (val: string): string => {
  if (!val) return '';
  let cleaned = val.replace(/\u00a0/g, ' ').trim();
  const isNegative = cleaned.startsWith('-') || cleaned.includes('-R') || cleaned.includes('R -');
  cleaned = cleaned.replace(/^[+-]?R\s?/, '').replace(/\s?R\s?/g, '').replace(/^-/, '').trim();
  return isNegative ? `-${cleaned}` : cleaned;
};

/**
 * Generates and triggers CSV download for single or combined Industry Reports
 */
export const exportReportCSV = (
  type: 'all' | 'decisions' | 'performance' | 'balance' | 'ratios' | 'market',
  params: ExportDataParams
) => {
  const { className, period, activeTeams, decisionsData, performanceData, marketData } = params;
  const timestamp = new Date().toISOString().split('T')[0];
  let csvContent = `Techtabs Simulation - Industry Reports\n`;
  csvContent += `Class: "${className}", Period: ${period}, Export Date: ${timestamp}\n\n`;

  const headers = ['Metric / Line Item', ...activeTeams];

  const appendTable = (title: string, rows: { label: string; values: string[] }[]) => {
    csvContent += `=== ${title.toUpperCase()} ===\n`;
    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
    rows.forEach(r => {
      const line = [`"${cleanValue(r.label)}"`, ...r.values.map(v => `"${cleanValue(v)}"`)];
      csvContent += line.join(',') + '\n';
    });
    csvContent += '\n';
  };

  if (type === 'all' || type === 'decisions') {
    if (decisionsData) {
      appendTable('Industry Decisions - Marketing', decisionsData.marketing);
      appendTable('Industry Decisions - Operations', decisionsData.operations);
      appendTable('Industry Decisions - HR', decisionsData.hr);
      appendTable('Industry Decisions - Procurement', decisionsData.procurement);
      appendTable('Industry Decisions - Finance', decisionsData.finance);
    }
  }

  if (type === 'all' || type === 'performance') {
    if (performanceData) {
      appendTable('Industry Performance - Income Statement', performanceData.income);
    }
  }

  if (type === 'all' || type === 'balance') {
    if (performanceData) {
      appendTable('Industry Performance - Balance Sheet', performanceData.balance);
    }
  }

  if (type === 'all' || type === 'ratios') {
    if (performanceData) {
      appendTable('Industry Performance - Financial Ratios & KPIs', performanceData.kpis);
    }
  }

  if (type === 'all' || type === 'market') {
    if (marketData) {
      marketData.forEach(p => {
        csvContent += `=== MARKET DATA - ${p.product.toUpperCase()} ===\n`;
        csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
        p.data.forEach(r => {
          const line = [`"${cleanValue(r.criteria)}"`, ...r.scores.map(s => `"${cleanValue(s)}"`)];
          csvContent += line.join(',') + '\n';
        });
        csvContent += '\n';
      });
    }
  }

  // Trigger file download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const filename = type === 'all' 
    ? `Industry_Reports_ALL_Period_${period}_${timestamp}.csv` 
    : `Industry_Report_${type.toUpperCase()}_Period_${period}_${timestamp}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates and triggers PDF download for single or combined Industry Reports
 */
export const exportReportPDF = (
  type: 'all' | 'decisions' | 'performance' | 'balance' | 'ratios' | 'market',
  params: ExportDataParams
) => {
  const { className, period, activeTeams, decisionsData, performanceData, marketData } = params;

  // Create A4 Landscape PDF for optimal multi-team table layout
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Page setup styling
  const primaryColor = [30, 41, 59] as [number, number, number]; // Slate-900

  const addPDFHeader = (docInstance: jsPDF, title: string) => {
    docInstance.setFontSize(15);
    docInstance.setTextColor(30, 41, 59);
    docInstance.setFont('helvetica', 'bold');
    docInstance.text('Techtabs Simulation — Industry Reports', 14, 14);

    docInstance.setFontSize(9.5);
    docInstance.setFont('helvetica', 'normal');
    docInstance.setTextColor(100, 116, 139);
    docInstance.text(`Class: ${className}   |   Period: ${period}   |   Report: ${title}`, 14, 21);

    docInstance.setLineWidth(0.5);
    docInstance.setDrawColor(226, 232, 240);
    docInstance.line(14, 24, 283, 24);
  };

  const headers = ['Metric / Line Item', ...activeTeams];
  const totalPrintableWidth = 269; // 297mm width - 28mm margins
  const equalColumnWidth = totalPrintableWidth / headers.length; // Equal column size across all columns

  let isFirstSection = true;

  const appendPDFTable = (sectionTitle: string, rows: { label: string; values: string[]; bold?: boolean }[]) => {
    if (!isFirstSection) {
      doc.addPage();
    }
    isFirstSection = false;

    addPDFHeader(doc, sectionTitle);

    const tableBody = rows.map(r => [
      cleanValue(r.label),
      ...r.values.map(v => cleanValue(v))
    ]);

    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: equalColumnWidth }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'middle',
        halign: 'center',
        overflow: 'linebreak',
        cellWidth: equalColumnWidth
      },
      didParseCell: (data) => {
        // Highlight bold rows or totals
        const rowData = rows[data.row.index];
        if (rowData && rowData.bold && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [248, 250, 252];
        }
      }
    });
  };

  if (type === 'all' || type === 'decisions') {
    if (decisionsData) {
      appendPDFTable('Industry Decisions — Marketing', decisionsData.marketing);
      appendPDFTable('Industry Decisions — Operations', decisionsData.operations);
      appendPDFTable('Industry Decisions — HR', decisionsData.hr);
      appendPDFTable('Industry Decisions — Procurement', decisionsData.procurement);
      appendPDFTable('Industry Decisions — Finance', decisionsData.finance);
    }
  }

  if (type === 'all' || type === 'performance') {
    if (performanceData) {
      appendPDFTable('Industry Performance — Income Statement', performanceData.income);
    }
  }

  if (type === 'all' || type === 'balance') {
    if (performanceData) {
      appendPDFTable('Industry Performance — Balance Sheet', performanceData.balance);
    }
  }

  if (type === 'all' || type === 'ratios') {
    if (performanceData) {
      appendPDFTable('Industry Performance — Financial Ratios & KPIs', performanceData.kpis);
    }
  }

  if (type === 'all' || type === 'market') {
    if (marketData) {
      marketData.forEach(p => {
        const rows = p.data.map(r => ({
          label: r.criteria,
          values: r.scores,
          bold: r.bold
        }));
        appendPDFTable(`Market Data — ${p.product}`, rows);
      });
    }
  }

  // Add page numbers footer (date removed, confidential phrase removed)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, 283 / 2, 203, { align: 'center' });
  }

  const filename = type === 'all'
    ? `Industry_Reports_ALL_Period_${period}.pdf`
    : `Industry_Report_${type.toUpperCase()}_Period_${period}.pdf`;

  doc.save(filename);
};
