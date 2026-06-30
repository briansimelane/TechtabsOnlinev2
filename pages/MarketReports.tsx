import React, { useState } from 'react';
import { 
  BarChart2, 
  Layers, 
  TrendingUp, 
  Table 
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../utils/numberFormat';

type Tab = 'decisions' | 'performance' | 'marketData';

const MarketReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('decisions');
  const [selectedMobileTeam, setSelectedMobileTeam] = useState<number>(0);

  const teams = [
    "Till the end of Chart",
    "The Vault",
    "CTRL + ALT + ELITE",
    "The Exchange",
    "Maverick Minds"
  ];

  // --- Mock Data Helpers ---

  // INDUSTRY DECISIONS DATA
  const decisionsData = {
      marketing: [
          { label: 'Market Share : TechBook', values: ['30.0%', '20.0%', '26.0%', '20.0%', '17.0%'] },
          { label: 'Market Share : Zroid', values: ['25.0%', '21.0%', '22.0%', '18.7%', '18.0%'] },
          { label: 'Market Share : iTab', values: ['20.0%', '20.5%', '24.0%', '18.7%', '18.0%'] },
          { label: 'Forecasted Units : TechBook', values: ['56 276', '37 518', '48 773', '37 518', '31 890'] },
          { label: 'Forecasted Units : Zroid', values: ['65 061', '54 651', '57 253', '48 665', '46 844'] },
          { label: 'Forecasted Units : iTab', values: ['25 512', '26 150', '30 614', '23 854', '22 961'] },
          { label: 'Price : TechBook', values: ['R 2 800', 'R 3 200', 'R 2 400', 'R 3 100', 'R 3 200'] },
          { label: 'Price : Zroid', values: ['R 4 500', 'R 4 800', 'R 5 400', 'R 4 900', 'R 5 200'] },
          { label: 'Price : iTab', values: ['R 7 000', 'R 5 900', 'R 7 400', 'R 6 999', 'R 7 200'] },
          { label: 'Advertising Budget', values: ['R 25 051 494', 'R 25 051 494', 'R 30 000 000', 'R 25 000 000', 'R 25 051 494'] },
          { label: 'Advertising : TechBook', values: ['35.0%', '35.0%', '15.0%', '30.0%', '10.0%'] },
          { label: 'Advertising : Zroid', values: ['30.0%', '30.0%', '45.0%', '20.0%', '39.0%'] },
          { label: 'Advertising : iTab', values: ['25.0%', '35.0%', '30.0%', '30.0%', '41.0%'] },
          { label: 'Advertising : General', values: ['10.0%', '0.0%', '10.0%', '20.0%', '10.0%'] },
          { label: 'Company stores (Open / Close)', values: ['0', '0', '1', '0', '0'] },
          { label: 'Agent Commission', values: ['1.5%', '2.0%', '2.2%', '2.0%', '1.5%'] },
      ],
      operations: [
          { label: 'TechBook : Units produced', values: ['17 000', '13 225', '15 000', '45', '15 000'] },
          { label: 'Zroid : Units produced', values: ['13 000', '12 000', '15 000', '10 000', '15 000'] },
          { label: 'iTab : Units produced', values: ['10 000', '14 775', '10 000', '15 000', '10 000'] },
          { label: 'Production Capacity Change', values: ['10 000', '10 000', '10 000', '54 500', '-'] },
          { label: 'Innovation Budget', values: ['R 15 055 857', 'R 15 055 857', 'R 35 000 000', 'R 26 000 000', 'R 20 000 000'] },
          { label: 'TechBook : Innovation', values: ['30.0%', '35.0%', '20.0%', '30.0%', '35.0%'] },
          { label: 'Zroid : Innovation', values: ['25.0%', '35.0%', '30.0%', '25.0%', '25.0%'] },
          { label: 'iTab : Innovation', values: ['45.0%', '30.0%', '50.0%', '45.0%', '40.0%'] },
          { label: 'TechBook : Features', values: ['1', '2', '2', '3', '2'] },
          { label: 'Zroid : Features', values: ['1', '2', '3', '2', '2'] },
          { label: 'iTab : Features', values: ['2', '1', '6', '4', '3'] },
      ],
      procurement: [
          { label: 'Alpha : Quality', values: ['10', '10', '10', '10', '10'] },
          { label: 'Alpha : Lead Time', values: ['3', '3', '8', '3', '3'] },
          { label: 'Alpha : Terms', values: ['60', '60', '60', '60', '60'] },
          { label: 'Alpha-TechBook : Component Price', values: ['R 1 560', 'R 1 560', 'R 1 160', 'R 1 060', 'R 1 560'] },
          { label: 'Alpha-Zroid : Component Price', values: ['R 1 328', 'R 1 328', 'R 1 328', 'R 1 228', 'R 1 328'] },
          { label: 'Alpha-iTab : Component Price', values: ['R 1 065', 'R 1 065', 'R 1 065', 'R 965', 'R 1 065'] },
      ],
      finance: [
          { label: 'TechBook : Debtor Days', values: ['30', '45', '90', '90', '60'] },
          { label: 'Zroid : Debtor Days', values: ['45', '60', '15', '45', '45'] },
          { label: 'iTab : Debtor Days', values: ['30', '60', '15', '30', '45'] },
          { label: 'Debt (Raise / Pay)', values: ['10 000 000', '7 500 000', '7 500 000', '8 000 000', '22 680 600'] },
          { label: 'Equity (Raise / Retire)', values: ['-', '-', '-', '-', '(40 000 000)'] },
      ]
  };

  // INDUSTRY PERFORMANCE DATA
  const performanceData = {
      income: [
          { label: 'Total Revenue', values: ['R 427 769 953', 'R 443 777 662', 'R 658 957 883', 'R 603 170 146', 'R 519 179 038'], bold: true },
          { label: '- TechBook Revenue', values: ['R 86 767 313', 'R 102 190 183', 'R 103 664 948', 'R 106 446 540', 'R 98 885 170'] },
          { label: '- Zroid Revenue', values: ['R 197 808 972', 'R 213 874 235', 'R 325 168 229', 'R 286 753 606', 'R 253 125 746'] },
          { label: '- iTab Revenue', values: ['R 143 193 668', 'R 127 713 244', 'R 230 124 706', 'R 209 970 000', 'R 167 168 122'] },
          { label: 'Total COGS', values: ['R 179 499 955', 'R 177 198 204', 'R 219 480 787', 'R 189 888 412', 'R 173 597 248'], bold: true },
          { label: 'Total GP', values: ['R 248 269 998', 'R 266 579 458', 'R 439 477 096', 'R 413 281 734', 'R 345 581 790'], bold: true },
          { label: 'Other Income', values: ['R 927 396', 'R 1 374 145', 'R 596 078', 'R 1 570 725', 'R 1 468 998'] },
          { label: 'Total Net Income', values: ['R 249 197 394', 'R 267 953 604', 'R 440 073 173', 'R 414 852 459', 'R 347 050 788'], bold: true },
          { label: 'Operating Expenses', values: ['R 173 274 660', 'R 178 448 961', 'R 240 133 758', 'R 202 166 406', 'R 192 869 321'], bold: true },
          { label: 'EBITDA', values: ['R 75 922 733', 'R 89 504 643', 'R 199 939 415', 'R 212 686 053', 'R 154 181 467'], bold: true },
          { label: 'EBT', values: ['R 73 768 233', 'R 87 512 643', 'R 197 947 415', 'R 210 661 553', 'R 151 202 728'], bold: true },
          { label: 'Taxation', values: ['R 20 655 105', 'R 24 503 540', 'R 55 425 276', 'R 58 985 235', 'R 42 336 764'] },
          { label: 'Net Profit for the period', values: ['R 53 113 128', 'R 63 009 103', 'R 142 522 139', 'R 151 676 318', 'R 108 865 964'], bold: true, bg: 'bg-emerald-50' },
      ],
      balance: [
          { label: 'Total Non-Current Assets', values: ['R 299 459 535', 'R 299 459 535', 'R 299 459 535', 'R 332 834 535', 'R 291 959 535'], bold: true },
          { label: 'Total Current Assets', values: ['R 286 816 686', 'R 218 355 521', 'R 305 501 579', 'R 306 505 234', 'R 327 991 546'], bold: true },
          { label: 'TOTAL ASSETS', values: ['R 586 276 221', 'R 517 815 056', 'R 604 961 114', 'R 639 339 769', 'R 619 951 081'], bold: true, bg: 'bg-slate-100' },
          { label: 'Total Equity', values: ['R 339 678 065', 'R 349 574 040', 'R 429 087 076', 'R 438 241 255', 'R 355 430 901'], bold: true },
          { label: 'Total Liabilities', values: ['R 246 598 156', 'R 168 241 016', 'R 175 874 038', 'R 201 098 514', 'R 264 520 180'], bold: true },
          { label: 'TOTAL EQUITY & LIABILITIES', values: ['R 586 276 221', 'R 517 815 056', 'R 604 961 114', 'R 639 339 769', 'R 619 951 081'], bold: true, bg: 'bg-slate-100' },
      ],
      kpis: [
          { label: 'GP Margin (Total)', values: ['58.0%', '60.1%', '66.7%', '68.5%', '66.6%'] },
          { label: 'Net Profit Margin', values: ['12.4%', '14.2%', '21.6%', '25.1%', '21.0%'] },
          { label: 'Asset Turnover', values: ['73.0%', '85.7%', '108.9%', '94.3%', '83.7%'] },
          { label: 'Debt Equity', values: ['2.9%', '2.1%', '1.7%', '1.8%', '6.4%'] },
          { label: 'ROE', values: ['15.6%', '18.0%', '33.2%', '34.6%', '30.6%'] },
      ]
  };

  // MARKET DATA
  const marketData = [
      {
          product: 'TechBook',
          data: [
              { criteria: 'Price', rating: 10, scores: ['5.38', '4.31', '6.42', '4.57', '4.31'] },
              { criteria: 'Payment Terms', rating: 9, scores: ['1.60', '2.77', '6.97', '6.97', '4.20'] },
              { criteria: 'Availability', rating: 7, scores: ['2.89', '2.89', '2.89', '6.18', '2.07'] },
              { criteria: 'Stores', rating: 8, scores: ['3.84', '3.84', '4.62', '3.84', '3.84'] },
              { criteria: 'Agents', rating: 4, scores: ['1.44', '2.27', '2.60', '2.27', '1.44'] },
              { criteria: 'Staff Availability', rating: 3, scores: ['1.52', '1.66', '1.86', '1.29', '1.18'] },
              { criteria: 'Product Innovation', rating: 8, scores: ['1.45', '4.00', '4.00', '6.55', '4.00'] },
              { criteria: 'Company Advertising', rating: 6, scores: ['2.87', '0.00', '3.55', '5.51', '2.87'] },
              { criteria: 'Product Advertising', rating: 5, scores: ['3.70', '3.70', '1.50', '3.09', '0.72'] },
              { criteria: 'Other', rating: 0, scores: ['0.00', '0.00', '0.00', '0.00', '0.00'] },
              { criteria: 'Total Scores', rating: null, scores: ['24.69', '25.44', '34.41', '40.28', '24.62'], bold: true },
              { criteria: 'Market Share Earned', rating: null, scores: ['16.5%', '17.0%', '23.0%', '27.0%', '16.5%'], bold: true, bg: 'bg-blue-50' }
          ]
      },
      {
        product: 'Zroid',
        data: [
            { criteria: 'Price', rating: 5, scores: ['2.87', '2.63', '2.15', '2.55', '2.31'] },
            { criteria: 'Payment Terms', rating: 3, scores: ['1.65', '2.34', '0.37', '1.65', '1.65'] },
            { criteria: 'Availability', rating: 6, scores: ['2.48', '2.48', '2.48', '5.30', '1.78'] },
            { criteria: 'Stores', rating: 8, scores: ['3.84', '3.84', '4.62', '3.84', '3.84'] },
            { criteria: 'Agents', rating: 7, scores: ['2.51', '3.97', '4.54', '3.97', '2.51'] },
            { criteria: 'Staff Availability', rating: 4, scores: ['2.02', '2.21', '2.48', '1.72', '1.57'] },
            { criteria: 'Product Innovation', rating: 8, scores: ['1.45', '4.00', '6.55', '4.00', '4.00'] },
            { criteria: 'Company Advertising', rating: 9, scores: ['4.30', '0.00', '5.32', '8.26', '4.30'] },
            { criteria: 'Product Advertising', rating: 10, scores: ['4.05', '4.05', '8.45', '2.22', '5.92'] },
            { criteria: 'Other', rating: 0, scores: ['0.00', '0.00', '0.00', '0.00', '0.00'] },
            { criteria: 'Total Scores', rating: null, scores: ['25.18', '25.52', '36.96', '33.52', '27.88'], bold: true },
            { criteria: 'Market Share Earned', rating: null, scores: ['16.9%', '17.1%', '24.8%', '22.5%', '18.7%'], bold: true, bg: 'bg-emerald-50' }
        ]
      },
      {
        product: 'iTab',
        data: [
            { criteria: 'Price', rating: 3, scores: ['1.47', '1.84', '1.33', '1.47', '1.40'] },
            { criteria: 'Payment Terms', rating: 2, scores: ['0.78', '1.75', '0.32', '0.78', '1.33'] },
            { criteria: 'Availability', rating: 9, scores: ['3.72', '3.72', '3.72', '7.95', '2.66'] },
            { criteria: 'Stores', rating: 5, scores: ['2.40', '2.40', '2.89', '2.40', '2.40'] },
            { criteria: 'Agents', rating: 6, scores: ['2.15', '3.40', '3.89', '3.40', '2.15'] },
            { criteria: 'Staff Availability', rating: 8, scores: ['4.05', '4.41', '4.95', '3.44', '3.14'] },
            { criteria: 'Product Innovation', rating: 10, scores: ['2.75', '1.37', '9.18', '6.55', '4.60'] },
            { criteria: 'Company Advertising', rating: 4, scores: ['1.91', '0.00', '2.37', '3.67', '1.91'] },
            { criteria: 'Product Advertising', rating: 7, scores: ['2.19', '3.76', '3.91', '2.94', '4.70'] },
            { criteria: 'Other', rating: 0, scores: ['0.00', '0.00', '0.00', '0.00', '0.00'] },
            { criteria: 'Total Scores', rating: null, scores: ['21.42', '22.66', '32.56', '32.60', '24.31'], bold: true },
            { criteria: 'Market Share Earned', rating: null, scores: ['16.0%', '17.0%', '24.4%', '24.4%', '18.2%'], bold: true, bg: 'bg-purple-50' }
        ]
      }
  ];

  // Helper to render a multi-team row
  const formatCellValue = (value: string) => {
      const trimmed = value.trim();

      if (trimmed.includes('%')) {
          const numeric = parseNumber(trimmed.replace('%', ''));
          return formatPercent(numeric, 2, false);
      }

      if (trimmed.startsWith('R')) {
          const numeric = parseNumber(trimmed.replace('R', ''));
          return formatCurrency(numeric);
      }

      const numeric = parseNumber(trimmed.replace(/\s/g, ''));
      if (!Number.isNaN(numeric) && /\d/.test(trimmed)) {
          return formatNumber(numeric, 0);
      }

      return value;
  };

  const renderMultiTeamRow = (label: string, values: string[], bold = false, bg = '') => (
      <tr key={label} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${bg} ${bold ? 'font-bold' : ''}`}>
          <td className={`py-2 px-4 text-left text-sm text-slate-700 ${bold ? 'font-bold' : ''}`}>{label}</td>
          {values.map((v, idx) => (
              <td key={idx} className={`py-2 px-4 text-center text-sm font-mono ${bold ? 'text-slate-900' : 'text-slate-600'}`}>
                  {formatCellValue(v)}
              </td>
          ))}
      </tr>
  );

  const renderTeamTabs = () => (
      <div className="flex overflow-x-auto gap-2 p-4 bg-slate-50 border-b border-slate-100 scrollbar-none">
          {teams.map((team, idx) => (
              <button
                  key={idx}
                  onClick={() => setSelectedMobileTeam(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedMobileTeam === idx 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                  Team {idx + 1}: {team}
              </button>
          ))}
      </div>
  );

  const renderMobileMetricRow = (label: string, value: string, bold = false) => (
      <div key={label} className="flex justify-between items-center py-2 px-2 text-xs">
          <span className="text-slate-500 font-medium">{label}</span>
          <span className={`font-mono ${bold ? 'font-bold text-slate-900' : 'text-slate-800 font-semibold'}`}>
              {formatCellValue(value)}
          </span>
      </div>
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Market Reports</h1>
          <p className="text-slate-500 mt-1">Comparative industry analysis and competitive intelligence.</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
            {[
                { id: 'decisions', label: 'Industry Decisions', icon: Layers },
                { id: 'performance', label: 'Industry Performance', icon: TrendingUp },
                { id: 'marketData', label: 'Market Data', icon: Table },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab.id 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[600px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* --- TAB 1: INDUSTRY DECISIONS --- */}
        {activeTab === 'decisions' && (
             <div className="p-0 lg:p-6">
                 {/* Desktop Matrix View */}
                 <div className="hidden lg:block overflow-x-auto">
                     <table className="w-full text-sm min-w-[1000px]">
                         <thead>
                             <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
                                 <th className="py-3 px-4 text-left font-bold w-64">Metric</th>
                                 {teams.map((team, i) => (
                                     <th key={i} className="py-3 px-2 text-center font-bold w-40">
                                         <div className="flex flex-col items-center">
                                             <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Team {i + 1}</span>
                                             <span className="text-slate-800">{team}</span>
                                         </div>
                                     </th>
                                 ))}
                             </tr>
                         </thead>
                         <tbody>
                             {/* Marketing Section */}
                             <tr className="bg-blue-600 text-white"><td colSpan={6} className="py-2 px-4 font-bold">Marketing & Sales Decisions</td></tr>
                             {decisionsData.marketing.map((row) => renderMultiTeamRow(row.label, row.values))}

                             {/* Operations Section */}
                             <tr className="bg-blue-600 text-white"><td colSpan={6} className="py-2 px-4 font-bold">Operations Decisions</td></tr>
                             {decisionsData.operations.map((row) => renderMultiTeamRow(row.label, row.values))}

                             {/* Procurement Section */}
                             <tr className="bg-blue-600 text-white"><td colSpan={6} className="py-2 px-4 font-bold">Procurement Decisions</td></tr>
                             {decisionsData.procurement.map((row) => renderMultiTeamRow(row.label, row.values))}

                             {/* Finance Section */}
                             <tr className="bg-blue-600 text-white"><td colSpan={6} className="py-2 px-4 font-bold">Finance Decisions</td></tr>
                             {decisionsData.finance.map((row) => renderMultiTeamRow(row.label, row.values))}
                         </tbody>
                     </table>
                 </div>

                 {/* Mobile Tabbed View */}
                 <div className="block lg:hidden">
                     {renderTeamTabs()}
                     <div className="p-4 space-y-6">
                         {/* Marketing Section */}
                         <div className="space-y-2">
                             <h4 className="bg-blue-600 text-white py-1.5 px-3 rounded font-bold text-sm">Marketing & Sales Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {decisionsData.marketing.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>

                         {/* Operations Section */}
                         <div className="space-y-2">
                             <h4 className="bg-blue-600 text-white py-1.5 px-3 rounded font-bold text-sm">Operations Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {decisionsData.operations.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>

                         {/* Procurement Section */}
                         <div className="space-y-2">
                             <h4 className="bg-blue-600 text-white py-1.5 px-3 rounded font-bold text-sm">Procurement Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {decisionsData.procurement.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>

                         {/* Finance Section */}
                         <div className="space-y-2">
                             <h4 className="bg-blue-600 text-white py-1.5 px-3 rounded font-bold text-sm">Finance Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {decisionsData.finance.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {/* --- TAB 2: INDUSTRY PERFORMANCE --- */}
        {activeTab === 'performance' && (
             <div className="p-0 lg:p-6">
                 {/* Desktop Matrix View */}
                 <div className="hidden lg:block overflow-x-auto">
                     <table className="w-full text-sm min-w-[1000px]">
                         <thead>
                             <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
                                 <th className="py-3 px-4 text-left font-bold w-64">Metric</th>
                                 {teams.map((team, i) => (
                                     <th key={i} className="py-3 px-2 text-center font-bold w-40">
                                         <div className="flex flex-col items-center">
                                             <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Team {i + 1}</span>
                                             <span className="text-slate-800">{team}</span>
                                         </div>
                                     </th>
                                 ))}
                             </tr>
                         </thead>
                         <tbody>
                             <tr className="bg-emerald-500 text-white"><td colSpan={6} className="py-2 px-4 font-bold">Income Statement</td></tr>
                             {performanceData.income.map((row) => renderMultiTeamRow(row.label, row.values, row.bold, row.bg))}

                             <tr className="bg-emerald-500 text-white"><td colSpan={6} className="py-2 px-4 font-bold">Balance Sheet</td></tr>
                             {performanceData.balance.map((row) => renderMultiTeamRow(row.label, row.values, row.bold, row.bg))}

                             <tr className="bg-emerald-500 text-white"><td colSpan={6} className="py-2 px-4 font-bold">Key Performance Indicators (KPIs)</td></tr>
                             {performanceData.kpis.map((row) => renderMultiTeamRow(row.label, row.values))}
                         </tbody>
                     </table>
                 </div>

                 {/* Mobile Tabbed View */}
                 <div className="block lg:hidden">
                     {renderTeamTabs()}
                     <div className="p-4 space-y-6">
                         {/* Income Statement */}
                         <div className="space-y-2">
                             <h4 className="bg-emerald-600 text-white py-1.5 px-3 rounded font-bold text-sm">Income Statement</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {performanceData.income.map((row) => (
                                     <div key={row.label} className={`flex justify-between items-center py-2 px-2 text-xs rounded ${row.bg || ''} ${row.bold ? 'font-bold bg-slate-100/50' : ''}`}>
                                         <span className={`${row.bold ? 'text-slate-800' : 'text-slate-500'} font-medium`}>{row.label}</span>
                                         <span className="font-mono text-slate-800">{formatCellValue(row.values[selectedMobileTeam])}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         {/* Balance Sheet */}
                         <div className="space-y-2">
                             <h4 className="bg-emerald-600 text-white py-1.5 px-3 rounded font-bold text-sm">Balance Sheet</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {performanceData.balance.map((row) => (
                                     <div key={row.label} className={`flex justify-between items-center py-2 px-2 text-xs rounded ${row.bg || ''} ${row.bold ? 'font-bold bg-slate-100/50' : ''}`}>
                                         <span className={`${row.bold ? 'text-slate-800' : 'text-slate-500'} font-medium`}>{row.label}</span>
                                         <span className="font-mono text-slate-800">{formatCellValue(row.values[selectedMobileTeam])}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         {/* KPIs */}
                         <div className="space-y-2">
                             <h4 className="bg-emerald-600 text-white py-1.5 px-3 rounded font-bold text-sm">Key Performance Indicators</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {performanceData.kpis.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {/* --- TAB 3: MARKET DATA --- */}
        {activeTab === 'marketData' && (
             <div className="p-0 lg:p-6 space-y-6 lg:space-y-12">
                 {/* Mobile Tab switcher header once at the top */}
                 <div className="block lg:hidden">
                     {renderTeamTabs()}
                 </div>

                 {marketData.map((productData) => (
                      <div key={productData.product} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <div className="bg-slate-100 px-6 py-3 font-bold text-lg text-slate-800 border-b border-slate-200">
                              {productData.product} - Market Share Calculation
                          </div>
                          
                          {/* Desktop View */}
                          <div className="hidden lg:block overflow-x-auto">
                             <table className="w-full text-sm">
                                 <thead>
                                     <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                         <th className="py-2 px-4 text-left font-bold w-48">Criteria</th>
                                         <th className="py-2 px-4 text-center font-bold w-20">Rating</th>
                                         {teams.map((team, i) => (
                                             <th key={i} className="py-2 px-2 text-center font-bold truncate max-w-[150px]" title={team}>
                                                 {team}
                                             </th>
                                         ))}
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {productData.data.map((row, idx) => (
                                         <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${row.bg || ''} ${row.bold ? 'font-bold' : ''}`}>
                                             <td className="py-2 px-4 text-slate-700">{row.criteria}</td>
                                             <td className="py-2 px-4 text-center text-slate-500">{row.rating ?? ''}</td>
                                             {row.scores.map((score, sIdx) => (
                                                 <td key={sIdx} className="py-2 px-2 text-center font-mono text-slate-600">
                                                     {score}
                                                 </td>
                                             ))}
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                             
                             {/* Decisions Snapshot Section */}
                             <div className="bg-slate-50 p-4 border-t border-slate-200">
                                 <h4 className="font-bold text-slate-700 text-xs uppercase mb-3">{productData.product} : Decisions Reference</h4>
                                 <div className="grid grid-cols-1 overflow-x-auto">
                                      <table className="w-full text-xs">
                                          <tbody>
                                              <tr className="border-b border-slate-200">
                                                  <td className="py-1 px-4 font-semibold text-slate-600 w-68">Price</td>
                                                  {decisionsData.marketing.find(d => d.label === `Price : ${productData.product}`)?.values.map((v, i) => (
                                                      <td key={i} className="py-1 px-2 text-center font-mono">{v}</td>
                                                  ))}
                                              </tr>
                                              <tr className="border-b border-slate-200">
                                                  <td className="py-1 px-4 font-semibold text-slate-600">Payment Terms</td>
                                                  {teams.map((_, i) => <td key={i} className="py-1 px-2 text-center font-mono">60</td>)}
                                              </tr>
                                              <tr className="border-b border-slate-200">
                                                  <td className="py-1 px-4 font-semibold text-slate-600">Availability</td>
                                                  {teams.map((_, i) => <td key={i} className="py-1 px-2 text-center font-mono">10 000</td>)}
                                              </tr>
                                               <tr className="border-b border-slate-200">
                                                  <td className="py-1 px-4 font-semibold text-slate-600">Agents</td>
                                                  {decisionsData.marketing.find(d => d.label === `Agent Commission`)?.values.map((v, i) => (
                                                      <td key={i} className="py-1 px-2 text-center font-mono">{v}</td>
                                                  ))}
                                              </tr>
                                               <tr className="border-b border-slate-200">
                                                  <td className="py-1 px-4 font-semibold text-slate-600">Company Advertising</td>
                                                  {teams.map((_, i) => <td key={i} className="py-1 px-2 text-center font-mono">R 2 505 149</td>)}
                                              </tr>
                                          </tbody>
                                      </table>
                                 </div>
                             </div>
                          </div>

                          {/* Mobile View */}
                          <div className="block lg:hidden">
                              <div className="divide-y divide-slate-100 p-4 space-y-4">
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 divide-y divide-slate-100">
                                      {productData.data.map((row, idx) => (
                                          <div key={idx} className={`flex justify-between items-center py-2 px-2 text-xs rounded ${row.bg || ''} ${row.bold ? 'font-bold bg-slate-100/50' : ''}`}>
                                              <div>
                                                  <span className="text-slate-800 font-medium block">{row.criteria}</span>
                                                  {row.rating !== null && <span className="text-[10px] text-slate-400">Rating Weight: {row.rating}</span>}
                                              </div>
                                              <span className="font-mono text-slate-800">{row.scores[selectedMobileTeam]}</span>
                                          </div>
                                      ))}
                                  </div>

                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                      <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">{productData.product} : Decisions Reference</h4>
                                      <div className="space-y-1.5 text-xs">
                                          <div className="flex justify-between py-1 border-b border-slate-200/60">
                                              <span className="text-slate-500">Price</span>
                                              <span className="font-mono font-semibold">{decisionsData.marketing.find(d => d.label === `Price : ${productData.product}`)?.values[selectedMobileTeam]}</span>
                                          </div>
                                          <div className="flex justify-between py-1 border-b border-slate-200/60">
                                              <span className="text-slate-500">Payment Terms</span>
                                              <span className="font-mono font-semibold">60</span>
                                          </div>
                                          <div className="flex justify-between py-1 border-b border-slate-200/60">
                                              <span className="text-slate-500">Availability</span>
                                              <span className="font-mono font-semibold">10 000</span>
                                          </div>
                                          <div className="flex justify-between py-1 border-b border-slate-200/60">
                                              <span className="text-slate-500">Agents</span>
                                              <span className="font-mono font-semibold">{decisionsData.marketing.find(d => d.label === `Agent Commission`)?.values[selectedMobileTeam]}</span>
                                          </div>
                                          <div className="flex justify-between py-1">
                                              <span className="text-slate-500">Company Advertising</span>
                                              <span className="font-mono font-semibold">R 2 505 149</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
             </div>
        )}

      </div>
    </div>
  );
};

export default MarketReports;