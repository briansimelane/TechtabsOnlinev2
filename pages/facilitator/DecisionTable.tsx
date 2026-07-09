import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { PRODUCTS, SUPPLIERS, HR_ROLES, INITIAL_DECISIONS } from '../../constants';
import { formatNumber, formatCurrency, formatPercent } from '../../utils/numberFormat';
import { Team, TurnDecisions } from '../../types';
import { 
  Download, 
  FileSpreadsheet, 
  School, 
  Users, 
  Table,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

// HR Role label mapping for presentation
const HR_ROLE_LABELS: Record<string, string> = {
  engineers: 'Engineers',
  technicians: 'Technicians',
  semiSkilled: 'Semi-Skilled Workers',
  adminSales: 'Admin & Sales',
  customerService: 'Customer Service'
};

interface RowDef {
  label: string;
  getValue: (team: Team, decisions: TurnDecisions) => any;
  format: (val: any, decisions: TurnDecisions, team: Team) => React.ReactNode;
  formatRaw?: (val: any) => string | number;
  getStyle?: (val: any, decisions: TurnDecisions, team: Team) => string;
}

interface SectionDef {
  title: string;
  rows: RowDef[];
}

export default function DecisionTable() {
  const { currentClassId, classes, selectClass } = useSimulation();
  const currentClass = classes.find(c => c.id === currentClassId);

  // If no class is selected, show class selection empty state
  if (!currentClass) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Select a Class for Decision Table</h1>
          <p className="text-slate-500 mt-2">You need to select a simulation class to view live team decisions.</p>
        </div>
        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <button 
                key={cls.id}
                onClick={() => selectClass(cls.id)}
                className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left relative overflow-hidden shadow-sm w-full"
              >
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 mb-1 transition-colors">{cls.name}</h3>
                <code className="text-xs text-slate-400 mb-4 bg-slate-50 px-2 py-1 rounded">{cls.id}</code>
                <div className="w-full mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
                  <span className="flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                    Period {cls.currentPeriod}
                  </span>
                  <span className="flex items-center text-xs">
                    <Users size={14} className="mr-1 text-slate-400" />
                    {cls.teams?.length || 0} Teams
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <p className="text-slate-500 mb-6 text-lg">You haven't created any classes yet.</p>
            <a href="#/facilitator/classes" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
              Create Your First Class
            </a>
          </div>
        )}
      </div>
    );
  }

  const teams = currentClass.teams ?? [];
  const sortedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));

  // Build the data-driven sections and rows
  const sections: SectionDef[] = [
    {
      title: 'Team Info',
      rows: [
        {
          label: 'Team Name',
          getValue: (t) => t.name,
          format: (v) => v,
          formatRaw: (v) => v
        },
        {
          label: 'Team Code',
          getValue: (t) => t.code || currentClass.teamCodes?.[t.id] || t.id,
          format: (v) => v,
          formatRaw: (v) => v
        },
        {
          label: 'CEO Name',
          getValue: (t) => t.ceoName || '—',
          format: (v) => v,
          formatRaw: (v) => v
        },
        {
          label: 'Period',
          getValue: (t) => t.currentPeriod,
          format: (v) => v,
          formatRaw: (v) => v
        },
        {
          label: 'Status',
          getValue: (t) => t.status || 'In Progress',
          format: (v) => {
            const isSaved = v === 'Saved' || v === 'Ready' || v === 'Locked';
            return (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isSaved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {v}
              </span>
            );
          },
          formatRaw: (v) => v
        }
      ]
    },
    {
      title: 'Marketing & Sales',
      rows: [
        ...PRODUCTS.map(p => ({
          label: `Market Share: ${p.name}`,
          getValue: (t: Team, d: TurnDecisions) => d.marketing.forecastedMarketShare?.[p.id] ?? 0,
          format: (v: any) => formatPercent(v, 1, false),
          formatRaw: (v: any) => v / 100
        })),
        ...PRODUCTS.map(p => ({
          label: `Price: ${p.name}`,
          getValue: (t: Team, d: TurnDecisions) => d.marketing.prices?.[p.id] ?? 0,
          format: (v: any) => formatNumber(v, 0),
          formatRaw: (v: any) => v
        })),
        {
          label: 'Advertising Budget',
          getValue: (t, d) => d.marketing.advertisingBudget,
          format: (v) => formatCurrency(v, 0),
          formatRaw: (v) => v
        },
        ...PRODUCTS.map(p => ({
          label: `Advertising Split: ${p.name}`,
          getValue: (t: Team, d: TurnDecisions) => d.marketing.adSplits?.[p.id] ?? 0,
          format: (v: any) => formatPercent(v, 0, true),
          formatRaw: (v: any) => v
        })),
        {
          label: 'Advertising Split: General',
          getValue: (t, d) => d.marketing.generalAdSplit,
          format: (v) => formatPercent(v, 0, true),
          formatRaw: (v) => v
        },
        {
          label: 'Company Stores (Open/Close)',
          getValue: (t, d) => d.marketing.openCloseStores,
          format: (v) => v > 0 ? `+${v}` : `${v}`,
          formatRaw: (v) => v
        },
        {
          label: 'Agent Commission',
          getValue: (t, d) => d.marketing.agentCommission,
          format: (v) => formatPercent(v, 2, true),
          formatRaw: (v) => v
        }
      ]
    },
    {
      title: 'Operations',
      rows: [
        ...PRODUCTS.map(p => ({
          label: `Production: ${p.name}`,
          getValue: (t: Team, d: TurnDecisions) => d.operations.production?.[p.id] ?? 0,
          format: (v: any) => formatNumber(v, 0),
          formatRaw: (v: any) => v
        })),
        ...PRODUCTS.map(p => ({
          label: `Req. Finished Goods: ${p.name}`,
          getValue: (t: Team, d: TurnDecisions) => d.operations.reqFinishedGoods?.[p.id] ?? 0,
          format: (v: any) => formatNumber(v, 0),
          formatRaw: (v: any) => v
        })),
        {
          label: 'Capacity Change',
          getValue: (t, d) => d.operations.capacityChange,
          format: (v) => v > 0 ? `+${formatNumber(v)}` : formatNumber(v),
          formatRaw: (v) => v
        },
        {
          label: 'Innovation Budget',
          getValue: (t, d) => d.operations.rdBudget,
          format: (v) => formatCurrency(v, 0),
          formatRaw: (v) => v
        },
        ...PRODUCTS.map(p => ({
          label: `Innovation Split: ${p.name}`,
          getValue: (t: Team, d: TurnDecisions) => d.operations.rdSplits?.[p.id] ?? 0,
          format: (v: any) => formatPercent(v, 0, true),
          formatRaw: (v: any) => v
        }))
      ]
    },
    {
      title: 'Procurement — Negotiation',
      rows: [
        {
          label: 'Preferred Supplier',
          getValue: (t, d) => d.negotiation?.selectedSupplierId || '—',
          format: (v) => v,
          formatRaw: (v) => v
        },
        {
          label: 'Negotiation Status',
          getValue: (t, d) => d.negotiation?.status || 'NOT_STARTED',
          format: (v) => v,
          formatRaw: (v) => v
        },
        {
          label: 'Agreed Discount',
          getValue: (t, d) => d.negotiation?.status === 'AGREED' ? d.negotiation.agreedDiscount : '—',
          format: (v) => typeof v === 'number' ? formatPercent(v, 2, true) : '—',
          formatRaw: (v) => typeof v === 'number' ? v : ''
        },
        {
          label: 'Agreed Payment Terms',
          getValue: (t, d) => d.negotiation?.status === 'AGREED' ? d.negotiation.agreedPaymentTerms : '—',
          format: (v) => typeof v === 'number' ? `${v} days` : '—',
          formatRaw: (v) => typeof v === 'number' ? v : ''
        }
      ]
    },
    // Supplier Allocations dynamically generated per product
    ...PRODUCTS.map(p => ({
      title: `Procurement — Supplier Allocation — ${p.name}`,
      rows: [
        ...SUPPLIERS.flatMap(s => [
          {
            label: `${s}: Components`,
            getValue: (t: Team, d: TurnDecisions) => d.procurement?.supplierAllocation?.[p.id]?.[s]?.components ?? 0,
            format: (v: any) => formatNumber(v, 0),
            formatRaw: (v: any) => v
          },
          {
            label: `${s}: Finished Goods`,
            getValue: (t: Team, d: TurnDecisions) => d.procurement?.supplierAllocation?.[p.id]?.[s]?.finishedGoods ?? 0,
            format: (v: any) => formatNumber(v, 0),
            formatRaw: (v: any) => v
          }
        ]),
        {
          label: 'Total Components Allocated',
          getValue: (t: Team, d: TurnDecisions) => SUPPLIERS.reduce((sum, s) => sum + (d.procurement?.supplierAllocation?.[p.id]?.[s]?.components ?? 0), 0),
          format: (v: any, d: TurnDecisions) => {
            const required = d.operations.production?.[p.id] ?? 0;
            const isMismatch = v !== required;
            return (
              <span className={isMismatch ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                {formatNumber(v, 0)} {isMismatch && `(target: ${formatNumber(required)})`}
              </span>
            );
          },
          formatRaw: (v: any) => v,
          getStyle: (v: any, d: TurnDecisions) => {
            const required = d.operations.production?.[p.id] ?? 0;
            return v !== required ? 'bg-red-50 text-red-700 font-bold' : 'bg-emerald-50 text-emerald-700 font-bold';
          }
        },
        {
          label: 'Total Finished Goods Allocated',
          getValue: (t: Team, d: TurnDecisions) => SUPPLIERS.reduce((sum, s) => sum + (d.procurement?.supplierAllocation?.[p.id]?.[s]?.finishedGoods ?? 0), 0),
          format: (v: any, d: TurnDecisions) => {
            const required = d.operations.reqFinishedGoods?.[p.id] ?? 0;
            const isMismatch = v !== required;
            return (
              <span className={isMismatch ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                {formatNumber(v, 0)} {isMismatch && `(target: ${formatNumber(required)})`}
              </span>
            );
          },
          formatRaw: (v: any) => v,
          getStyle: (v: any, d: TurnDecisions) => {
            const required = d.operations.reqFinishedGoods?.[p.id] ?? 0;
            return v !== required ? 'bg-red-50 text-red-700 font-bold' : 'bg-emerald-50 text-emerald-700 font-bold';
          }
        }
      ]
    })),
    {
      title: 'Human Resources',
      rows: [
        ...HR_ROLES.flatMap(role => [
          {
            label: `${HR_ROLE_LABELS[role] || role}: Recruit/(Dismiss)`,
            getValue: (t: Team, d: TurnDecisions) => d.hr.hiring?.[role] ?? 0,
            format: (v: any) => v > 0 ? `+${v}` : `${v}`,
            formatRaw: (v: any) => v
          },
          {
            label: `${HR_ROLE_LABELS[role] || role}: Salary`,
            getValue: (t: Team, d: TurnDecisions) => d.hr.salaries?.[role] ?? 0,
            format: (v: any) => formatCurrency(v, 0),
            formatRaw: (v: any) => v
          },
          {
            label: `${HR_ROLE_LABELS[role] || role}: Training`,
            getValue: (t: Team, d: TurnDecisions) => d.hr.trainingLevels?.[role] ?? 'None',
            format: (v: any) => v,
            formatRaw: (v: any) => v
          }
        ])
      ]
    },
    {
      title: 'Finance',
      rows: [
        ...PRODUCTS.map(p => ({
          label: `Debtor Days: ${p.name}`,
          getValue: (t: Team, d: TurnDecisions) => d.finance.debtorsDays?.[p.id] ?? 0,
          format: (v: any) => typeof v === 'number' ? `${v} days` : '—',
          formatRaw: (v: any) => v
        })),
        {
          label: 'Dividends',
          getValue: (t, d) => d.finance.dividends,
          format: (v) => formatCurrency(v, 0),
          formatRaw: (v) => v
        },
        {
          label: 'Debt (Raise/Pay)',
          getValue: (t, d) => d.finance.debtChange,
          format: (v) => v > 0 ? `+${formatCurrency(v)}` : formatCurrency(v),
          formatRaw: (v) => v
        },
        {
          label: 'Equity (Raise/Retire)',
          getValue: (t, d) => d.finance.equityChange,
          format: (v) => v > 0 ? `+${formatCurrency(v)}` : formatCurrency(v),
          formatRaw: (v) => v
        }
      ]
    }
  ];

  // Helper to generate filename
  const getFilenamePrefix = () => {
    const sanitised = currentClass.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const today = new Date().toISOString().split('T')[0];
    return `${sanitised}_P${currentClass.currentPeriod}_decisions_${today}`;
  };

  // Export to CSV
  const handleDownloadCSV = () => {
    const headers = ['Decision', ...sortedTeams.map(t => t.name)];
    const csvRows = [headers];

    sections.forEach(sec => {
      // Section header row
      csvRows.push([sec.title, ...sortedTeams.map(() => '')]);
      
      sec.rows.forEach(row => {
        const rowCells = [row.label];
        sortedTeams.forEach(t => {
          const decisions = t.draftDecisions || INITIAL_DECISIONS;
          const rawVal = row.getValue(t, decisions);
          if (rawVal === undefined || rawVal === null || rawVal === '—') {
            rowCells.push('');
          } else if (row.formatRaw) {
            rowCells.push(String(row.formatRaw(rawVal)));
          } else {
            rowCells.push(String(rawVal));
          }
        });
        csvRows.push(rowCells);
      });
    });

    const csvContent = csvRows.map(row => 
      row.map(cell => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${getFilenamePrefix()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const handleDownloadExcel = () => {
    const headers = ['Decision', ...sortedTeams.map(t => t.name)];
    const aoa = [headers];

    sections.forEach(sec => {
      // Add section title as its own row
      aoa.push([sec.title, ...sortedTeams.map(() => '')]);
      
      sec.rows.forEach(row => {
        const rowCells = [row.label];
        sortedTeams.forEach(t => {
          const decisions = t.draftDecisions || INITIAL_DECISIONS;
          const rawVal = row.getValue(t, decisions);
          if (rawVal === undefined || rawVal === null || rawVal === '—') {
            rowCells.push('');
          } else if (row.formatRaw) {
            rowCells.push(row.formatRaw(rawVal));
          } else {
            rowCells.push(rawVal);
          }
        });
        aoa.push(rowCells);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    
    // Set widths: wider first column, normal widths for team columns
    const colWidths = [
      { wch: 38 }, // Decision label width
      ...sortedTeams.map(() => ({ wch: 18 }))
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Decisions');
    XLSX.writeFile(wb, `${getFilenamePrefix()}.xlsx`);
  };

  return (
    <div className="max-w-[96vw] mx-auto py-8 px-4">
      {/* Header Info Card */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Decision Table</h1>
            
            {/* Live Status Indicator */}
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            Class: <span className="font-semibold text-slate-700">{currentClass.name}</span> &bull; 
            Period {currentClass.currentPeriod} &bull; 
            Showing live draft decisions
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download size={16} />
            Download CSV
          </button>
          
          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <FileSpreadsheet size={16} />
            Download Excel
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-w-full">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-20">
            <tr>
              <th scope="col" className="py-3 px-4 font-semibold text-slate-700 bg-slate-50 border-b border-slate-200 sticky left-0 z-30 min-w-[320px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                Decision
              </th>
              {sortedTeams.map(t => {
                const isDefault = !t.draftDecisions;
                return (
                  <th key={t.id} scope="col" className="py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 min-w-[180px]">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-base">{t.name}</span>
                      <span className="text-xs text-slate-400 font-normal">ID: {t.id}</span>
                      {isDefault && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold mt-1.5 w-max">
                          Using Defaults
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sections.map(sec => (
              <React.Fragment key={sec.title}>
                {/* Section Header Row */}
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <td colSpan={sortedTeams.length + 1} className="py-2.5 px-4 sticky left-0 z-10 bg-slate-100 border-y border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    {sec.title}
                  </td>
                </tr>
                {sec.rows.map(row => (
                  <tr key={row.label} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-4 font-medium text-slate-700 border-r border-slate-100 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-sm">
                      {row.label}
                    </td>
                    {sortedTeams.map(t => {
                      const decisions = t.draftDecisions || INITIAL_DECISIONS;
                      const rawVal = row.getValue(t, decisions);
                      const isDefault = !t.draftDecisions;
                      const formatted = row.format(rawVal, decisions, t);
                      const customStyle = row.getStyle ? row.getStyle(rawVal, decisions, t) : '';
                      
                      return (
                        <td 
                          key={t.id} 
                          className={`py-2 px-4 font-mono text-xs border-r border-slate-100 ${
                            isDefault ? 'text-slate-400 font-normal bg-slate-50/40' : 'text-slate-900 font-semibold'
                          } ${customStyle}`}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info Callout */}
      <div className="mt-4 flex items-start gap-2 text-slate-400 text-xs px-2">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
        <p>
          Cells highlighted in red under <strong>Procurement Allocation</strong> indicate that the allocated volume (components or finished goods) does not match the required production/finished goods volumes set in the Operations plan.
        </p>
      </div>
    </div>
  );
}
