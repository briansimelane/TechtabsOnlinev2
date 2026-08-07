import React, { useState } from 'react';
import { 
  BarChart2, 
  Layers, 
  TrendingUp, 
  Table,
  Info,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Presentation
} from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { Team } from '../types';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../utils/numberFormat';
import { INITIAL_DECISIONS, PRODUCTS, SUPPLIERS, SUPPLIER_METRICS, STORE_COSTS, FINANCE_CONSTANTS, HR_ROLES, getMarketSize } from '../constants';
import { 
  computeMarketShareBackModel, 
  getClosingFeatures, 
  getDecisionsForTeamPeriod, 
  computeTeamPeriodBalanceSheet,
  getTeamCapacityForPeriod,
  getTeamStoreCountForPeriod,
  getTeamCSHeadcountForPeriod,
  getTeamFeaturesForPeriod
} from '../utils/marketShareBackModel';
import { processTurn } from '../utils/SimulationEngine';
import { computeIndustryPerformance, TeamIndustryPerformance } from '../utils/industryPerformance';
import { exportReportCSV, exportReportPDF } from '../utils/reportExportHelpers';
import { useDebriefData } from '../hooks/useDebriefData';
import { compileDebriefSlides } from '../utils/debriefSlides';
import { downloadDebriefDeckPdf } from '../utils/debriefPdfExport';

const HR_ROLE_LABELS: Record<string, string> = {
  engineers: 'Engineers',
  technicians: 'Technicians',
  semiSkilled: 'Semi-Skilled Workers',
  adminSales: 'Admin & Sales',
  customerService: 'Customer Service'
};

type Tab = 'decisions' | 'performance' | 'marketData' | 'debriefSlides';

