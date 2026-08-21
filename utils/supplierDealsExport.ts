import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatNumber } from './numberFormat';

export interface SupplierDealRecord {
  teamName: string;
  supplierId: string;
  year: number;
  status: string;
  paymentTerms: number;
  quality: number;
  leadTime: number;
  service: number;
  capacity: number;
  innovation: number;
  techbookComp: number;
  zroidComp: number;
  itabComp: number;
  techbookFg: number;
  zroidFg: number;
  itabFg: number;
  techbookCompUnits: number;
  techbookFgUnits: number;
  techbookTotalUnits: number;
  techbookSharePct: number;
  zroidCompUnits: number;
  zroidFgUnits: number;
  zroidTotalUnits: number;
  zroidSharePct: number;
  itabCompUnits: number;
  itabFgUnits: number;
  itabTotalUnits: number;
  itabSharePct: number;
}

interface ExportSupplierDealsParams {
  className: string;
  period: number;
  deals: SupplierDealRecord[];
}

const formatAllocCsv = (compUnits: number, fgUnits: number, totalUnits: number, sharePct: number): string => {
  if (!totalUnits) return '0 (0%)';
  return `${formatNumber(totalUnits, 0)} (${Math.round(sharePct)}% | Comp: ${formatNumber(compUnits, 0)}, FG: ${formatNumber(fgUnits, 0)})`;
};

const formatAllocPdf = (compUnits: number, fgUnits: number, totalUnits: number, sharePct: number): string => {
  if (!totalUnits) return '0 (0%)';
  return `${formatNumber(totalUnits, 0)} (${Math.round(sharePct)}%)\n[C:${formatNumber(compUnits, 0)} / FG:${formatNumber(fgUnits, 0)}]`;
};

/**
 * Generates and triggers CSV download for Supplier Deals Report
 */
export const exportSupplierDealsCSV = (params: ExportSupplierDealsParams) => {
  const { className, period, deals } = params;
  const timestamp = new Date().toISOString().split('T')[0];

  let csvContent = `Techtabs Simulation - Supplier Deals & Negotiations Report\n`;
  csvContent += `Class: "${className}", Year / Period: ${period}, Export Date: ${timestamp}\n\n`;

  const headers = [
    'Team',
    'Supplier',
    'Status',
    'Terms (Days)',
    'Quality (1-10)',
    'Lead Time (1-10)',
    'Service (1-10)',
    'Capacity (1-10)',
    'Innovation (1-10)',
    'TechBook Comp Price (R)',
    'Zroid Comp Price (R)',
    'iTab Comp Price (R)',
    'TechBook FG Price (R)',
    'Zroid FG Price (R)',
    'iTab FG Price (R)',
    'TechBook Procurement (Comp + FG)',
    'Zroid Procurement (Comp + FG)',
    'iTab Procurement (Comp + FG)'
  ];

  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

  deals.forEach(d => {
    const row = [
      `"${d.teamName}"`,
      `"${d.supplierId}"`,
      `"${d.status.replace('_', ' ')}"`,
      `"${d.paymentTerms}d"`,
      `"${d.quality}/10"`,
      `"${d.leadTime}/10"`,
      `"${d.service}/10"`,
      `"${d.capacity}/10"`,
      `"${d.innovation}/10"`,
      `"${formatCurrency(d.techbookComp, 0)}"`,
      `"${formatCurrency(d.zroidComp, 0)}"`,
      `"${formatCurrency(d.itabComp, 0)}"`,
      `"${formatCurrency(d.techbookFg, 0)}"`,
      `"${formatCurrency(d.zroidFg, 0)}"`,
      `"${formatCurrency(d.itabFg, 0)}"`,
      `"${formatAllocCsv(d.techbookCompUnits, d.techbookFgUnits, d.techbookTotalUnits, d.techbookSharePct)}"`,
      `"${formatAllocCsv(d.zroidCompUnits, d.zroidFgUnits, d.zroidTotalUnits, d.zroidSharePct)}"`,
      `"${formatAllocCsv(d.itabCompUnits, d.itabFgUnits, d.itabTotalUnits, d.itabSharePct)}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Supplier_Deals_Report_${className.replace(/\s+/g, '_')}_Period_${period}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates and triggers PDF download for Supplier Deals Report
 */
export const exportSupplierDealsPDF = (params: ExportSupplierDealsParams) => {
  const { className, period, deals } = params;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.text('Techtabs Simulation — Supplier Deals & Negotiations Report', 14, 14);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Class: ${className}   |   Period: ${period}   |   Total Deal Records: ${deals.length}`, 14, 21);

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 24, 283, 24);

  const headers = [
    'Team',
    'Supplier',
    'Status',
    'Terms',
    'Qual',
    'LeadT',
    'Serv',
    'Cap',
    'Innov',
    'TB Comp',
    'ZR Comp',
    'iT Comp',
    'TB FG',
    'ZR FG',
    'iT FG',
    'TB Orders',
    'ZR Orders',
    'iT Orders'
  ];

  const body = deals.map(d => [
    d.teamName,
    d.supplierId,
    d.status.replace('_', ' '),
    `${d.paymentTerms}d`,
    `${d.quality}`,
    `${d.leadTime}`,
    `${d.service}`,
    `${d.capacity}`,
    `${d.innovation}`,
    formatCurrency(d.techbookComp, 0),
    formatCurrency(d.zroidComp, 0),
    formatCurrency(d.itabComp, 0),
    formatCurrency(d.techbookFg, 0),
    formatCurrency(d.zroidFg, 0),
    formatCurrency(d.itabFg, 0),
    formatAllocPdf(d.techbookCompUnits, d.techbookFgUnits, d.techbookTotalUnits, d.techbookSharePct),
    formatAllocPdf(d.zroidCompUnits, d.zroidFgUnits, d.zroidTotalUnits, d.zroidSharePct),
    formatAllocPdf(d.itabCompUnits, d.itabFgUnits, d.itabTotalUnits, d.itabSharePct)
  ]);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle'
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      valign: 'middle',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { fontStyle: 'bold' }
    }
  });

  // Page Numbers Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, 283 / 2, 203, { align: 'center' });
  }

  doc.save(`Supplier_Deals_Report_${className.replace(/\s+/g, '_')}_Period_${period}.pdf`);
};
