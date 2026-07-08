import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  PieChart,
  Building2,
  User,
  Smile,
  Shield,
  ShieldAlert,
  Key,
  CheckCircle2,
  LogOut,
  Send,
  X,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { PRODUCTS, STORE_COSTS, HR_CONSTANTS, FINANCE_CONSTANTS, getMarketSize, YEAR_0_RECORD } from '../constants';
import { ProductId, HRRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { formatNumber, formatPercent } from '../utils/numberFormat';
import { sCurve, WEIGHTS, MARKET_ANCHORS } from '../utils/SimulationEngine';
import { useFlashOnChange } from '../utils/useFlashOnChange';

const Dashboard: React.FC = () => {
  const { 
    lastPeriodKPIs, 
    decisions, 
    currentTeam, 
    updateTeamProfile,
    isReadOnly,
    claimCeoSlot,
    verifyCeoPin,
    releaseCeoSlot,
    submitTurn,
    currentRole,
    isDemoMode,
    currentClassId,
    requestReopenTeamDecisions
  } = useSimulation();

  const flashCompanyName = useFlashOnChange(currentTeam.name);

  const [tempName, setTempName] = React.useState(currentTeam.name);
  const [tempCeo, setTempCeo] = React.useState(currentTeam.ceoName || '');

  // CEO Modals State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimPin, setClaimPin] = useState('');
  const [submitPin, setSubmitPin] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);

  React.useEffect(() => {
    setTempName(currentTeam.name);
    setTempCeo(currentTeam.ceoName || '');
  }, [currentTeam.name, currentTeam.ceoName]);

  const handleNameChange = (val: string) => {
    setTempName(val);
    void updateTeamProfile(val, tempCeo, false);
  };

  const handleCeoChange = (val: string) => {
    setTempCeo(val);
    void updateTeamProfile(tempName, val, false);
  };

  const handleBlur = () => {
    void updateTeamProfile(tempName, tempCeo, true);
  };

  // CEO Slot handlers
  const handleClaimCeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!claimPin.match(/^\d{4}$/)) {
      setModalError('PIN must be exactly 4 digits');
      return;
    }

    try {
      if (currentTeam.ceoPin) {
        // CEO PIN is already set, verifying it to log back in
        const success = await verifyCeoPin(claimPin);
        if (success) {
          setIsClaimModalOpen(false);
          setClaimPin('');
        } else {
          setModalError('Invalid PIN code');
        }
      } else {
        // Claiming slot for the first time
        if (!claimName.trim()) {
          setModalError('Please enter your name');
          return;
        }
        await claimCeoSlot(claimName, claimPin);
        setIsClaimModalOpen(false);
        setClaimName('');
        setClaimPin('');
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to claim role');
    }
  };

  const handleReleaseCeo = async () => {
    if (confirm('Are you sure you want to step down as CEO? Anyone else will be able to claim the slot.')) {
      await releaseCeoSlot();
    }
  };

  const handleSubmitTurnConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const localPin = localStorage.getItem('techtabs_ceo_pin');
    if (submitPin !== localPin) {
      setModalError('Incorrect CEO PIN');
      return;
    }

    try {
      setIsSubmittingTurn(true);
      await submitTurn();
      setIsSubmitModalOpen(false);
      setSubmitPin('');
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit decisions');
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  const currentPeriod = currentTeam.currentPeriod;
  const pastPeriod = currentPeriod - 1;
  const pastPeriodRecord = currentTeam.history?.[pastPeriod];
  const prevPeriodRecord = currentTeam.history?.[pastPeriod - 1];

  // --- Forecast calculations for Current Period (Forecast Year) ---
  
  const getAvailableInventory = (productId: ProductId) => {
    const opening = Number(currentTeam.inventory[productId]) || 0;
    const production = Number(decisions.operations.production[productId]) || 0;
    const purchased = Number(decisions.operations.reqFinishedGoods?.[productId]) || 0;
    return opening + production + purchased;
  };

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
    
    opexTraining += count * trainingCostPer;
    
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

  let forecastedRevenue = 0;
  const forecastedRevenueByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
  const standardCosts = { techbook: 1400, zroid: 1350, itab: 1100 };
  let forecastedCOGS = 0;

  PRODUCTS.forEach(p => {
    const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
    const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
    const available = getAvailableInventory(p.id);
    const unitsSold = Math.min(demand, available);

    const revenue = unitsSold * decisions.marketing.prices[p.id];
    forecastedRevenueByProduct[p.id] = revenue;
    forecastedRevenue += revenue;
    
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
                     (decisions.marketing.openCloseStores > 0 ? decisions.marketing.openCloseStores * STORE_COSTS.opening : 0);

  const interestRate = endingDebt => endingDebt > 0 ? FINANCE_CONSTANTS.interestRate : 0.0;
  const financeCosts = currentTeam.longTermDebt * interestRate(currentTeam.longTermDebt);
  
  const opexResearch = decisions.operations.rdBudget;
  const opexAdmin = opexPayroll + opexTraining;
  const totalOPEX = marketingSpend + storeCosts + opexResearch + opexAdmin;
  
  const forecastedEBIT = grossProfit - totalOPEX;
  const forecastedNetProfit = forecastedEBIT - financeCosts;
  
  const forecastedMargin = forecastedRevenue > 0 ? (forecastedNetProfit / forecastedRevenue) * 100 : 0;
  const pastMargin = pastPeriodRecord && pastPeriodRecord.revenue.total > 0 
    ? (pastPeriodRecord.netProfit / pastPeriodRecord.revenue.total) * 100 
    : 0;

  const getMetricTrend = (curr: number, past: number) => {
    if (past === 0) return { text: 'No past data', isPositive: true };
    const diff = ((curr - past) / past) * 100;
    return {
      text: `${diff >= 0 ? '+' : ''}${formatNumber(diff, 1)}%`,
      isPositive: diff >= 0
    };
  };

  const revChange = getMetricTrend(forecastedRevenue, pastPeriodRecord?.revenue?.total || 0);
  const profitChange = getMetricTrend(forecastedNetProfit, pastPeriodRecord?.netProfit || 0);

  const prevESAT = lastPeriodKPIs.employeeSatisfaction || 0.70;
  const prevCSAT = lastPeriodKPIs.customerSatisfaction || 0.70;

  let totalStaffCount = 0;
  let sumSalaryChange = 0;
  let sumTrainingFactor = 0;
  let sumUtilization = 0;

  const oldSalaries = pastPeriodRecord?.kpis?.salaries || {};
  const DEFAULT_SALARIES = { engineers: 20000, technicians: 12000, semiSkilled: 8000, adminSales: 11000, customerService: 7000 };

  const requiredEngineers = Math.ceil(decisions.operations.rdBudget / 100000) || 5;
  const maxCap = currentTeam.factoryCapacity;
  const requiredTechnicians = Math.ceil(totalProductionUnits / 1000);
  const requiredSemiSkilled = Math.ceil(totalProductionUnits / 500);
  const prodWorkload = Math.max(requiredTechnicians, requiredSemiSkilled) / Math.max(1, staffCountsForecast.technicians + staffCountsForecast.semiSkilled);

  const requiredAdmin = Math.ceil((staffCountsForecast.engineers + staffCountsForecast.technicians + staffCountsForecast.semiSkilled) / 10) || 10;
  
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

    const oldSal = oldSalaries[r] ?? DEFAULT_SALARIES[r];
    const newSal = decisions.hr.salaries[r] ?? oldSal;
    const change = oldSal > 0 ? (newSal - oldSal) / oldSal : 0;
    sumSalaryChange += change * count;

    const trainLevel = decisions.hr.trainingLevels[r] || 'None';
    const tf = trainingFactorByLevel[trainLevel] ?? 0.0;
    sumTrainingFactor += tf * count;

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

  const esatChangeVal = calculatedESAT - prevESAT;
  const limitedESAT = prevESAT + Math.max(-0.05, Math.min(0.05, esatChangeVal));
  const forecastedESAT = Math.min(0.95, Math.max(0.10, limitedESAT));

  let totalSalesUnitsForCSAT = 0;
  let sumProductCSAT = 0;
  
  PRODUCTS.forEach(p => {
    const w = WEIGHTS[p.name.toLowerCase()] || WEIGHTS[p.id] || { price: 1, terms: 1, innov: 1, ad: 1, stores: 1, agents: 1, staff: 1 };
    
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

    const share = decisions.marketing.forecastedMarketShare[p.id] || 0;
    const demand = Math.round((getMarketSize(p.id, currentPeriod) * share) / 100);
    const available = getAvailableInventory(p.id);
    const unitsSold = Math.min(demand, available);

    sumProductCSAT += rawScore * unitsSold;
    totalSalesUnitsForCSAT += unitsSold;
  });

  const weightedCustomerScore = totalSalesUnitsForCSAT > 0 ? (sumProductCSAT / totalSalesUnitsForCSAT) : 0.5;

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

  const csatChangeVal = calculatedCSAT - prevCSAT;
  const limitedCSAT = prevCSAT + Math.max(-0.07, Math.min(0.07, csatChangeVal));
  const forecastedCSAT = Math.min(0.95, Math.max(0.10, limitedCSAT - avgStockoutPenalty));

  const csatDiffPercent = (forecastedCSAT - lastPeriodKPIs.customerSatisfaction) * 100;
  const esatDiffPercent = (forecastedESAT - lastPeriodKPIs.employeeSatisfaction) * 100;

  const metrics = [
    { 
      label: `Revenue (Year ${currentPeriod} Forecast)`, 
      value: `R ${formatNumber(forecastedRevenue / 1000000, 2)}M`, 
      change: revChange.text, 
      isPositive: revChange.isPositive,
      pastValue: pastPeriodRecord ? `R ${formatNumber(pastPeriodRecord.revenue.total / 1000000, 0)}M` : 'R 0M',
      pastLabel: `Year ${pastPeriod}`,
      icon: DollarSign,
      color: 'bg-blue-500'
    },
    { 
      label: `Net Profit % (Year ${currentPeriod} Forecast)`, 
      value: formatPercent(forecastedMargin, 2, false), 
      change: profitChange.text, 
      isPositive: profitChange.isPositive,
      pastValue: formatPercent(pastMargin, 2, false),
      pastLabel: `Year ${pastPeriod}`,
      icon: TrendingUp,
      color: 'bg-emerald-500'
    },
    { 
      label: `Customer Sat (Year ${currentPeriod} Forecast)`, 
      value: formatPercent(forecastedCSAT, 2), 
      change: `${csatDiffPercent >= 0 ? '+' : ''}${formatNumber(csatDiffPercent, 2)}%`, 
      isPositive: csatDiffPercent >= 0,
      pastValue: formatPercent(lastPeriodKPIs.customerSatisfaction, 2),
      pastLabel: `Year ${pastPeriod}`,
      icon: Users,
      color: 'bg-violet-500'
    },
    { 
      label: `Employee Sat (Year ${currentPeriod} Forecast)`, 
      value: formatPercent(forecastedESAT, 2), 
      change: `${esatDiffPercent >= 0 ? '+' : ''}${formatNumber(esatDiffPercent, 2)}%`, 
      isPositive: esatDiffPercent >= 0,
      pastValue: formatPercent(lastPeriodKPIs.employeeSatisfaction, 2),
      pastLabel: `Year ${pastPeriod}`,
      icon: Smile,
      color: 'bg-amber-500'
    },
  ];

  const salesData = PRODUCTS.map(p => ({
    name: p.name,
    currentYear: forecastedRevenueByProduct[p.id],
    pastYear: pastPeriodRecord?.revenue?.byProduct?.[p.id] || 0
  }));

  const trendData = [
    ...Object.entries(currentTeam.history || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([period, record]) => ({
        period: `Y${period} (Actual)`,
        profit: Math.round(record.netProfit / 1000000)
      })),
    {
      period: `Y${currentPeriod} (Forecast)`,
      profit: Math.round(forecastedNetProfit / 1000000)
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* CEO & Role Control Banner (Only for Student Role, hidden in Demo Mode) */}
      {currentRole === 'STUDENT' && !isDemoMode && (
        currentTeam.status === 'Submitted' ? (
          <div className="p-5 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all bg-emerald-50 border-emerald-200 text-emerald-900">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Decisions Submitted</h2>
                <p className="text-sm opacity-90 mt-1 max-w-xl">
                  Your decisions for Year {currentPeriod} have been successfully submitted. The team is now waiting for the course facilitator to process the round.
                </p>
                {currentTeam.reopenRequested ? (
                  <p className="text-xs text-indigo-700 font-bold mt-2 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded inline-block">
                    ⏳ Re-opening request submitted to Facilitator.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!currentTeam.reopenRequested && (
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to request the facilitator to re-open your team's decisions?")) {
                      try {
                        if (currentClassId && currentTeam.id) {
                          await requestReopenTeamDecisions(currentClassId, currentTeam.id);
                          alert("Re-opening request sent to the facilitator!");
                        }
                      } catch (err: any) {
                        alert("Failed to send request: " + err.message);
                      }
                    }
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                >
                  Request Re-opening
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`p-5 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
            !currentTeam.ceoPin 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : !isReadOnly
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                !currentTeam.ceoPin 
                  ? 'bg-amber-100 text-amber-700' 
                  : !isReadOnly
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
              }`}>
                {!currentTeam.ceoPin ? <ShieldAlert size={24} /> : !isReadOnly ? <Unlock size={24} /> : <Lock size={24} />}
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {!currentTeam.ceoPin 
                    ? 'CEO Position Available' 
                    : !isReadOnly 
                      ? `You are Team CEO (${currentTeam.ceoName})` 
                      : `Viewing Director Mode`}
                </h2>
                <p className="text-sm opacity-90 mt-1 max-w-xl">
                  {!currentTeam.ceoPin 
                    ? 'No one has claimed the CEO role for this team yet. The CEO has write access to save decisions and submit the turn with their PIN.' 
                    : !isReadOnly
                      ? 'You have full access to modify and save decisions. Ready to finish the round? Click submit below.'
                      : `CEO ${currentTeam.ceoName || ''} is editing. You can adjust inputs locally to run forecasts, but only the CEO can save decisions to the group or submit.`}
                </p>
              </div>
            </div>
  
            <div className="flex items-center gap-3">
              {!currentTeam.ceoPin ? (
                <button 
                  onClick={() => { setModalError(''); setIsClaimModalOpen(true); }}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-[1.02]"
                >
                  Claim CEO Role
                </button>
              ) : !isReadOnly ? (
                <div className="flex gap-2">
                  <button 
                    onClick={handleReleaseCeo}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-sm transition-all"
                  >
                    Step Down
                  </button>
                  <button 
                    onClick={() => { setModalError(''); setIsSubmitModalOpen(true); }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-[1.02] flex items-center"
                  >
                    <Send size={15} className="mr-1.5" />
                    Submit decisions
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setModalError(''); setIsClaimModalOpen(true); }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-[1.02]"
                >
                  Enter CEO PIN
                </button>
              )}
            </div>
          </div>
        )
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Overview</h1>
          <p className="text-slate-500">Performance summary & Year {currentPeriod} Forecast</p>
        </div>
      </div>

      {/* Corporate Identity Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-slate-300">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {currentTeam.name}
            </h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              <User size={14} className="text-slate-400" />
              CEO: <span className="font-semibold text-slate-700">{currentTeam.ceoName || 'Not Appointed Yet'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Company Name</span>
            <input
              type="text"
              placeholder="Company Name"
              disabled={isReadOnly && currentRole === 'STUDENT'}
              value={tempName}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleBlur}
              className={`px-3 py-1.5 text-sm font-bold bg-blue-50 border border-blue-200 text-blue-800 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none w-48 disabled:opacity-50 ${flashCompanyName ? 'animate-flash-green' : ''}`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">CEO Name</span>
            <input
              type="text"
              placeholder="CEO Name"
              disabled={true} // CEO Name is set during CEO claiming process
              value={tempCeo}
              className="px-3 py-1.5 text-sm font-bold bg-slate-50 border border-slate-200 text-slate-500 rounded-lg outline-none w-48 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{metric.value}</h3>
              </div>
              <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10 text-${metric.color.replace('bg-', '')}`}>
                <metric.icon size={20} className={metric.color.replace('bg-', 'text-')} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {metric.isPositive ? (
                <TrendingUp size={16} className="text-emerald-500 mr-1" />
              ) : (
                <TrendingDown size={16} className="text-rose-500 mr-1" />
              )}
              <span className={metric.isPositive ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                {metric.change}
              </span>
              <span className="text-slate-400 ml-2">vs {metric.pastValue} ({metric.pastLabel})</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Product Performance (Revenue)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R ${formatNumber(value / 1000000, 0)}M`} />
                <Tooltip 
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, name: any, entry: any) => [`R ${formatNumber(value as number, 0)}`, entry.dataKey === 'currentYear' ? `Year ${currentPeriod} (Forecast)` : `Year ${pastPeriod} (Actual)`]}
                />
                <Legend />
                <Bar dataKey="pastYear" name={`Year ${pastPeriod} (Actual)`} fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="currentYear" name={`Year ${currentPeriod} (Forecast)`} fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Profit Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`R ${value}M`, 'Net Profit']}
                />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Claim CEO Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <Shield className="text-blue-600" size={20} />
                {currentTeam.ceoPin ? 'Verify CEO Identity' : 'Claim CEO Slot'}
              </h3>
              <button onClick={() => setIsClaimModalOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleClaimCeo} className="p-6 space-y-4">
              {currentTeam.ceoPin ? (
                <div>
                  <p className="text-sm text-slate-600 mb-4">
                    The CEO role has already been claimed by <strong className="text-slate-900">{currentTeam.ceoName}</strong>. If you are that person, enter the 4-digit CEO PIN below to unlock editing capabilities in this browser.
                  </p>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">4-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={claimPin}
                    onChange={(e) => setClaimPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-2xl font-bold px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-2">
                    Claim the CEO role to edit and save decisions for your team. You will set a 4-digit PIN so you can access your session again.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Set 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="e.g. 1234"
                      value={claimPin}
                      onChange={(e) => setClaimPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-widest text-xl font-bold px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              {modalError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/10"
                >
                  {currentTeam.ceoPin ? 'Verify PIN' : 'Claim Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Submit Turn Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} />
                Confirm Turn Submission
              </h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitTurnConfirm} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                You are about to process decisions for <strong className="text-slate-900">Year {currentPeriod}</strong>. This action is final and will calculate your new balance sheet, profit/loss, and KPIs.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enter CEO PIN to Confirm</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={submitPin}
                  onChange={(e) => setSubmitPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-widest text-2xl font-bold px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} />
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  disabled={isSubmittingTurn}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTurn}
                  className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-500/10 disabled:opacity-50 flex justify-center items-center"
                >
                  {isSubmittingTurn ? 'Processing...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