const DebriefSlidesViewer: React.FC<{ classId: string; period: number }> = ({ classId, period }) => {
  const dataset = useDebriefData(classId, period);
  const slides = React.useMemo(() => compileDebriefSlides(dataset), [dataset]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const currentSlide = slides[slideIndex] || slides[0];

  const handleDownloadDeck = async () => {
    try {
      setIsExportingPdf(true);
      setExportProgress({ current: 0, total: slides.length });
      await downloadDebriefDeckPdf(dataset, (current, total) => {
        setExportProgress({ current, total });
      });
    } catch (err) {
      console.error("Failed to export debrief slides deck PDF", err);
    } finally {
      setIsExportingPdf(false);
      setExportProgress(null);
    }
  };

  if (dataset.loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-xl">
        Loading Debrief Presenter Slides for Year {period}...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 p-4 bg-slate-900 rounded-xl">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800 border border-slate-700 p-3 rounded-lg text-white gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-extrabold text-blue-400 bg-blue-950 border border-blue-800 px-2.5 py-1 rounded">
            Slide {slideIndex + 1} of {slides.length}
          </span>
          <span className="font-bold text-sm text-slate-100">{currentSlide?.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadDeck}
            disabled={isExportingPdf || dataset.loading || dataset.teams.length === 0}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-xs font-bold transition-all shadow-xs mr-2"
            title={`Download Year ${period} Executive Debrief Presentation Deck as PDF`}
          >
            <Download size={14} />
            {isExportingPdf ? `Exporting Slide ${exportProgress?.current || 0}/${exportProgress?.total || slides.length}...` : `Download Year ${period} Slides PDF`}
          </button>
          <select
            value={slideIndex}
            onChange={(e) => setSlideIndex(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded px-2.5 py-1"
          >
            {slides.map((s, idx) => (
              <option key={idx} value={idx}>
                {idx + 1}. {s.title}
              </option>
            ))}
          </select>
          <button
            disabled={slideIndex === 0}
            onClick={() => setSlideIndex(prev => Math.max(0, prev - 1))}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded text-xs font-bold transition-all"
          >
            ← Prev
          </button>
          <button
            disabled={slideIndex === slides.length - 1}
            onClick={() => setSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-xs font-bold transition-all"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Slide Canvas */}
      <div className="w-full aspect-[16/9] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative">
        {currentSlide && currentSlide.render({
          dataset,
          revealStep: currentSlide.maxRevealSteps || 0,
          currentSlide: slideIndex + 1,
          totalSlides: slides.length
        })}
      </div>
    </div>
  );
};

const MarketReports: React.FC = () => {
  const { currentTeam, currentRole, classes, currentClassId } = useSimulation();
  const [activeTab, setActiveTab] = useState<Tab>('decisions');
  const [selectedMobileTeam, setSelectedMobileTeam] = useState<number>(0);

  const [exportPdfOpen, setExportPdfOpen] = useState(false);
  const [exportCsvOpen, setExportCsvOpen] = useState(false);

  const currentClass = classes.find(c => c.id === currentClassId);
  const realTeams = React.useMemo(() => {
    return currentClass?.teams ? currentClass.teams.filter(t => !t.isArchived).sort((a, b) => a.id.localeCompare(b.id)) : [];
  }, [currentClass]);

  const teams = [
    "Till the end of Chart",
    "The Vault",
    "CTRL + ALT + ELITE",
    "The Exchange",
    "Maverick Minds"
  ];

  const activeTeams = realTeams.length > 0 ? realTeams.map(t => t.name) : teams;

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const showReportsSetting = currentClass?.showMarketReportsYear1 ?? false;
  const isStudent = currentRole === 'STUDENT';
  const currentPeriod = isStudent ? currentTeam.currentPeriod : (currentClass?.currentPeriod || 1);

  const maxAvailablePeriod = currentPeriod > 1 ? currentPeriod - 1 : 1;
  const reportPeriod = (selectedYear && selectedYear <= maxAvailablePeriod) ? selectedYear : maxAvailablePeriod;
  const availableYears = Array.from({ length: maxAvailablePeriod }, (_, i) => i + 1);

  const debriefDataset = useDebriefData(currentClassId || '', reportPeriod);

  const getDecisionRefValue = React.useCallback((productName: string, field: string, teamIdx: number) => {
    if (!currentClass || !realTeams[teamIdx]) return '—';
    const t = realTeams[teamIdx];
    const dec = getDecisionsForTeamPeriod(t, reportPeriod);
    const pId = productName.toLowerCase() === 'techbook' ? 'techbook' : (productName.toLowerCase() === 'zroid' ? 'zroid' : 'itab');

    switch (field) {
      case 'Price':
        return formatCurrency(dec.marketing?.prices?.[pId] ?? 0, 0);
      case 'Payment Terms':
        return `${dec.finance?.debtorsDays?.[pId] ?? 0} days`;
      case 'Availability':
        return formatNumber(getTeamCapacityForPeriod(t, reportPeriod), 0);
      case 'Stores':
        return formatNumber(getTeamStoreCountForPeriod(t, reportPeriod), 0);
      case 'Agents':
        return formatPercent(dec.marketing?.agentCommission ?? 0, 2, true);
      case 'CS Headcount':
        return formatNumber(getTeamCSHeadcountForPeriod(t, reportPeriod), 0);
      case 'Cumulative Features':
        return formatNumber(getTeamFeaturesForPeriod(t, reportPeriod, pId), 0);
      case 'Company Advertising':
        return formatCurrency((dec.marketing?.advertisingBudget ?? 0) * (dec.marketing?.generalAdSplit ?? 0), 0);
      case 'Product Advertising':
        return formatCurrency((dec.marketing?.advertisingBudget ?? 0) * (dec.marketing?.adSplits?.[pId] ?? 0), 0);
      default:
        return '—';
    }
  }, [currentClass, realTeams, reportPeriod]);

  // Dynamic Market Data calculation from actual backModel
  const dynamicMarketData = React.useMemo(() => {
    if (!currentClass || !realTeams || realTeams.length === 0) {
      return null;
    }
    
    const results = computeMarketShareBackModel(realTeams, reportPeriod);
    
    // Map results to the structure expected by the render code
    const productKeys: Record<string, 'techbook' | 'zroid' | 'itab'> = {
      'TechBook': 'techbook',
      'Zroid': 'zroid',
      'iTab': 'itab'
    };
    
    return ['TechBook', 'Zroid', 'iTab'].map(pName => {
      const pId = productKeys[pName];
      const result = results.find(r => r.productId === pId);
      
      if (!result) {
        return { product: pName, data: [] };
      }
      
      const criteriaRows = result.criteria.map(c => {
        const criteriaLabel = `${c.name} (Weight: ${c.rating})`;
        return {
          criteria: criteriaLabel,
          rating: c.rating,
          scores: realTeams.map((_, tIdx) => {
            const isActive = result.activeByTeam[tIdx];
            if (!isActive) return '0.00';
            return c.weightedByTeam[tIdx].toFixed(2);
          })
        };
      });
      
      const totalScoresRow = {
        criteria: 'Total Scores',
        rating: null as number | null,
        scores: realTeams.map((_, tIdx) => {
          const isActive = result.activeByTeam[tIdx];
          if (!isActive) return '0.00';
          return result.totalScoreByTeam[tIdx].toFixed(2);
        }),
        bold: true
      };
      
      const shareColor = pId === 'techbook' ? 'bg-blue-50' : (pId === 'zroid' ? 'bg-emerald-50' : 'bg-purple-50');
      const shareRow = {
        criteria: 'Market Share Earned',
        rating: null as number | null,
        scores: realTeams.map((_, tIdx) => {
          const isActive = result.activeByTeam[tIdx];
          if (!isActive) return '0.0%';
          return formatPercent(result.marketShareByTeam[tIdx], 1, true);
        }),
        bold: true,
        bg: shareColor
      };

      const decisionsRefRows = [
        {
          criteria: 'Price (R)',
          rating: null as number | null,
          scores: realTeams.map((t) => {
            const dec = getDecisionsForTeamPeriod(t, reportPeriod);
            return formatCurrency(dec.marketing?.prices?.[pId] ?? 0, 0);
          })
        },
        {
          criteria: 'Debtor Days (Payment Terms)',
          rating: null as number | null,
          scores: realTeams.map((t) => {
            const dec = getDecisionsForTeamPeriod(t, reportPeriod);
            return `${dec.finance?.debtorsDays?.[pId] ?? 0} days`;
          })
        },
        {
          criteria: 'Product Features (Count)',
          rating: null as number | null,
          scores: realTeams.map((t) => {
            const dec = getDecisionsForTeamPeriod(t, reportPeriod);
            return formatNumber(getTeamFeaturesForPeriod(t, reportPeriod, pId), 0);
          })
        }
      ];
      
      return {
        product: pName,
        data: [...decisionsRefRows, ...criteriaRows, totalScoresRow, shareRow]
      };
    });
  }, [currentClass, realTeams, reportPeriod]);

  // Dynamic Decisions Data mapping from actual team draftDecisions
  const dynamicDecisionsData = React.useMemo(() => {
    if (!currentClass || !realTeams || realTeams.length === 0) {
      return null;
    }

    const getTeamDec = (t: Team) => getDecisionsForTeamPeriod(t, reportPeriod);

    const marketingRows = [
      {
        label: 'Price : TechBook',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatCurrency(dec.marketing?.prices?.techbook ?? 0, 0);
        })
      },
      {
        label: 'Price : Zroid',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatCurrency(dec.marketing?.prices?.zroid ?? 0, 0);
        })
      },
      {
        label: 'Price : iTab',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatCurrency(dec.marketing?.prices?.itab ?? 0, 0);
        })
      },
      {
        label: 'Market Share : TechBook',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${(dec.marketing?.forecastedMarketShare?.techbook ?? 0).toFixed(1)}%`;
        })
      },
      {
        label: 'Market Share : Zroid',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${(dec.marketing?.forecastedMarketShare?.zroid ?? 0).toFixed(1)}%`;
        })
      },
      {
        label: 'Market Share : iTab',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${(dec.marketing?.forecastedMarketShare?.itab ?? 0).toFixed(1)}%`;
        })
      },
      {
        label: 'Forecasted Units : TechBook',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const share = dec.marketing?.forecastedMarketShare?.techbook ?? 0;
          const units = Math.round((getMarketSize('techbook', reportPeriod) * share) / 100);
          return formatNumber(units, 0);
        })
      },
      {
        label: 'Forecasted Units : Zroid',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const share = dec.marketing?.forecastedMarketShare?.zroid ?? 0;
          const units = Math.round((getMarketSize('zroid', reportPeriod) * share) / 100);
          return formatNumber(units, 0);
        })
      },
      {
        label: 'Forecasted Units : iTab',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const share = dec.marketing?.forecastedMarketShare?.itab ?? 0;
          const units = Math.round((getMarketSize('itab', reportPeriod) * share) / 100);
          return formatNumber(units, 0);
        })
      },
      {
        label: 'Advertising : Total Budget',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatCurrency(dec.marketing?.advertisingBudget ?? 0, 0);
        })
      },
      {
        label: 'Advertising : TechBook',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${((dec.marketing?.adSplits?.techbook ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Advertising : Zroid',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${((dec.marketing?.adSplits?.zroid ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Advertising : iTab',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${((dec.marketing?.adSplits?.itab ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Advertising : General',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${((dec.marketing?.generalAdSplit ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Company stores (Open / Close)',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const openClose = dec.marketing?.openCloseStores ?? 0;
          return openClose > 0 ? `+${openClose}` : `${openClose}`;
        })
      },
      {
        label: 'Agent Commission',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${((dec.marketing?.agentCommission ?? 0) * 100).toFixed(1)}%`;
        })
      }
    ];

    const operationsRows = [
      {
        label: 'TechBook : Units produced',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatNumber(dec.operations?.production?.techbook ?? 0, 0);
        })
      },
      {
        label: 'Zroid : Units produced',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatNumber(dec.operations?.production?.zroid ?? 0, 0);
        })
      },
      {
        label: 'iTab : Units produced',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatNumber(dec.operations?.production?.itab ?? 0, 0);
        })
      },
      {
        label: 'Production Capacity Change',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const change = dec.operations?.capacityChange ?? 0;
          return change > 0 ? `+${formatNumber(change, 0)}` : change < 0 ? `-${formatNumber(Math.abs(change), 0)}` : '0';
        })
      },
      {
        label: 'Innovation Budget',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return formatCurrency(dec.operations?.rdBudget ?? 0, 0);
        })
      },
      {
        label: 'Zroid : Innovation Split',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${((dec.operations?.rdSplits?.zroid ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'iTab : Innovation Split',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${((dec.operations?.rdSplits?.itab ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'TechBook : Closing Features',
        values: realTeams.map(t => {
          return formatNumber(getTeamFeaturesForPeriod(t, reportPeriod, 'techbook'), 0);
        })
      },
      {
        label: 'Zroid : Closing Features',
        values: realTeams.map(t => {
          return formatNumber(getTeamFeaturesForPeriod(t, reportPeriod, 'zroid'), 0);
        })
      },
      {
        label: 'iTab : Closing Features',
        values: realTeams.map(t => {
          return formatNumber(getTeamFeaturesForPeriod(t, reportPeriod, 'itab'), 0);
        })
      }
    ];

    const hrRows: { label: string; values: string[] }[] = [];
    HR_ROLES.forEach(role => {
      hrRows.push({
        label: `${HR_ROLE_LABELS[role] || role} : Recruit/(Dismiss)`,
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const val = dec.hr?.hiring?.[role] ?? 0;
          return val > 0 ? `+${val}` : `${val}`;
        })
      });
      hrRows.push({
        label: `${HR_ROLE_LABELS[role] || role} : Salary`,
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const val = dec.hr?.salaries?.[role] ?? 0;
          return formatCurrency(val, 0);
        })
      });
      hrRows.push({
        label: `${HR_ROLE_LABELS[role] || role} : Training`,
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return dec.hr?.trainingLevels?.[role] ?? 'Basic';
        })
      });
    });

    const procurementRows: { label: string; values: string[] }[] = [];

    // Negotiation details
    procurementRows.push({
      label: 'Preferred Supplier (Negotiation)',
      values: realTeams.map(t => {
        const dec = getTeamDec(t);
        return dec.negotiation?.selectedSupplierId || '—';
      })
    });
    procurementRows.push({
      label: 'Negotiation Status',
      values: realTeams.map(t => {
        const dec = getTeamDec(t);
        return dec.negotiation?.status || 'NOT_STARTED';
      })
    });
    procurementRows.push({
      label: 'Agreed Negotiation Discount',
      values: realTeams.map(t => {
        const dec = getTeamDec(t);
        return dec.negotiation?.status === 'AGREED' ? `${((dec.negotiation.agreedDiscount ?? 0) * 100).toFixed(1)}%` : '—';
      })
    });
    procurementRows.push({
      label: 'Agreed Negotiation Terms',
      values: realTeams.map(t => {
        const dec = getTeamDec(t);
        return dec.negotiation?.status === 'AGREED' ? `${dec.negotiation.agreedPaymentTerms} days` : '—';
      })
    });

    // Supplier allocations
    PRODUCTS.forEach(p => {
      SUPPLIERS.forEach(s => {
        procurementRows.push({
          label: `${s} : ${p.name} Components`,
          values: realTeams.map(t => {
            const dec = getTeamDec(t);
            return formatNumber(dec.procurement?.supplierAllocation?.[p.id]?.[s]?.components ?? 0, 0);
          })
        });
        procurementRows.push({
          label: `${s} : ${p.name} Finished Goods`,
          values: realTeams.map(t => {
            const dec = getTeamDec(t);
            return formatNumber(dec.procurement?.supplierAllocation?.[p.id]?.[s]?.finishedGoods ?? 0, 0);
          })
        });
      });
    });

    const financeRows = [
      {
        label: 'TechBook : Debtor Days',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${dec.finance?.debtorsDays?.techbook ?? 0} days`;
        })
      },
      {
        label: 'Zroid : Debtor Days',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${dec.finance?.debtorsDays?.zroid ?? 0} days`;
        })
      },
      {
        label: 'iTab : Debtor Days',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          return `${dec.finance?.debtorsDays?.itab ?? 0} days`;
        })
      },
      {
        label: 'Debt (Raise / Pay)',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const debt = dec.finance?.debtChange ?? 0;
          return debt > 0 ? `+${formatCurrency(debt, 0)}` : debt < 0 ? `-${formatCurrency(Math.abs(debt), 0)}` : 'R 0';
        })
      },
      {
        label: 'Equity (Raise / Retire)',
        values: realTeams.map(t => {
          const dec = getTeamDec(t);
          const equity = dec.finance?.equityChange ?? 0;
          return equity > 0 ? `+${formatCurrency(equity, 0)}` : equity < 0 ? `-${formatCurrency(Math.abs(equity), 0)}` : 'R 0';
        })
      }
    ];

    return {
      marketing: marketingRows,
      operations: operationsRows,
      hr: hrRows,
      procurement: procurementRows,
      finance: financeRows
    };
  }, [currentClass, realTeams]);

  // Dynamic Industry Performance Data mapping (Revenue & COS based on Actual Units Sold = Min(Demand Earned, Available Stock))
  const dynamicPerformanceData = React.useMemo(() => {
    if (!currentClass || !realTeams || realTeams.length === 0) {
      return null;
    }
    const lastPeriod = Math.max(0, reportPeriod - 1);

    const perfList = computeIndustryPerformance(realTeams, reportPeriod);
    const perfMap = new Map(perfList.map(p => [p.teamId, p]));

    const getPerf = (t: typeof realTeams[0]): TeamIndustryPerformance => {
      const rawRec = t.history?.[reportPeriod] || t.history?.[String(reportPeriod)];
      if (rawRec?.industry) {
        return {
          ...rawRec.industry,
          totalRevenue: rawRec.revenue?.total ?? rawRec.industry.totalRevenue,
          revenueByProduct: rawRec.revenue?.byProduct ?? rawRec.industry.revenueByProduct,
          totalCogs: rawRec.cogs?.total ?? rawRec.industry.totalCogs,
          cogsByProduct: rawRec.cogs?.byProduct ?? rawRec.industry.cogsByProduct,
          grossProfit: rawRec.grossProfit?.total ?? rawRec.industry.grossProfit,
          netProfit: rawRec.netProfit ?? rawRec.industry.netProfit,
          equity: rawRec.balanceSheet?.equity ?? rawRec.industry.equity
        };
      }
      if (rawRec) {
        const totRev = rawRec.revenue?.total || 0;
        const totCogs = rawRec.cogs?.total || 0;
        const gp = rawRec.grossProfit?.total || (totRev - totCogs);
        const np = rawRec.netProfit || 0;
        const eq = rawRec.balanceSheet?.equity || 0;

        return {
          teamId: t.id,
          teamName: t.name,
          revenueByProduct: rawRec.revenue?.byProduct || { techbook: 0, zroid: 0, itab: 0 },
          totalRevenue: totRev,
          cogsByProduct: rawRec.cogs?.byProduct || { techbook: 0, zroid: 0, itab: 0 },
          totalCogs: totCogs,
          grossProfit: gp,
          gpMargin: totRev > 0 ? (gp / totRev) * 100 : 0,
          opex: {
            marketing: rawRec.opex?.marketing || 0,
            store: rawRec.opex?.store || 0,
            payroll: rawRec.opex?.payroll || 0,
            rd: rawRec.opex?.rd || 0,
            agents: rawRec.opex?.agents || 0,
            training: rawRec.opex?.training || 0,
            other: rawRec.opex?.other || 0,
            total: rawRec.opex?.total || 0
          },
          ebitda: rawRec.operatingProfit || (gp - (rawRec.opex?.total || 0)),
          depreciation: 0,
          financeCharges: rawRec.interestExpense || 0,
          ebt: rawRec.ebt || (gp - (rawRec.opex?.total || 0) - (rawRec.interestExpense || 0)),
          taxation: rawRec.taxExpense || 0,
          netProfit: np,
          npMargin: totRev > 0 ? (np / totRev) * 100 : 0,
          equity: eq,
          roe: eq > 0 ? (np / eq) * 100 : 0,
          units: {
            techbook: { marketSize: 0, forecast: 0, demand: rawRec.market?.demandUnits?.techbook || 0, available: 0, actual: rawRec.market?.actualUnits?.techbook || 0 },
            zroid: { marketSize: 0, forecast: 0, demand: rawRec.market?.demandUnits?.zroid || 0, available: 0, actual: rawRec.market?.actualUnits?.zroid || 0 },
            itab: { marketSize: 0, forecast: 0, demand: rawRec.market?.demandUnits?.itab || 0, available: 0, actual: rawRec.market?.actualUnits?.itab || 0 }
          },
          totalScore: { techbook: 0, zroid: 0, itab: 0 },
          marketShare: rawRec.market?.marketShare || { techbook: 0, zroid: 0, itab: 0 },
          price: rawRec.marketing?.prices || { techbook: 0, zroid: 0, itab: 0 },
          staffCounts: { engineers: 0, technicians: 150, semiSkilled: 200, adminSales: 20, customerService: 15 },
          trainingLevels: { engineers: 'Basic', technicians: 'Basic', semiSkilled: 'Basic', adminSales: 'Basic', customerService: 'Basic' },
          unitsProduced: (rawRec.market?.actualUnits?.techbook || 0) + (rawRec.market?.actualUnits?.zroid || 0) + (rawRec.market?.actualUnits?.itab || 0),
          unitsSold: (rawRec.market?.actualUnits?.techbook || 0) + (rawRec.market?.actualUnits?.zroid || 0) + (rawRec.market?.actualUnits?.itab || 0)
        };
      }

      return perfMap.get(t.id) || {
        teamId: t.id,
        teamName: t.name,
        revenueByProduct: { techbook: 0, zroid: 0, itab: 0 },
        totalRevenue: 0,
        cogsByProduct: { techbook: 0, zroid: 0, itab: 0 },
        totalCogs: 0,
        grossProfit: 0,
        gpMargin: 0,
        opex: { marketing: 0, store: 0, payroll: 0, rd: 0, agents: 0, training: 0, other: 0, total: 0 },
        ebitda: 0,
        depreciation: 0,
        financeCharges: 0,
        ebt: 0,
        taxation: 0,
        netProfit: 0,
        npMargin: 0,
        equity: 0,
        roe: 0,
        units: {
          techbook: { marketSize: 0, forecast: 0, demand: 0, available: 0, actual: 0 },
          zroid: { marketSize: 0, forecast: 0, demand: 0, available: 0, actual: 0 },
          itab: { marketSize: 0, forecast: 0, demand: 0, available: 0, actual: 0 }
        },
        totalScore: { techbook: 0, zroid: 0, itab: 0 },
        marketShare: { techbook: 0, zroid: 0, itab: 0 },
        price: { techbook: 0, zroid: 0, itab: 0 },
        staffCounts: { engineers: 0, technicians: 150, semiSkilled: 200, adminSales: 20, customerService: 15 },
        trainingLevels: { engineers: 'Basic', technicians: 'Basic', semiSkilled: 'Basic', adminSales: 'Basic', customerService: 'Basic' },
        unitsProduced: 0,
        unitsSold: 0
      };
    };

    const incomeRows = [
      { label: 'Total Revenue', values: realTeams.map(t => formatCurrency(getPerf(t)?.totalRevenue ?? 0, 0)), bold: true },
      { label: '   - TechBook Revenue', values: realTeams.map(t => formatCurrency(getPerf(t)?.revenueByProduct.techbook ?? 0, 0)) },
      { label: '   - Zroid Revenue', values: realTeams.map(t => formatCurrency(getPerf(t)?.revenueByProduct.zroid ?? 0, 0)) },
      { label: '   - iTab Revenue', values: realTeams.map(t => formatCurrency(getPerf(t)?.revenueByProduct.itab ?? 0, 0)) },
      { label: 'Total COGS / Cost of Sales', values: realTeams.map(t => formatCurrency(getPerf(t)?.totalCogs ?? 0, 0)), bold: true },
      { label: '   - TechBook COGS', values: realTeams.map(t => formatCurrency(getPerf(t)?.cogsByProduct.techbook ?? 0, 0)) },
      { label: '   - Zroid COGS', values: realTeams.map(t => formatCurrency(getPerf(t)?.cogsByProduct.zroid ?? 0, 0)) },
      { label: '   - iTab COGS', values: realTeams.map(t => formatCurrency(getPerf(t)?.cogsByProduct.itab ?? 0, 0)) },
      { label: 'Total Gross Profit (GP)', values: realTeams.map(t => formatCurrency(getPerf(t)?.grossProfit ?? 0, 0)), bold: true },
      { label: 'Operating Expenses:', values: realTeams.map(() => ''), bold: true },
      { label: '   - Advertising & Marketing', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.marketing ?? 0, 0)) },
      { label: '   - Store Costs', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.store ?? 0, 0)) },
      { label: '   - Payroll (Salaries)', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.payroll ?? 0, 0)) },
      { label: '   - R & D (Innovation)', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.rd ?? 0, 0)) },
      { label: '   - Agent Commissions', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.agents ?? 0, 0)) },
      { label: '   - Staff Development (Training)', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.training ?? 0, 0)) },
      { label: '   - Other Operational Expenses', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.other ?? 0, 0)) },
      { label: 'Total Operating Expenses', values: realTeams.map(t => formatCurrency(getPerf(t)?.opex.total ?? 0, 0)), bold: true },
      { label: 'EBITDA', values: realTeams.map(t => formatCurrency(getPerf(t)?.ebitda ?? 0, 0)), bold: true },
      { label: '   - Depreciation', values: realTeams.map(t => formatCurrency(getPerf(t)?.depreciation ?? 0, 0)) },
      { label: '   - Finance Charges', values: realTeams.map(t => formatCurrency(getPerf(t)?.financeCharges ?? 0, 0)) },
      { label: 'EBT', values: realTeams.map(t => formatCurrency(getPerf(t)?.ebt ?? 0, 0)), bold: true },
      { label: '   - Taxation', values: realTeams.map(t => formatCurrency(getPerf(t)?.taxation ?? 0, 0)) },
      { label: 'Net Profit for the period', values: realTeams.map(t => formatCurrency(getPerf(t)?.netProfit ?? 0, 0)), bold: true, bg: 'bg-emerald-50' }
    ];

    const getTeamBalance = (t: typeof realTeams[0]) => {
      const bs = computeTeamPeriodBalanceSheet(t, reportPeriod);

      const nonCurrAssets = bs.fixedAssets;
      const cashVal = bs.cash;
      const recVal = bs.receivables;
      const invVal = bs.inventory;
      const totCurrAssets = cashVal + recVal + invVal;
      const totAssets = bs.totalAssets;

      const totEq = bs.equity;
      const openEq = bs.openingEquity;
      const netProf = bs.netProfit;
      const longTermDebt = bs.longTermDebt;
      const currentLiabilities = bs.currentLiabilities;
      const liab = longTermDebt + currentLiabilities;

      return {
        nonCurrentAssets: nonCurrAssets,
        currentAssets: totCurrAssets,
        cash: cashVal,
        receivables: recVal,
        inventory: invVal,
        totalAssets: totAssets,
        equity: totEq,
        openingEquity: openEq,
        netProfit: netProf,
        longTermDebt,
        currentLiabilities,
        liabilities: liab,
        totalEquityLiabilities: totEq + liab
      };
    };

    const getTeamKpis = (t: typeof realTeams[0]) => {
      const perf = getPerf(t);
      if (t.history && t.history[lastPeriod]?.kpis) {
        const k = t.history[lastPeriod].kpis;
        return {
          gpMargin: `${((k.gpMargin ?? (perf ? perf.gpMargin / 100 : 0)) * 100).toFixed(1)}%`,
          netMargin: `${((k.netMargin ?? (perf ? perf.npMargin / 100 : 0)) * 100).toFixed(1)}%`,
          assetTurnover: `${((k.assetTurnover ?? 0) * 100).toFixed(1)}%`,
          debtEquity: `${((k.debtEquity ?? 0) * 100).toFixed(1)}%`,
          roe: `${((k.roe !== undefined ? k.roe : (perf ? perf.roe / 100 : 0)) * 100).toFixed(1)}%`
        };
      }

      const bal = getTeamBalance(t);
      const gpM = perf?.gpMargin ?? 0;
      const netM = perf?.npMargin ?? 0;
      const assetT = bal.totalAssets > 0 ? ((perf?.totalRevenue ?? 0) / bal.totalAssets) * 100 : 0;
      const debtE = bal.equity > 0 ? (bal.liabilities / bal.equity) * 100 : 0;
      const roeVal = perf?.roe ?? 0;

      return {
        gpMargin: `${gpM.toFixed(1)}%`,
        netMargin: `${netM.toFixed(1)}%`,
        assetTurnover: `${assetT.toFixed(1)}%`,
        debtEquity: `${debtE.toFixed(1)}%`,
        roe: `${roeVal.toFixed(1)}%`
      };
    };

    const balanceRows = [
      { label: 'Non-Current Assets (Fixed Assets Net)', values: realTeams.map(t => formatCurrency(getTeamBalance(t).nonCurrentAssets, 0)), bold: true },
      { label: 'Total Current Assets', values: realTeams.map(t => formatCurrency(getTeamBalance(t).currentAssets, 0)), bold: true },
      { label: '   - Cash & Cash Equivalents', values: realTeams.map(t => formatCurrency(getTeamBalance(t).cash, 0)) },
      { label: '   - Accounts Receivables (Debtors)', values: realTeams.map(t => formatCurrency(getTeamBalance(t).receivables, 0)) },
      { label: '   - Inventories (Raw + Finished Goods)', values: realTeams.map(t => formatCurrency(getTeamBalance(t).inventory, 0)) },
      { label: 'TOTAL ASSETS', values: realTeams.map(t => formatCurrency(getTeamBalance(t).totalAssets, 0)), bold: true, bg: 'bg-slate-100' },
      { label: 'Total Shareholders\' Equity', values: realTeams.map(t => formatCurrency(getTeamBalance(t).equity, 0)), bold: true },
      { label: '   - Opening Equity', values: realTeams.map(t => formatCurrency(getTeamBalance(t).openingEquity, 0)) },
      { label: '   - Current Net Profit', values: realTeams.map(t => formatCurrency(getTeamBalance(t).netProfit, 0)) },
      { label: 'Total Liabilities', values: realTeams.map(t => formatCurrency(getTeamBalance(t).liabilities, 0)), bold: true },
      { label: '   - Long-Term Loans & Debt', values: realTeams.map(t => formatCurrency(getTeamBalance(t).longTermDebt, 0)) },
      { label: '   - Current Liabilities (Payables/Overdraft)', values: realTeams.map(t => formatCurrency(getTeamBalance(t).currentLiabilities, 0)) },
      { label: 'TOTAL EQUITY & LIABILITIES', values: realTeams.map(t => formatCurrency(getTeamBalance(t).totalEquityLiabilities, 0)), bold: true, bg: 'bg-slate-100' }
    ];

    const kpiRows = [
      { label: 'GP Margin (Total)', values: realTeams.map(t => getTeamKpis(t).gpMargin) },
      { label: 'Net Profit Margin', values: realTeams.map(t => getTeamKpis(t).netMargin) },
      { label: 'Asset Turnover', values: realTeams.map(t => getTeamKpis(t).assetTurnover) },
      { label: 'Debt Equity', values: realTeams.map(t => getTeamKpis(t).debtEquity) },
      { label: 'ROE', values: realTeams.map(t => getTeamKpis(t).roe) }
    ];

    return {
      income: incomeRows,
      balance: balanceRows,
      kpis: kpiRows
    };
  }, [currentClass, realTeams]);





  const activeDecisionsData = dynamicDecisionsData || { marketing: [], operations: [], hr: [], procurement: [], finance: [] };
  const activePerformanceData = dynamicPerformanceData || { income: [], balance: [], kpis: [] };
  const activeMarketData = dynamicMarketData || [];

  const formatCellValue = (value: string) => {
      const trimmed = value.trim();

      if (trimmed.includes('%')) {
          const numeric = parseNumber(trimmed.replace('%', ''));
          return formatPercent(numeric, 2, false);
      }

      if (trimmed.startsWith('R') || trimmed.startsWith('+R') || trimmed.startsWith('-R')) {
          const clean = trimmed.replace('+', '').replace('-', '').replace('R', '').trim();
          const numeric = parseNumber(clean);
          const formatted = formatCurrency(numeric, 0).replace('R ', 'R\u00a0');
          return trimmed.startsWith('-') ? `-${formatted}` : (trimmed.startsWith('+') ? `+${formatted}` : formatted);
      }

      if (trimmed.endsWith('days')) {
          return trimmed; // Already formatted
      }

      if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
          const rest = trimmed.slice(1).trim();
          if (/^\d+$/.test(rest.replace(/\s/g, ''))) {
              const numeric = parseNumber(rest.replace(/\s/g, ''));
              return trimmed.startsWith('+') ? `+${formatNumber(numeric, 0)}` : `-${formatNumber(numeric, 0)}`;
          }
          return value;
      }

      const numeric = parseNumber(trimmed.replace(/\s/g, ''));
      if (!Number.isNaN(numeric) && /^\d+$/.test(trimmed.replace(/\s/g, ''))) {
          return formatNumber(numeric, 0);
      }

      return value.replace(/R\s/g, 'R\u00a0');
  };

  const renderMultiTeamRow = (label: string, values: string[], bold = false, bg = '') => (
      <tr key={label} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${bg} ${bold ? 'font-bold' : ''}`}>
          <td className={`py-2 px-4 text-left text-xs sm:text-sm text-slate-700 ${bold ? 'font-bold' : ''}`}>{label}</td>
          {values.map((v, idx) => (
              <td key={idx} className={`py-2 px-1 text-center text-xs font-mono whitespace-nowrap ${bold ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                  {formatCellValue(v)}
              </td>
          ))}
      </tr>
  );

  const renderTeamTabs = () => (
      <div className="flex overflow-x-auto gap-2 p-4 bg-slate-50 border-b border-slate-100 scrollbar-none">
          {activeTeams.map((team, idx) => (
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

  const shouldHideReports = isStudent && currentPeriod === 1 && !showReportsSetting;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24">
      
      {/* Facilitator Warning Banner */}
      {!isStudent && currentPeriod === 1 && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-indigo-700">
                <strong>Facilitator View:</strong> These reports are currently hidden from students during Year 1. Students see a note indicating reports are only available from Year 2. You can enable them for students in the class configurations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">Market Reports</h1>
            {availableYears.length > 1 ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-mono text-xs font-extrabold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Select Period:</span>
                <select
                  value={reportPeriod}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white border border-blue-300 text-blue-900 text-xs font-extrabold rounded px-2 py-0.5 shadow-2xs cursor-pointer focus:outline-none"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-mono text-xs font-extrabold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Showing Reports for Year {reportPeriod}
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">Comparative industry analysis and competitive intelligence.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Facilitator Export Controls (Only visible to Facilitator/Admin) */}
          {!isStudent && (
            <div className="flex items-center gap-2">
              {/* PDF Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setExportPdfOpen(!exportPdfOpen);
                    setExportCsvOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all hover:scale-[1.02]"
                >
                  <FileText size={15} />
                  <span>Download PDF</span>
                  <ChevronDown size={14} />
                </button>

                {exportPdfOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150">
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      PDF Export Options
                    </div>
                    <button
                      onClick={() => {
                        exportReportPDF('all', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportPdfOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors"
                    >
                      <Download size={14} className="text-red-600" />
                      Download All Reports (Single PDF)
                    </button>
                    <button
                      onClick={async () => {
                        setExportPdfOpen(false);
                        await downloadDebriefDeckPdf(debriefDataset);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 flex items-center gap-2 transition-colors border-t border-b border-indigo-100"
                    >
                      <Presentation size={14} className="text-indigo-600" />
                      Debrief Presentation Deck PDF (Year {reportPeriod})
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button
                      onClick={() => {
                        exportReportPDF('decisions', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportPdfOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Industry Decisions PDF
                    </button>
                    <button
                      onClick={() => {
                        exportReportPDF('performance', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportPdfOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Income Statement PDF
                    </button>
                    <button
                      onClick={() => {
                        exportReportPDF('balance', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportPdfOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Balance Sheet PDF
                    </button>
                    <button
                      onClick={() => {
                        exportReportPDF('ratios', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportPdfOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Financial Ratios & KPIs PDF
                    </button>
                    <button
                      onClick={() => {
                        exportReportPDF('market', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportPdfOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Market Share & Scores PDF
                    </button>
                  </div>
                )}
              </div>

              {/* CSV Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setExportCsvOpen(!exportCsvOpen);
                    setExportPdfOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all hover:scale-[1.02]"
                >
                  <FileSpreadsheet size={15} />
                  <span>Download CSV</span>
                  <ChevronDown size={14} />
                </button>

                {exportCsvOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150">
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      CSV Export Options
                    </div>
                    <button
                      onClick={() => {
                        exportReportCSV('all', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportCsvOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors"
                    >
                      <Download size={14} className="text-emerald-600" />
                      Download All Reports (Combined CSV)
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button
                      onClick={() => {
                        exportReportCSV('decisions', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportCsvOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Industry Decisions CSV
                    </button>
                    <button
                      onClick={() => {
                        exportReportCSV('performance', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportCsvOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Income Statement CSV
                    </button>
                    <button
                      onClick={() => {
                        exportReportCSV('balance', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportCsvOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Balance Sheet CSV
                    </button>
                    <button
                      onClick={() => {
                        exportReportCSV('ratios', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportCsvOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Financial Ratios & KPIs CSV
                    </button>
                    <button
                      onClick={() => {
                        exportReportCSV('market', {
                          className: currentClass?.name || 'Class Simulation',
                          period: reportPeriod,
                          activeTeams,
                          decisionsData: dynamicDecisionsData,
                          performanceData: dynamicPerformanceData,
                          marketData: dynamicMarketData
                        });
                        setExportCsvOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      Market Share & Scores CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          {!shouldHideReports && (
            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-1">
                {[
                    { id: 'decisions', label: 'Industry Decisions', icon: Layers },
                    { id: 'performance', label: 'Industry Performance', icon: TrendingUp },
                    { id: 'marketData', label: 'Market Data', icon: Table },
                    { id: 'debriefSlides', label: 'Debrief Slides', icon: Presentation },
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
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`${shouldHideReports ? '' : 'min-h-[600px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'}`}>
        
        {shouldHideReports ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
              <BarChart2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Market Reports Unavailable</h2>
            <p className="text-slate-500 max-w-md text-sm leading-relaxed">
              Market Reports and competitive industry intelligence are only available from **Year 2** onwards once the initial decisions have been processed.
            </p>
          </div>
        ) : (
          <>
            {/* --- TAB 4: DEBRIEF PRESENTATION SLIDES --- */}
            {activeTab === 'debriefSlides' && (
              <DebriefSlidesViewer classId={currentClassId || ''} period={reportPeriod} />
            )}

            {/* --- TAB 1: INDUSTRY DECISIONS --- */}
            {activeTab === 'decisions' && (
              <div className="p-0 lg:p-6">
                  {/* Desktop Matrix View */}
                  <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-sm min-w-[1000px] table-fixed">
                          <colgroup>
                              <col className="w-64" />
                              {activeTeams.map((_, i) => (
                                  <col key={i} style={{ width: `${(100 - 24) / Math.max(1, activeTeams.length)}%` }} />
                              ))}
                          </colgroup>
                          <thead>
                              <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
                                  <th className="py-3 px-4 text-left font-bold w-64">Metric</th>
                                  {activeTeams.map((team, i) => (
                                      <th key={i} className="py-3 px-2 text-center font-bold align-top">
                                          <div className="flex flex-col items-center">
                                              <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Team {i + 1}</span>
                                              <span className="text-slate-800 text-xs font-bold leading-tight line-clamp-2 break-words text-center min-h-[2.25rem] flex items-center justify-center" title={team}>
                                                  {team}
                                              </span>
                                          </div>
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody>
                              {/* Marketing Section */}
                              <tr className="bg-indigo-600 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Marketing & Sales Decisions</td></tr>
                              {activeDecisionsData.marketing.map((row) => renderMultiTeamRow(row.label, row.values))}

                              {/* Operations Section */}
                              <tr className="bg-indigo-600 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Operations Decisions</td></tr>
                              {activeDecisionsData.operations.map((row) => renderMultiTeamRow(row.label, row.values))}

                              {/* HR Section */}
                              <tr className="bg-indigo-600 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Human Resources Decisions</td></tr>
                              {activeDecisionsData.hr.map((row) => renderMultiTeamRow(row.label, row.values))}

                              {/* Procurement Section */}
                              <tr className="bg-indigo-600 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Procurement Decisions</td></tr>
                              {activeDecisionsData.procurement.map((row) => renderMultiTeamRow(row.label, row.values))}

                              {/* Finance Section */}
                              <tr className="bg-indigo-600 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Finance Decisions</td></tr>
                              {activeDecisionsData.finance.map((row) => renderMultiTeamRow(row.label, row.values))}
                          </tbody>
                      </table>
                  </div>

                 {/* Mobile Tabbed View */}
                 <div className="block lg:hidden">
                     {renderTeamTabs()}
                     <div className="p-4 space-y-6">
                         {/* Marketing Section */}
                         <div className="space-y-2">
                             <h4 className="bg-indigo-600 text-white py-1.5 px-3 rounded font-bold text-sm">Marketing & Sales Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {activeDecisionsData.marketing.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>

                         {/* Operations Section */}
                         <div className="space-y-2">
                             <h4 className="bg-indigo-600 text-white py-1.5 px-3 rounded font-bold text-sm">Operations Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {activeDecisionsData.operations.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>

                         {/* HR Section */}
                         <div className="space-y-2">
                             <h4 className="bg-indigo-600 text-white py-1.5 px-3 rounded font-bold text-sm">Human Resources Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {activeDecisionsData.hr.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>

                         {/* Procurement Section */}
                         <div className="space-y-2">
                             <h4 className="bg-indigo-600 text-white py-1.5 px-3 rounded font-bold text-sm">Procurement Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {activeDecisionsData.procurement.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
                             </div>
                         </div>

                         {/* Finance Section */}
                         <div className="space-y-2">
                             <h4 className="bg-indigo-600 text-white py-1.5 px-3 rounded font-bold text-sm">Finance Decisions</h4>
                             <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                 {activeDecisionsData.finance.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
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
                     <table className="w-full text-sm min-w-[1000px] table-fixed">
                         <colgroup>
                             <col className="w-64" />
                             {activeTeams.map((_, i) => (
                                 <col key={i} style={{ width: `${(100 - 24) / Math.max(1, activeTeams.length)}%` }} />
                             ))}
                         </colgroup>
                         <thead>
                             <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
                                 <th className="py-3 px-4 text-left font-bold w-64">Metric</th>
                                 {activeTeams.map((team, i) => (
                                     <th key={i} className="py-3 px-2 text-center font-bold align-top">
                                         <div className="flex flex-col items-center">
                                             <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Team {i + 1}</span>
                                             <span className="text-slate-800 text-xs font-bold leading-tight line-clamp-2 break-words text-center min-h-[2.25rem] flex items-center justify-center" title={team}>
                                                 {team}
                                             </span>
                                         </div>
                                     </th>
                                 ))}
                             </tr>
                         </thead>
                         <tbody>
                             <tr className="bg-emerald-500 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Income Statement</td></tr>
                             {activePerformanceData.income.map((row) => renderMultiTeamRow(row.label, row.values, row.bold, row.bg))}

                             <tr className="bg-emerald-500 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Balance Sheet</td></tr>
                             {activePerformanceData.balance.map((row) => renderMultiTeamRow(row.label, row.values, row.bold, row.bg))}

                             <tr className="bg-emerald-500 text-white"><td colSpan={activeTeams.length + 1} className="py-2 px-4 font-bold">Key Performance Indicators (KPIs)</td></tr>
                             {activePerformanceData.kpis.map((row) => renderMultiTeamRow(row.label, row.values))}
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
                                 {activePerformanceData.income.map((row) => (
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
                                 {activePerformanceData.balance.map((row) => (
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
                                 {activePerformanceData.kpis.map((row) => renderMobileMetricRow(row.label, row.values[selectedMobileTeam]))}
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
                 {activeMarketData.map((productData) => (
                       <div key={productData.product} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                           <div className="bg-slate-100 px-6 py-3 font-bold text-lg text-slate-800 border-b border-slate-200">
                               {productData.product} - Market Share Calculation
                           </div>
                           
                           {/* Desktop View */}
                           <div className="hidden lg:block overflow-x-auto">
                              <table className="w-full text-sm table-fixed">
                                  <colgroup>
                                      <col className="w-48" />
                                      <col className="w-20" />
                                      {activeTeams.map((_, i) => (
                                          <col key={i} style={{ width: `${(100 - 30) / Math.max(1, activeTeams.length)}%` }} />
                                      ))}
                                  </colgroup>
                                  <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                          <th className="py-2 px-4 text-left font-bold w-48">Criteria</th>
                                          <th className="py-2 px-4 text-center font-bold w-20">Rating</th>
                                          {activeTeams.map((team, i) => (
                                              <th key={i} className="py-2 px-2 text-center font-bold align-top">
                                                  <span className="text-slate-800 text-xs font-bold leading-tight line-clamp-2 break-words text-center min-h-[2.25rem] flex items-center justify-center block" title={team}>
                                                      {team}
                                                  </span>
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
                                       <table className="w-full text-xs table-fixed">
                                           <colgroup>
                                                <col className="w-68" />
                                                {activeTeams.map((_, i) => (
                                                    <col key={i} style={{ width: `${(100 - 30) / Math.max(1, activeTeams.length)}%` }} />
                                                ))}
                                            </colgroup>
                                           <tbody>
                                               <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600 w-68">Price</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Price', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                               <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">Payment Terms</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Payment Terms', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                               <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">Availability: Factory Capacity</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Availability', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                               <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">Stores (Opening + Decisions)</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Stores', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                                <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">Agents</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Agents', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                               <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">CS Headcount</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'CS Headcount', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                               <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">Cumulative Features</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Cumulative Features', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                                <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">Company Advertising</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Company Advertising', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                               <tr className="border-b border-slate-200">
                                                   <td className="py-1 px-4 font-semibold text-slate-600">Product Advertising</td>
                                                   {activeTeams.map((_, i) => (
                                                       <td key={i} className="py-1 px-2 text-center font-mono">
                                                           {getDecisionRefValue(productData.product, 'Product Advertising', i)}
                                                       </td>
                                                   ))}
                                               </tr>
                                           </tbody>
                                       </table>
                                  </div>
                              </div>

                               {/* Demand & Inventory Units Breakdown Section */}
                               <div className="bg-white p-4 border-t border-slate-200">
                                   <h4 className="font-bold text-slate-800 text-xs uppercase mb-3 flex items-center gap-1.5">
                                       <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                       {productData.product} : Demand & Inventory Units Breakdown
                                   </h4>
                                   <div className="grid grid-cols-1 overflow-x-auto">
                                        <table className="w-full text-xs table-fixed">
                                            <colgroup>
                                                <col className="w-68" />
                                                {activeTeams.map((_, i) => (
                                                    <col key={i} style={{ width: `${(100 - 30) / Math.max(1, activeTeams.length)}%` }} />
                                                ))}
                                            </colgroup>
                                            <tbody>
                                                <tr className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-2 px-4 font-semibold text-slate-700">Demand Forecasted (Units)</td>
                                                    {activeTeams.map((_, i) => {
                                                        const pId = productData.product.toLowerCase() === 'techbook' ? 'techbook' : (productData.product.toLowerCase() === 'zroid' ? 'zroid' : 'itab');
                                                        const dec = realTeams[i] ? getDecisionsForTeamPeriod(realTeams[i], reportPeriod) : INITIAL_DECISIONS;
                                                        const sharePct = dec.marketing?.forecastedMarketShare?.[pId] ?? 0;
                                                        const mktDemand = getMarketSize(pId, reportPeriod);
                                                        const fcUnits = Math.round((sharePct / 100) * mktDemand);
                                                        return (
                                                            <td key={i} className="py-2 px-2 text-center font-mono font-medium text-slate-600 whitespace-nowrap">
                                                                {formatNumber(fcUnits, 0)}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                <tr className="border-b border-slate-100 bg-blue-50/50 hover:bg-blue-100/50">
                                                    <td className="py-2 px-4 font-bold text-blue-900">Demand Earned (Units)</td>
                                                    {activeTeams.map((_, i) => {
                                                        const pId = productData.product.toLowerCase() === 'techbook' ? 'techbook' : (productData.product.toLowerCase() === 'zroid' ? 'zroid' : 'itab');
                                                        const res = computeMarketShareBackModel(realTeams, reportPeriod).find(r => r.productId === pId);
                                                        const earned = res ? Math.round(res.demandUnitsByTeam[i] || 0) : 0;
                                                        return (
                                                            <td key={i} className="py-2 px-2 text-center font-mono font-bold text-blue-900 whitespace-nowrap">
                                                                {formatNumber(earned, 0)}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                <tr className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-2 px-4 font-semibold text-slate-700">Available Units (Stock)</td>
                                                    {activeTeams.map((_, i) => {
                                                        const pId = productData.product.toLowerCase() === 'techbook' ? 'techbook' : (productData.product.toLowerCase() === 'zroid' ? 'zroid' : 'itab');
                                                        const res = computeMarketShareBackModel(realTeams, reportPeriod).find(r => r.productId === pId);
                                                        const avail = res ? Math.round(res.availableByTeam[i] || 0) : 0;
                                                        return (
                                                            <td key={i} className="py-2 px-2 text-center font-mono font-medium text-slate-600 whitespace-nowrap">
                                                                {formatNumber(avail, 0)}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                <tr className="border-b border-slate-100 bg-emerald-50/60 hover:bg-emerald-100/60">
                                                    <td className="py-2 px-4 font-bold text-emerald-900">Actual Units Sold</td>
                                                    {activeTeams.map((_, i) => {
                                                        const pId = productData.product.toLowerCase() === 'techbook' ? 'techbook' : (productData.product.toLowerCase() === 'zroid' ? 'zroid' : 'itab');
                                                        const res = computeMarketShareBackModel(realTeams, reportPeriod).find(r => r.productId === pId);
                                                        const sold = res ? Math.round(res.unitsSoldByTeam[i] || 0) : 0;
                                                        return (
                                                            <td key={i} className="py-2 px-2 text-center font-mono font-bold text-emerald-900 whitespace-nowrap">
                                                                {formatNumber(sold, 0)}
                                                            </td>
                                                        );
                                                    })}
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
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Price', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500">Payment Terms</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Payment Terms', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500">Availability: Factory Capacity</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Availability', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500">Stores (Opening + Decisions)</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Stores', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500">Agents</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Agents', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500">CS Headcount</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'CS Headcount', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500">Cumulative Features</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Cumulative Features', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500">Company Advertising</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Company Advertising', selectedMobileTeam)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-slate-500">Product Advertising</span>
                                                <span className="font-mono font-semibold">
                                                    {getDecisionRefValue(productData.product, 'Product Advertising', selectedMobileTeam)}
                                                </span>
                                            </div>
                                       </div>
                                   </div>

                                   <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                                        <h4 className="font-bold text-slate-800 text-xs uppercase mb-2 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                            {productData.product} : Demand & Units Breakdown
                                        </h4>
                                        {(() => {
                                            const pId = productData.product.toLowerCase() === 'techbook' ? 'techbook' : (productData.product.toLowerCase() === 'zroid' ? 'zroid' : 'itab');
                                            const res = computeMarketShareBackModel(realTeams, reportPeriod).find(r => r.productId === pId);
                                            const dec = realTeams[selectedMobileTeam] ? getDecisionsForTeamPeriod(realTeams[selectedMobileTeam], reportPeriod) : INITIAL_DECISIONS;
                                            const sharePct = dec.marketing?.forecastedMarketShare?.[pId] ?? 0;
                                            const mktDemand = getMarketSize(pId, reportPeriod);
                                            const fcUnits = Math.round((sharePct / 100) * mktDemand);
                                            const earned = res ? Math.round(res.demandUnitsByTeam[selectedMobileTeam] || 0) : 0;
                                            const avail = res ? Math.round(res.availableByTeam[selectedMobileTeam] || 0) : 0;
                                            const sold = res ? Math.round(res.unitsSoldByTeam[selectedMobileTeam] || 0) : 0;

                                            return (
                                                <>
                                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-600">Demand Forecasted</span>
                                                        <span className="font-mono font-medium text-slate-700">{formatNumber(fcUnits, 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-1 border-b border-slate-100 bg-blue-50/50 px-1 rounded">
                                                        <span className="font-bold text-blue-900">Demand Earned</span>
                                                        <span className="font-mono font-bold text-blue-900">{formatNumber(earned, 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-600">Available Units (Stock)</span>
                                                        <span className="font-mono font-medium text-slate-700">{formatNumber(avail, 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-1 bg-emerald-50/60 px-1 rounded">
                                                        <span className="font-bold text-emerald-900">Actual Units Sold</span>
                                                        <span className="font-mono font-bold text-emerald-900">{formatNumber(sold, 0)}</span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                       </div>
                  ))}
             </div>
        )}
          </>
        )}

      </div>
    </div>
  );
};

export default MarketReports;