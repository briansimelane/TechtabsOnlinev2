import React from 'react';
import { DollarSign, TrendingUp, Users, Smile, Percent, Shield } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { PRODUCTS, STORE_COSTS, HR_CONSTANTS, FINANCE_CONSTANTS, getMarketSize, YEAR_0_RECORD } from '../constants';
import { ProductId, HRRole } from '../types';
import { formatNumber, formatPercent } from '../utils/numberFormat';
import { sCurve, WEIGHTS, MARKET_ANCHORS } from '../utils/SimulationEngine';

const DecisionsSummary: React.FC = () => {
  const { decisions, currentTeam, isReadOnly, currentRole } = useSimulation();

  const currentPeriod = currentTeam.currentPeriod;
  const pastPeriod = currentPeriod - 1;
  const pastPeriodRecord = currentTeam.history?.[pastPeriod];

  // --- Forecast calculations for Current Period (Forecast Year) ---
  
  // Helper to get available inventory for sale
  const getAvailableInventory = (productId: ProductId) => {
    const opening = Number(currentTeam.inventory[productId]) || 0;
    const production = Number(decisions.operations.production[productId]) || 0;
    const purchased = Number(decisions.operations.reqFinishedGoods?.[productId]) || 0;
    return opening + production + purchased;
  };

  // 1. Production Staff Costs (Technicians & Semi-skilled)
  let productionPayroll = 0;
  let opexPayroll = 0;
  let opexTraining = 0;
  let staffBasedCapacity = 0;

  const baseProductivities: Record<HRRole, number> = {
    engineers: 0,
    technicians: 1000,
    semiSkilled: 500,
    adminSales: 0,
    customerService: 0
  };
  const trainingEffects: Record<string, number> = {
    None: 0,
    Basic: 0.05,
    Moderate: 0.10,
    Advanced: 0.15
  };

  const staffCountsForecast: Record<HRRole, number> = {
    engineers: 0,
    technicians: 0,
    semiSkilled: 0,
    adminSales: 0,
    customerService: 0
  };
  
  const hrRoles = ['engineers', 'technicians', 'semiSkilled', 'adminSales', 'customerService'] as const;
  hrRoles.forEach(r => {
    const count = Math.max(0, (currentTeam.staffCounts[r] || 0) + (decisions.hr.hiring[r] || 0));
    staffCountsForecast[r] = count;
    const monthlySalary = decisions.hr.salaries[r] || 0;
    const trainingLevel = decisions.hr.trainingLevels[r] || 'None';
    const trainingCostPer = HR_CONSTANTS.trainingCosts[trainingLevel] || 0;
    
    opexTraining += count * trainingCostPer; // Training remains in OPEX
    
    if (r === 'technicians' || r === 'semiSkilled') {
      productionPayroll += count * monthlySalary * 8;
    } else {
      opexPayroll += count * monthlySalary * 8;
    }

    const baseUnits = baseProductivities[r] || 0;
    const effect = trainingEffects[trainingLevel] || 0.0;
    staffBasedCapacity += Math.floor(count * baseUnits * (1 + effect));
  });
  
  const totalProductionStaffCost = productionPayroll;
  const totalProductionUnits = PRODUCTS.reduce((sum, p) => sum + (decisions.operations.production[p.id] || 0), 0);
  const laborCostPerUnit = totalProductionUnits > 0 ? (totalProductionStaffCost / totalProductionUnits) : 0;

  // Forecasted Revenue & COGS
  let forecastedRevenue = 0;
  const standardCosts = { techbook: 1400, zroid: 1350, itab: 1100 };
  let forecastedCOGS = 0;

  PRODUCTS.forEach(p => {
    const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
    const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
    const available = getAvailableInventory(p.id);
    const unitsSold = Math.min(demand, available);
    
    forecastedRevenue += unitsSold * decisions.marketing.prices[p.id];
    
    // Dynamic unit cost split
    const manufacturedUnits = decisions.operations.production[p.id] || 0;
    const fgUnits = Object.values(decisions.procurement.supplierAllocation[p.id] || {}).reduce((s: number, v: any) => s + (v.finishedGoods || 0), 0);
    
    const mfgCost = standardCosts[p.id] + laborCostPerUnit;
    const fgCost = standardCosts[p.id];
    
    const totalUnits = manufacturedUnits + fgUnits;
    const unitCost = totalUnits > 0 
        ? ((manufacturedUnits * mfgCost) + (fgUnits * fgCost)) / totalUnits 
        : standardCosts[p.id] + laborCostPerUnit;

    forecastedCOGS += unitsSold * unitCost;
  });

  if (totalProductionUnits === 0) {
    forecastedCOGS += totalProductionStaffCost;
  }

  const grossProfit = forecastedRevenue - forecastedCOGS;

  const marketingSpend = decisions.marketing.advertisingBudget;
  const finalStoreCount = currentTeam.storeCount + decisions.marketing.openCloseStores;
  const storeCosts = (finalStoreCount * STORE_COSTS.running) + 
                     (decisions.marketing.openCloseStores > 0 ? decisions.marketing.openCloseStores * STORE_COSTS.opening : 0) + 
                     (decisions.marketing.openCloseStores < 0 ? Math.abs(decisions.marketing.openCloseStores) * STORE_COSTS.closing : 0);
  const agentSales = forecastedRevenue * 0.52;
  const agentCommission = agentSales * decisions.marketing.agentCommission;

  // Payroll (excluding production staff, who are allocated to COGS)
  const payroll = opexPayroll;

  // Training (excluding production staff, who are allocated to COGS)
  const training = opexTraining;

  const rdSpend = decisions.operations.rdBudget;
  const sumOtherExpenses = marketingSpend + storeCosts + agentCommission + payroll + training + rdSpend;
  const year0OtherOpexSum = YEAR_0_RECORD.opex.marketing + YEAR_0_RECORD.opex.store + YEAR_0_RECORD.opex.agents + YEAR_0_RECORD.opex.payroll + YEAR_0_RECORD.opex.training + YEAR_0_RECORD.opex.rd;
  const otherOpexRatio = YEAR_0_RECORD.opex.other / year0OtherOpexSum;
  const otherOpex = Math.round(sumOtherExpenses * otherOpexRatio);
  
  const totalOpex = sumOtherExpenses + otherOpex;

  const ebitda = grossProfit - totalOpex;
  const depreciation = 1535965;
  const forecastedLongTermDebt = currentTeam.longTermDebt + decisions.finance.debtChange;
  const financeCharges = forecastedLongTermDebt > 0 ? Math.round(forecastedLongTermDebt * FINANCE_CONSTANTS.interestRate) : 0;
  const ebt = ebitda - depreciation - financeCharges;
  const tax = ebt > 0 ? ebt * FINANCE_CONSTANTS.taxRate : 0;
  const forecastedNetProfit = ebt - tax;

  // Net Profit % (Net Profit Margin)
  const netProfitPercent = forecastedRevenue !== 0 
    ? (forecastedNetProfit / forecastedRevenue) * 100 
    : 0;

  // ROE Calculation: Forecasted Net Profit / Forecasted Shareholders Equity
  const forecastedEquity = currentTeam.shareholdersEquity + forecastedNetProfit + decisions.finance.equityChange;
  const roe = forecastedEquity !== 0 
    ? (forecastedNetProfit / forecastedEquity) * 100 
    : 0;

  // --- Forecasted ESAT and CSAT calculations ---
  const prevESAT = pastPeriodRecord?.kpis?.employeeSatisfaction ?? 0.70;
  const prevCSAT = pastPeriodRecord?.kpis?.customerSatisfaction ?? 0.70;

  const DEFAULT_SALARIES: Record<HRRole, number> = {
    engineers: 45000,
    technicians: 20000,
    semiSkilled: 15000,
    adminSales: 15000,
    customerService: 10000
  };
  const oldSalaries = pastPeriodRecord?.salaries ?? DEFAULT_SALARIES;

  let totalStaffCount = 0;
  let sumSalaryChange = 0;
  let sumTrainingFactor = 0;
  let sumUtilization = 0;

  const prodWorkload = staffBasedCapacity > 0 ? (totalProductionUnits / staffBasedCapacity) : (totalProductionUnits > 0 ? 2.0 : 1.0);

  const requiredEngineers = Math.ceil(decisions.operations.rdBudget / 200000 + Math.abs(decisions.operations.capacityChange) / 1000) || 1;
  const requiredAdmin = Math.ceil(forecastedRevenue / 10000000) || 10;
  
  // Estimate total sales units
  let totalSalesUnits = 0;
  PRODUCTS.forEach(p => {
    const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
    const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
    const available = getAvailableInventory(p.id);
    const unitsSold = Math.min(demand, available);
    totalSalesUnits += unitsSold;
  });
  const requiredCS = Math.ceil(totalSalesUnits / 1000) || 20;

  const utilizationByRole: Record<HRRole, number> = {
    engineers: staffCountsForecast.engineers > 0 ? (requiredEngineers / staffCountsForecast.engineers) : 1.0,
    technicians: prodWorkload,
    semiSkilled: prodWorkload,
    adminSales: staffCountsForecast.adminSales > 0 ? (requiredAdmin / staffCountsForecast.adminSales) : 1.0,
    customerService: staffCountsForecast.customerService > 0 ? (requiredCS / staffCountsForecast.customerService) : 1.0
  };

  const trainingFactorByLevel: Record<string, number> = {
    'None': 0.0,
    'Basic': 0.05,
    'Moderate': 0.10,
    'Advanced': 0.15
  };

  hrRoles.forEach(r => {
    const count = staffCountsForecast[r] || 0;
    if (count <= 0) return;

    totalStaffCount += count;

    // Salary change
    const oldSal = oldSalaries[r] ?? DEFAULT_SALARIES[r];
    const newSal = decisions.hr.salaries[r] ?? oldSal;
    const change = oldSal > 0 ? (newSal - oldSal) / oldSal : 0;
    sumSalaryChange += change * count;

    // Training factor
    const trainLevel = decisions.hr.trainingLevels[r] || 'None';
    const tf = trainingFactorByLevel[trainLevel] ?? 0.0;
    sumTrainingFactor += tf * count;

    // Workload utilization
    const ut = utilizationByRole[r] ?? 1.0;
    sumUtilization += ut * count;
  });

  const weightedSalaryChange = totalStaffCount > 0 ? Math.max(-0.20, Math.min(0.20, sumSalaryChange / totalStaffCount)) : 0;
  const weightedTrainingFactor = totalStaffCount > 0 ? (sumTrainingFactor / totalStaffCount) : 0;
  const weightedUtilization = totalStaffCount > 0 ? (sumUtilization / totalStaffCount) : 1.0;

  const salaryEffect = weightedSalaryChange >= 0 ? 0.15 * weightedSalaryChange : 0.50 * weightedSalaryChange;
  const utilizationEffect = weightedUtilization > 1.0 ? 0.30 * (weightedUtilization - 1.0) : 0.0;

  const targetESAT = 0.70 + salaryEffect + (0.33 * weightedTrainingFactor) - utilizationEffect;
  const calculatedESAT = prevESAT * 0.8 + targetESAT * 0.2;

  // ESAT Change Constraint (max 5% change per year)
  const esatChangeVal = calculatedESAT - prevESAT;
  const limitedESAT = prevESAT + Math.max(-0.05, Math.min(0.05, esatChangeVal));
  const forecastedESAT = Math.min(0.95, Math.max(0.10, limitedESAT));

  // Customer satisfaction forecast logic based on Customer Buying Criteria scores weighted by sales volume
  let totalSalesUnitsForCSAT = 0;
  let sumProductCSAT = 0;
  
  PRODUCTS.forEach(p => {
    const w = WEIGHTS[p.name.toLowerCase()] || WEIGHTS[p.id] || { price: 1, terms: 1, innov: 1, ad: 1, stores: 1, agents: 1, staff: 1 };
    
    // Calculate sub-scores (0.0 to 1.0)
    const sPrice = sCurve(decisions.marketing.prices[p.id], MARKET_ANCHORS.price[p.name.toLowerCase()] || MARKET_ANCHORS.price[p.id], false);
    
    const terms = decisions.finance.debtorsDays[p.id] || 30;
    const sTerms = sCurve(terms, MARKET_ANCHORS.paymentTerms, true);

    const productRDSplit = decisions.operations.rdSplits[p.id] || 0;
    const productRD = decisions.operations.rdBudget * productRDSplit;
    const innovBase = 2000000;
    const estimatedInnovScore = Math.min(10, (productRD / innovBase) * 2);
    const sInnov = sCurve(estimatedInnovScore, MARKET_ANCHORS.innovation, true);

    const productAd = decisions.marketing.advertisingBudget * (decisions.marketing.adSplits[p.id] || 0) + (decisions.marketing.generalAdSplit ? decisions.marketing.advertisingBudget * decisions.marketing.generalAdSplit * 0.5 : 0);
    const sAd = sCurve(productAd, MARKET_ANCHORS.adSpend, true);

    const totalStores = currentTeam.storeCount + decisions.marketing.openCloseStores;
    const sStores = sCurve(totalStores, MARKET_ANCHORS.stores, true);

    const sAgents = sCurve(decisions.marketing.agentCommission, MARKET_ANCHORS.agents, true);

    const totalWeight = (w.price || 0) + (w.terms || 0) + (w.innov || 0) + (w.ad || 0) + (w.stores || 0) + (w.agents || 0);
    const rawScore = (
      (sPrice * (w.price || 1)) + 
      (sTerms * (w.terms || 1)) + 
      (sInnov * (w.innov || 1)) + 
      (sAd * (w.ad || 1)) + 
      (sStores * (w.stores || 1)) +
      (sAgents * (w.agents || 1))
    ) / Math.max(1, totalWeight);

    // Forecast units sold
    const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
    const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
    const available = getAvailableInventory(p.id);
    const unitsSold = Math.min(demand, available);

    sumProductCSAT += rawScore * unitsSold;
    totalSalesUnitsForCSAT += unitsSold;
  });

  const weightedCustomerScore = totalSalesUnitsForCSAT > 0 ? (sumProductCSAT / totalSalesUnitsForCSAT) : 0.5;

  // Average stockout penalty across products (under stock penalizes CSAT up to -15% per product)
  let totalSalesDemand = 0;
  let sumStockoutPenalty = 0;
  PRODUCTS.forEach(p => {
    const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
    const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
    const available = getAvailableInventory(p.id);
    const stockoutRatio = demand > 0 ? (available / demand) : 1.0;
    const penalty = stockoutRatio < 1.0 ? 0.05 + 0.15 * (1.0 - stockoutRatio) : 0.0;
    sumStockoutPenalty += penalty * demand;
    totalSalesDemand += demand;
  });
  const avgStockoutPenalty = totalSalesDemand > 0 ? (sumStockoutPenalty / totalSalesDemand) : 0.0;
  
  const csAgentRatio = requiredCS > 0 ? (staffCountsForecast.customerService / requiredCS) : 1.0;
  const csAgentEffect = csAgentRatio >= 1.0 ? Math.min(0.04, 0.02 * (csAgentRatio - 1.0)) : -0.10 * (1.0 - csAgentRatio);

  const targetCSAT = 0.50 + 0.40 * weightedCustomerScore + csAgentEffect;
  const calculatedCSAT = prevCSAT * 0.8 + targetCSAT * 0.2;

  // CSAT Change Constraint (max 7% change per year)
  const csatChangeVal = calculatedCSAT - prevCSAT;
  const limitedCSAT = prevCSAT + Math.max(-0.07, Math.min(0.07, csatChangeVal));
  const forecastedCSAT = Math.min(0.95, Math.max(0.10, limitedCSAT - avgStockoutPenalty));

  console.log('CSAT DEBUG:', {
    prevCSAT,
    weightedCustomerScore,
    csAgentEffect,
    targetCSAT,
    calculatedCSAT,
    limitedCSAT,
    avgStockoutPenalty,
    forecastedCSAT
  });

  const metrics = [
    { 
      label: `Revenue (Y${currentPeriod} Fc)`, 
      value: `R ${formatNumber(forecastedRevenue / 1000000, 1)}M`, 
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: `Net Profit % (Y${currentPeriod} Fc)`, 
      value: formatPercent(netProfitPercent, 2, false), 
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      label: `Cust. Sat (Y${currentPeriod} Fc)`, 
      value: formatPercent(forecastedCSAT, 2), 
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50'
    },
    { 
      label: `Emp. Sat (Y${currentPeriod} Fc)`, 
      value: formatPercent(forecastedESAT, 2), 
      icon: Smile,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      label: `ROE (Y${currentPeriod} Fc)`, 
      value: formatPercent(roe, 2, false), 
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
  ];

  return (
    <>
      {currentRole === 'STUDENT' && isReadOnly && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-600 flex-shrink-0" />
            <span>
              <strong>Viewing Director Mode (Read-Only):</strong> You can adjust inputs to run local forecasts, but changes will not be saved. Only CEO <strong className="text-slate-900">{currentTeam.ceoName || 'Not Appointed'}</strong> can save decisions.
            </span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{metric.label}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{metric.value}</p>
            </div>
            <div className={`p-2 rounded-lg ${metric.bg} ${metric.color}`}>
              <metric.icon size={18} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default DecisionsSummary;