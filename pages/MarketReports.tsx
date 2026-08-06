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
  ChevronDown
} from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { formatCurrency, formatNumber, formatPercent, parseNumber } from '../utils/numberFormat';
import { INITIAL_DECISIONS, PRODUCTS, SUPPLIERS, SUPPLIER_METRICS, STORE_COSTS, FINANCE_CONSTANTS, HR_ROLES, getMarketSize } from '../constants';
import { computeMarketShareBackModel, getClosingFeatures } from '../utils/marketShareBackModel';
import { exportReportCSV, exportReportPDF } from '../utils/reportExportHelpers';

const HR_ROLE_LABELS: Record<string, string> = {
  engineers: 'Engineers',
  technicians: 'Technicians',
  semiSkilled: 'Semi-Skilled Workers',
  adminSales: 'Admin & Sales',
  customerService: 'Customer Service'
};

type Tab = 'decisions' | 'performance' | 'marketData';

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

  // Dynamic Market Data calculation from actual backModel
  const dynamicMarketData = React.useMemo(() => {
    if (!currentClass || !realTeams || realTeams.length === 0) {
      return null;
    }
    
    const period = currentClass.currentPeriod;
    const results = computeMarketShareBackModel(realTeams, period);
    
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
        return {
          criteria: c.name,
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
      
      return {
        product: pName,
        data: [...criteriaRows, totalScoresRow, shareRow]
      };
    });
  }, [currentClass, realTeams]);

  // Dynamic Decisions Data mapping from actual team draftDecisions
  const dynamicDecisionsData = React.useMemo(() => {
    if (!currentClass || !realTeams || realTeams.length === 0) {
      return null;
    }

    const marketingRows = [
      {
        label: 'Price : TechBook',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatCurrency(dec.marketing?.prices?.techbook ?? 0, 0);
        })
      },
      {
        label: 'Price : Zroid',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatCurrency(dec.marketing?.prices?.zroid ?? 0, 0);
        })
      },
      {
        label: 'Price : iTab',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatCurrency(dec.marketing?.prices?.itab ?? 0, 0);
        })
      },
      {
        label: 'Market Share : TechBook',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${(dec.marketing?.forecastedMarketShare?.techbook ?? 0).toFixed(1)}%`;
        })
      },
      {
        label: 'Market Share : Zroid',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${(dec.marketing?.forecastedMarketShare?.zroid ?? 0).toFixed(1)}%`;
        })
      },
      {
        label: 'Market Share : iTab',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${(dec.marketing?.forecastedMarketShare?.itab ?? 0).toFixed(1)}%`;
        })
      },
      {
        label: 'Forecasted Units : TechBook',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const share = dec.marketing?.forecastedMarketShare?.techbook ?? 0;
          const period = currentClass?.currentPeriod || 1;
          const units = Math.round((getMarketSize('techbook', period) * share) / 100);
          return formatNumber(units, 0);
        })
      },
      {
        label: 'Forecasted Units : Zroid',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const share = dec.marketing?.forecastedMarketShare?.zroid ?? 0;
          const period = currentClass?.currentPeriod || 1;
          const units = Math.round((getMarketSize('zroid', period) * share) / 100);
          return formatNumber(units, 0);
        })
      },
      {
        label: 'Forecasted Units : iTab',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const share = dec.marketing?.forecastedMarketShare?.itab ?? 0;
          const period = currentClass?.currentPeriod || 1;
          const units = Math.round((getMarketSize('itab', period) * share) / 100);
          return formatNumber(units, 0);
        })
      },
      {
        label: 'Advertising Budget',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatCurrency(dec.marketing?.advertisingBudget ?? 0, 0);
        })
      },
      {
        label: 'Advertising : TechBook',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.marketing?.adSplits?.techbook ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Advertising : Zroid',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.marketing?.adSplits?.zroid ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Advertising : iTab',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.marketing?.adSplits?.itab ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Advertising : General',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.marketing?.generalAdSplit ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Company stores (Open / Close)',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const openClose = dec.marketing?.openCloseStores ?? 0;
          return openClose > 0 ? `+${openClose}` : `${openClose}`;
        })
      },
      {
        label: 'Agent Commission',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.marketing?.agentCommission ?? 0) * 100).toFixed(1)}%`;
        })
      }
    ];

    const operationsRows = [
      {
        label: 'TechBook : Units produced',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatNumber(dec.operations?.production?.techbook ?? 0, 0);
        })
      },
      {
        label: 'Zroid : Units produced',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatNumber(dec.operations?.production?.zroid ?? 0, 0);
        })
      },
      {
        label: 'iTab : Units produced',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatNumber(dec.operations?.production?.itab ?? 0, 0);
        })
      },
      {
        label: 'Production Capacity Change',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const change = dec.operations?.capacityChange ?? 0;
          return change > 0 ? `+${formatNumber(change, 0)}` : change < 0 ? `-${formatNumber(Math.abs(change), 0)}` : '0';
        })
      },
      {
        label: 'Innovation Budget',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatCurrency(dec.operations?.rdBudget ?? 0, 0);
        })
      },
      {
        label: 'TechBook : Innovation Split',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.operations?.rdSplits?.techbook ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'Zroid : Innovation Split',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.operations?.rdSplits?.zroid ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'iTab : Innovation Split',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${((dec.operations?.rdSplits?.itab ?? 0) * 100).toFixed(0)}%`;
        })
      },
      {
        label: 'TechBook : Closing Features',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatNumber(getClosingFeatures(t, dec, 'techbook'), 0);
        })
      },
      {
        label: 'Zroid : Closing Features',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatNumber(getClosingFeatures(t, dec, 'zroid'), 0);
        })
      },
      {
        label: 'iTab : Closing Features',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return formatNumber(getClosingFeatures(t, dec, 'itab'), 0);
        })
      }
    ];

    const hrRows: { label: string; values: string[] }[] = [];
    HR_ROLES.forEach(role => {
      hrRows.push({
        label: `${HR_ROLE_LABELS[role] || role} : Recruit/(Dismiss)`,
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const val = dec.hr?.hiring?.[role] ?? 0;
          return val > 0 ? `+${val}` : `${val}`;
        })
      });
      hrRows.push({
        label: `${HR_ROLE_LABELS[role] || role} : Salary`,
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const val = dec.hr?.salaries?.[role] ?? 0;
          return formatCurrency(val, 0);
        })
      });
      hrRows.push({
        label: `${HR_ROLE_LABELS[role] || role} : Training`,
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return dec.hr?.trainingLevels?.[role] ?? 'Basic';
        })
      });
    });

    const procurementRows: { label: string; values: string[] }[] = [];

    // Negotiation details
    procurementRows.push({
      label: 'Preferred Supplier (Negotiation)',
      values: realTeams.map(t => {
        const dec = t.draftDecisions || INITIAL_DECISIONS;
        return dec.negotiation?.selectedSupplierId || '—';
      })
    });
    procurementRows.push({
      label: 'Negotiation Status',
      values: realTeams.map(t => {
        const dec = t.draftDecisions || INITIAL_DECISIONS;
        return dec.negotiation?.status || 'NOT_STARTED';
      })
    });
    procurementRows.push({
      label: 'Agreed Negotiation Discount',
      values: realTeams.map(t => {
        const dec = t.draftDecisions || INITIAL_DECISIONS;
        return dec.negotiation?.status === 'AGREED' ? `${((dec.negotiation.agreedDiscount ?? 0) * 100).toFixed(1)}%` : '—';
      })
    });
    procurementRows.push({
      label: 'Agreed Negotiation Terms',
      values: realTeams.map(t => {
        const dec = t.draftDecisions || INITIAL_DECISIONS;
        return dec.negotiation?.status === 'AGREED' ? `${dec.negotiation.agreedPaymentTerms} days` : '—';
      })
    });

    // Supplier allocations
    PRODUCTS.forEach(p => {
      SUPPLIERS.forEach(s => {
        procurementRows.push({
          label: `${s} : ${p.name} Components`,
          values: realTeams.map(t => {
            const dec = t.draftDecisions || INITIAL_DECISIONS;
            return formatNumber(dec.procurement?.supplierAllocation?.[p.id]?.[s]?.components ?? 0, 0);
          })
        });
        procurementRows.push({
          label: `${s} : ${p.name} Finished Goods`,
          values: realTeams.map(t => {
            const dec = t.draftDecisions || INITIAL_DECISIONS;
            return formatNumber(dec.procurement?.supplierAllocation?.[p.id]?.[s]?.finishedGoods ?? 0, 0);
          })
        });
      });
    });

    const financeRows = [
      {
        label: 'TechBook : Debtor Days',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${dec.finance?.debtorsDays?.techbook ?? 0} days`;
        })
      },
      {
        label: 'Zroid : Debtor Days',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${dec.finance?.debtorsDays?.zroid ?? 0} days`;
        })
      },
      {
        label: 'iTab : Debtor Days',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          return `${dec.finance?.debtorsDays?.itab ?? 0} days`;
        })
      },
      {
        label: 'Debt (Raise / Pay)',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
          const debt = dec.finance?.debtChange ?? 0;
          return debt > 0 ? `+${formatCurrency(debt, 0)}` : debt < 0 ? `-${formatCurrency(Math.abs(debt), 0)}` : 'R 0';
        })
      },
      {
        label: 'Equity (Raise / Retire)',
        values: realTeams.map(t => {
          const dec = t.draftDecisions || INITIAL_DECISIONS;
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
    const period = currentClass.currentPeriod;
    const lastPeriod = period - 1;
    const backModelResults = computeMarketShareBackModel(realTeams, period);

    const getTeamIncome = (t: typeof realTeams[0], tIdx: number) => {
      const dec = t.draftDecisions || INITIAL_DECISIONS;

      // Calculate Revenue & COGS based on current period backModel simulation results
      let techbookRev = 0, zroidRev = 0, itabRev = 0;
      let techbookCogsVal = 0, zroidCogsVal = 0, itabCogsVal = 0;

      // Direct Labor Cost per unit calculation
      const totalProdUnits = (dec.operations?.production?.techbook || 0) + (dec.operations?.production?.zroid || 0) + (dec.operations?.production?.itab || 0);
      const techCount = (t.staffCounts?.technicians || 150) + (dec.hr?.hiring?.technicians || 0);
      const semiCount = (t.staffCounts?.semiSkilled || 200) + (dec.hr?.hiring?.semiSkilled || 0);
      const techSalary = dec.hr?.salaries?.technicians || 38000;
      const semiSalary = dec.hr?.salaries?.semiSkilled || 30000;
      const totalProdStaffCost = (techCount * techSalary + semiCount * semiSalary) * 8;
      const laborCostPerUnit = totalProdUnits > 0 ? (totalProdStaffCost / totalProdUnits) : 350;

      const pKeys: ('techbook' | 'zroid' | 'itab')[] = ['techbook', 'zroid', 'itab'];
      pKeys.forEach(pId => {
        const res = backModelResults.find(r => r.productId === pId);
        const unitsSold = res ? (res.unitsSoldByTeam[tIdx] || 0) : 0;
        const price = dec.marketing?.prices?.[pId] ?? 0;
        const rev = unitsSold * price;

        // Procurement Component Cost
        let componentCost = pId === 'techbook' ? 1200 : (pId === 'zroid' ? 1400 : 1000);
        const alloc = dec.procurement?.supplierAllocation?.[pId];
        if (alloc) {
          let compSum = 0;
          let compCount = 0;
          Object.entries(alloc).forEach(([supId, val]: [string, any]) => {
            if (val && val.components > 0) {
              const supMetric = (SUPPLIER_METRICS as any)[supId];
              const supPrice = supMetric?.unitPrices?.[pId] ?? (pId === 'techbook' ? 1200 : (pId === 'zroid' ? 1400 : 1000));
              compSum += supPrice * val.components;
              compCount += val.components;
            }
          });
          if (compCount > 0) {
            componentCost = compSum / compCount;
          }
        }

        const unitCogs = componentCost + laborCostPerUnit;
        const cogs = unitsSold * unitCogs;

        if (pId === 'techbook') { techbookRev = rev; techbookCogsVal = cogs; }
        else if (pId === 'zroid') { zroidRev = rev; zroidCogsVal = cogs; }
        else { itabRev = rev; itabCogsVal = cogs; }
      });

      const totalRev = techbookRev + zroidRev + itabRev;
      const totalCogs = techbookCogsVal + zroidCogsVal + itabCogsVal;
      const grossProfit = totalRev - totalCogs;

      // 1. Dynamic Marketing & Advertising Spend
      const adMkt = dec.marketing?.advertisingBudget ?? 12500000;

      // 2. Dynamic Store Costs (Running + Opening/Closing)
      const openCloseStores = dec.marketing?.openCloseStores ?? 0;
      const finalStoreCount = Math.max(0, (t.storeCount || 5) + openCloseStores);
      const storeRunCost = finalStoreCount * STORE_COSTS.running;
      const storeTransCost = openCloseStores > 0 
        ? openCloseStores * STORE_COSTS.opening 
        : (openCloseStores < 0 ? Math.abs(openCloseStores) * STORE_COSTS.closing : 0);
      const storeCost = storeRunCost + storeTransCost;

      // 3. Dynamic Agent Commission (52% channel sales * commission rate decimal)
      const agentSales = totalRev * 0.52;
      const agentCommRate = dec.marketing?.agentCommission ?? 0;
      const agentComm = Math.round(agentSales * agentCommRate);

      // 4. Dynamic HR Payroll & Training
      let opexPayroll = 0;
      let opexTraining = 0;
      const hrRoles = ['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'] as const;
      const baseStaffCounts: Record<string, number> = { engineers: 50, technicians: 150, semiSkilled: 200, adminSales: 40, customerService: 20 };
      const baseSalaries: Record<string, number> = { engineers: 55000, technicians: 38000, semiSkilled: 30000, adminSales: 20000, customerService: 9250 };
      const trainingCosts: Record<string, number> = { None: 0, Basic: 5000, Advanced: 15000, Specialized: 30000 };

      hrRoles.forEach(r => {
        const count = (t.staffCounts?.[r] ?? baseStaffCounts[r] ?? 0) + (dec.hr?.hiring?.[r] ?? 0);
        const monthlySalary = dec.hr?.salaries?.[r] ?? baseSalaries[r] ?? 0;
        const trainingLevel = dec.hr?.trainingLevels?.[r] ?? 'None';
        const trCostPer = trainingCosts[trainingLevel] || 0;

        opexTraining += count * trCostPer;

        // Production workers (technicians & semiSkilled) are allocated to COGS; admin & engineers are in opexPayroll
        if (r !== 'technicians' && r !== 'semiSkilled') {
          opexPayroll += count * monthlySalary * 8;
        }
      });

      // 5. Dynamic R&D / Innovation Budget
      const rdCost = dec.operations?.innovationBudget ?? dec.operations?.rdBudget ?? 4000000;

      // 6. Dynamic Other Operational Expenses
      const sumOtherExpenses = adMkt + storeCost + agentComm + opexPayroll + opexTraining + rdCost;
      const otherOpex = Math.round(sumOtherExpenses * 0.0797);

      const totalOpEx = sumOtherExpenses + otherOpex;

      const ebitda = grossProfit - totalOpEx;
      const depr = 1535965;
      const forecastedLongTermDebt = Math.max(0, (t.longTermDebt || 50000000) + (dec.finance?.debtChange || 0));
      const startCash = t.cashBalance || 0;
      const overdraftInterest = startCash < 0 ? Math.round(Math.abs(startCash) * (FINANCE_CONSTANTS?.overdraftInterestRate || 0.15)) : 0;
      const debtInterest = forecastedLongTermDebt > 0 ? Math.round(forecastedLongTermDebt * (FINANCE_CONSTANTS?.interestRate || 0.065)) : 0;
      const finCharges = debtInterest + overdraftInterest;
      const ebt = ebitda - depr - finCharges;
      const taxation = ebt > 0 ? Math.round(ebt * (FINANCE_CONSTANTS?.taxRate || 0.28)) : 0;
      const netProfit = ebt - taxation;

      return {
        totalRevenue: totalRev,
        techbookRevenue: techbookRev,
        zroidRevenue: zroidRev,
        itabRevenue: itabRev,
        cogs: totalCogs,
        techbookCogs: techbookCogsVal,
        zroidCogs: zroidCogsVal,
        itabCogs: itabCogsVal,
        grossProfit,
        opexMarketing: adMkt,
        opexStore: storeCost,
        opexPayroll: opexPayroll,
        opexRD: rdCost,
        opexAgents: agentComm,
        opexTraining: opexTraining,
        opexOther: otherOpex,
        opEx: totalOpEx,
        ebitda,
        depreciation: depr,
        financeCharges: finCharges,
        ebt,
        taxation,
        netProfit
      };
    };

    const incomeRows = [
      { label: 'Total Revenue', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).totalRevenue, 0)), bold: true },
      { label: '   - TechBook Revenue', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).techbookRevenue, 0)) },
      { label: '   - Zroid Revenue', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).zroidRevenue, 0)) },
      { label: '   - iTab Revenue', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).itabRevenue, 0)) },
      { label: 'Total COGS / Cost of Sales', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).cogs, 0)), bold: true },
      { label: '   - TechBook COGS', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).techbookCogs, 0)) },
      { label: '   - Zroid COGS', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).zroidCogs, 0)) },
      { label: '   - iTab COGS', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).itabCogs, 0)) },
      { label: 'Total Gross Profit (GP)', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).grossProfit, 0)), bold: true },
      { label: 'Operating Expenses:', values: realTeams.map(() => ''), bold: true },
      { label: '   - Advertising & Marketing', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opexMarketing, 0)) },
      { label: '   - Store Costs', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opexStore, 0)) },
      { label: '   - Payroll (Salaries)', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opexPayroll, 0)) },
      { label: '   - R & D (Innovation)', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opexRD, 0)) },
      { label: '   - Agent Commissions', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opexAgents, 0)) },
      { label: '   - Staff Development (Training)', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opexTraining, 0)) },
      { label: '   - Other Operational Expenses', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opexOther, 0)) },
      { label: 'Total Operating Expenses', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).opEx, 0)), bold: true },
      { label: 'EBITDA', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).ebitda, 0)), bold: true },
      { label: '   - Depreciation', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).depreciation, 0)) },
      { label: '   - Finance Charges', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).financeCharges, 0)) },
      { label: 'EBT', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).ebt, 0)), bold: true },
      { label: '   - Taxation', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).taxation, 0)) },
      { label: 'Net Profit for the period', values: realTeams.map((t, i) => formatCurrency(getTeamIncome(t, i).netProfit, 0)), bold: true, bg: 'bg-emerald-50' }
    ];

    const getTeamBalance = (t: typeof realTeams[0], inc: ReturnType<typeof getTeamIncome>) => {
      const dec = t.draftDecisions || INITIAL_DECISIONS;
      const tIdx = realTeams.indexOf(t);

      // 1. Non-Current Assets (Fixed Assets)
      const startPPE = t.fixedAssets || 293500000;
      const capex = (dec.operations?.capacityChange || 0) * 1500;
      const nonCurrAssets = Math.max(0, startPPE + capex - inc.depreciation);

      // 2. Accounts Receivables
      const debtorsDays = (dec.finance?.debtorsDays?.techbook || 30);
      const recVal = Math.round((inc.totalRevenue / 365) * debtorsDays);

      // 3. Inventory Valuation (Unsold units * unit cost)
      const pKeys: ('techbook' | 'zroid' | 'itab')[] = ['techbook', 'zroid', 'itab'];
      let invVal = 0;
      pKeys.forEach(pId => {
        const res = backModelResults.find(r => r.productId === pId);
        const unitsSold = res ? (res.unitsSoldByTeam[tIdx] || 0) : 0;
        const available = res ? (res.availableByTeam[tIdx] || 0) : 0;
        const unsold = Math.max(0, available - unitsSold);
        const stdCost = pId === 'techbook' ? 1400 : (pId === 'zroid' ? 1350 : 1100);
        invVal += unsold * stdCost;
      });

      // 4. Equity & Net Profit
      const openEq = t.shareholdersEquity || 286564937;
      const equityChange = dec.finance?.equityChange || 0;
      const dividends = dec.finance?.dividends || 0;
      const netProf = inc.netProfit;
      const totEq = openEq + equityChange - dividends + netProf;

      // 5. Liabilities (Long-term Debt + Current Liabilities / Payables)
      const longTermDebt = Math.max(0, (t.longTermDebt || 50000000) + (dec.finance?.debtChange || 0));
      const currentLiabilities = Math.round(inc.cogs * 0.25);
      const liab = longTermDebt + currentLiabilities;

      // 6. Cash Balance (Allows negative cash for bank overdrafts)
      const startCash = t.cashBalance ?? 180000000;
      const debtChange = dec.finance?.debtChange || 0;
      const cashVal = startCash + netProf + debtChange + equityChange - dividends - capex;

      const totCurrAssets = cashVal + recVal + invVal;
      const totAssets = nonCurrAssets + totCurrAssets;

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
        liabilities: liab,
        totalEquityLiabilities: totEq + liab
      };
    };

    const getTeamKpis = (t: typeof realTeams[0], inc: ReturnType<typeof getTeamIncome>, bal: ReturnType<typeof getTeamBalance>) => {
      if (t.history && t.history[lastPeriod]?.kpis) {
        const k = t.history[lastPeriod].kpis;
        return {
          gpMargin: `${((k.gpMargin ?? (inc.totalRevenue > 0 ? inc.grossProfit / inc.totalRevenue : 0)) * 100).toFixed(1)}%`,
          netMargin: `${((k.netMargin ?? (inc.totalRevenue > 0 ? inc.netProfit / inc.totalRevenue : 0)) * 100).toFixed(1)}%`,
          assetTurnover: `${((k.assetTurnover ?? (bal.totalAssets > 0 ? inc.totalRevenue / bal.totalAssets : 0)) * 100).toFixed(1)}%`,
          debtEquity: `${((k.debtEquity ?? (bal.equity > 0 ? bal.liabilities / bal.equity : 0)) * 100).toFixed(1)}%`,
          roe: `${((k.roe !== undefined ? k.roe : (bal.equity > 0 ? inc.netProfit / bal.equity : 0)) * 100).toFixed(1)}%`
        };
      }

      const gpM = inc.totalRevenue > 0 ? (inc.grossProfit / inc.totalRevenue) * 100 : 0;
      const netM = inc.totalRevenue > 0 ? (inc.netProfit / inc.totalRevenue) * 100 : 0;
      const assetT = bal.totalAssets > 0 ? (inc.totalRevenue / bal.totalAssets) * 100 : 0;
      const debtE = bal.equity > 0 ? (bal.liabilities / bal.equity) * 100 : 0;
      const roeVal = bal.equity > 0 ? (inc.netProfit / bal.equity) * 100 : 0;

      return {
        gpMargin: `${gpM.toFixed(1)}%`,
        netMargin: `${netM.toFixed(1)}%`,
        assetTurnover: `${assetT.toFixed(1)}%`,
        debtEquity: `${debtE.toFixed(1)}%`,
        roe: `${roeVal.toFixed(1)}%`
      };
    };



    const balanceRows = [
      { label: 'Total Non-Current Assets', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).nonCurrentAssets, 0)), bold: true },
      { label: 'Total Current Assets', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).currentAssets, 0)), bold: true },
      { label: '   - Cash & Cash Equivalents', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).cash, 0)) },
      { label: '   - Accounts Receivables', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).receivables, 0)) },
      { label: '   - Inventory', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).inventory, 0)) },
      { label: 'TOTAL ASSETS', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).totalAssets, 0)), bold: true, bg: 'bg-slate-100' },
      { label: 'Total Equity', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).equity, 0)), bold: true },
      { label: '   - Opening Equity', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).openingEquity, 0)) },
      { label: '   - Current Net Profit', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).netProfit, 0)) },
      { label: 'Total Liabilities', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).liabilities, 0)), bold: true },
      { label: 'TOTAL EQUITY & LIABILITIES', values: realTeams.map((t, i) => formatCurrency(getTeamBalance(t, getTeamIncome(t, i)).totalEquityLiabilities, 0)), bold: true, bg: 'bg-slate-100' }
    ];

    const kpiRows = [
      { label: 'GP Margin (Total)', values: realTeams.map((t, i) => getTeamKpis(t, getTeamIncome(t, i), getTeamBalance(t, getTeamIncome(t, i))).gpMargin) },
      { label: 'Net Profit Margin', values: realTeams.map((t, i) => getTeamKpis(t, getTeamIncome(t, i), getTeamBalance(t, getTeamIncome(t, i))).netMargin) },
      { label: 'Asset Turnover', values: realTeams.map((t, i) => getTeamKpis(t, getTeamIncome(t, i), getTeamBalance(t, getTeamIncome(t, i))).assetTurnover) },
      { label: 'Debt Equity', values: realTeams.map((t, i) => getTeamKpis(t, getTeamIncome(t, i), getTeamBalance(t, getTeamIncome(t, i))).debtEquity) },
      { label: 'ROE', values: realTeams.map((t, i) => getTeamKpis(t, getTeamIncome(t, i), getTeamBalance(t, getTeamIncome(t, i))).roe) }
    ];

    return {
      income: incomeRows,
      balance: balanceRows,
      kpis: kpiRows
    };
  }, [currentClass, realTeams]);



  const getDecisionRefValue = (productName: string, field: string, teamIdx: number) => {
    if (!currentClass || !realTeams[teamIdx]) return '—';
    const t = realTeams[teamIdx];
    const dec = t.draftDecisions || INITIAL_DECISIONS;
    const pId = productName.toLowerCase() === 'techbook' ? 'techbook' : (productName.toLowerCase() === 'zroid' ? 'zroid' : 'itab');

    switch (field) {
      case 'Price':
        return formatCurrency(dec.marketing?.prices?.[pId] ?? 0, 0);
      case 'Payment Terms':
        return `${dec.finance?.debtorsDays?.[pId] ?? 0} days`;
      case 'Availability':
        return formatNumber((t.factoryCapacity || 0) + (dec.operations?.capacityChange ?? 0), 0);
      case 'Stores':
        return formatNumber((t.storeCount || 0) + (dec.marketing?.openCloseStores ?? 0), 0);
      case 'Agents':
        return formatPercent(dec.marketing?.agentCommission ?? 0, 2, true);
      case 'CS Headcount':
        return formatNumber(Math.max(0, (t.staffCounts?.customerService || 0) + (dec.hr?.hiring?.customerService ?? 0)), 0);
      case 'Cumulative Features':
        return formatNumber(getClosingFeatures(t, dec, pId), 0);
      case 'Company Advertising':
        return formatCurrency((dec.marketing?.advertisingBudget ?? 0) * (dec.marketing?.generalAdSplit ?? 0), 0);
      case 'Product Advertising':
        return formatCurrency((dec.marketing?.advertisingBudget ?? 0) * (dec.marketing?.adSplits?.[pId] ?? 0), 0);
      default:
        return '—';
    }
  };

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

  const showReportsSetting = currentClass?.showMarketReportsYear1 ?? false;
  const isStudent = currentRole === 'STUDENT';
  const currentPeriod = isStudent ? currentTeam.currentPeriod : (currentClass?.currentPeriod || 1);
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
          <h1 className="text-3xl font-bold text-slate-900">Market Reports</h1>
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
                          period: currentClass?.currentPeriod || 1,
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
                    <div className="my-1 border-t border-slate-100"></div>
                    <button
                      onClick={() => {
                        exportReportPDF('decisions', {
                          className: currentClass?.name || 'Class Simulation',
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                          period: currentClass?.currentPeriod || 1,
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
                                                        const dec = realTeams[i]?.draftDecisions || INITIAL_DECISIONS;
                                                        const sharePct = dec.marketing?.forecastedMarketShare?.[pId] ?? 0;
                                                        const period = currentClass?.currentPeriod || 1;
                                                        const mktDemand = getMarketSize(pId, period);
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
                                                        const res = computeMarketShareBackModel(realTeams, currentClass?.currentPeriod || 1).find(r => r.productId === pId);
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
                                                        const res = computeMarketShareBackModel(realTeams, currentClass?.currentPeriod || 1).find(r => r.productId === pId);
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
                                                        const res = computeMarketShareBackModel(realTeams, currentClass?.currentPeriod || 1).find(r => r.productId === pId);
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
                                            const res = computeMarketShareBackModel(realTeams, currentClass?.currentPeriod || 1).find(r => r.productId === pId);
                                            const dec = realTeams[selectedMobileTeam]?.draftDecisions || INITIAL_DECISIONS;
                                            const sharePct = dec.marketing?.forecastedMarketShare?.[pId] ?? 0;
                                            const period = currentClass?.currentPeriod || 1;
                                            const mktDemand = getMarketSize(pId, period);
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