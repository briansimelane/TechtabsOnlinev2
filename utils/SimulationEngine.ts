
import { Team, TurnDecisions, ProductId, KPI, MarketEvent, HRRole, PeriodRecord } from '../types';
import CONFIG from '../resources/config.json';
import CALC_RULES from '../resources/calculation_rules.json';
import { PRODUCTS, STORE_COSTS, FINANCE_CONSTANTS, OPERATIONS_CONSTANTS, getMarketSize, YEAR_0_RECORD, SUPPLIER_METRICS } from '../constants';

// Helpers to map config json into usable structures
const SUPPLIERS = Object.keys((CONFIG as any).suppliers || {});

// Build cost maps from config if present otherwise fallback to constants
const COMPONENT_COSTS: Record<string, Record<string, number>> = {};
const FINISHED_GOODS_COSTS: Record<string, Record<string, number>> = {};
if ((CONFIG as any).suppliers) {
    Object.entries((CONFIG as any).suppliers).forEach(([supplierId, sData]: any) => {
        Object.keys((CONFIG as any).market_demand).forEach((prodName: string) => {
            const pid = prodName.toLowerCase();
            COMPONENT_COSTS[pid] = COMPONENT_COSTS[pid] || {};
            FINISHED_GOODS_COSTS[pid] = FINISHED_GOODS_COSTS[pid] || {};
            COMPONENT_COSTS[pid][supplierId] = sData.component_prices ? (sData.component_prices[prodName] ?? 0) : 0;
            FINISHED_GOODS_COSTS[pid][supplierId] = sData.finished_goods_prices ? (sData.finished_goods_prices[prodName] ?? 0) : 0;
        });
    });
}

// Training, productivity and market criteria
const TRAINING_PROGRAMS = (CONFIG as any).training_programs || {};
const EMPLOYEE_PRODUCTIVITY = (CONFIG as any).employee_productivity || {};
const CUSTOMER_SAT_EFFECTS = (CONFIG as any).customer_satisfaction_effects || {};

// --- Constants ---

// Sensitivity K for S-Curve (Steepness)
export const K_SENSITIVITY = 1.5;

// Market anchors and weights derived from config where possible
export const MARKET_ANCHORS = {
    price: {
        techbook: 3000,
        zroid: 4800,
        itab: 6500
    },
    paymentTerms: 45,
    innovation: 5,
    adSpend: 8000000,
    stores: ((CONFIG as any).metadata?.num_teams) || 8,
    agents: 0.015,
    staff: 1.0
};

export const WEIGHTS: Record<string, any> = {};
Object.entries(((CONFIG as any).customer_buying_criteria || {})).forEach(([k, v]: any) => {
    WEIGHTS[k.toLowerCase()] = {
        price: v.Price || 1,
        terms: v.Payment_Terms || 1,
        innov: v.Product_Innovation || 1,
        ad: v.Product_Advertising || 1,
        stores: v.Stores || 1,
        agents: v.Agents || 1,
        staff: v.Staff_Availability || 1
    };
});

// --- Helper Functions ---

/**
 * Non-Linear Elasticity S-Curve Function (Logit)
 * Score = 1 / (1 + e^-k(x - x0))
 * Normalized to ensure input x and x0 generate a ratio centered around 1.
 */
export const sCurve = (value: number, anchor: number, isHigherBetter: boolean): number => {
    // Avoid division by zero
    if (anchor === 0) anchor = 1;
    if (value === 0) value = 0.001;

    // Calculate ratio. If Higher is Better (e.g. Quality), ratio > 1 implies good.
    // If Lower is Better (e.g. Price), we invert: anchor / value.
    const ratio = isHigherBetter ? (value / anchor) : (anchor / value);

    // Apply Logit. We shift by -1 so that when ratio = 1 (equal to market), result is 0.5
    // result = 1 / (1 + exp(-k * (ratio - 1)))
    return 1 / (1 + Math.exp(-K_SENSITIVITY * (ratio - 1)));
};

interface SimulationResult {
    newTeamState: Team;
    kpis: KPI;
    periodRecord: PeriodRecord;
}

export const processTurn = (
    team: Team, 
    decisions: TurnDecisions, 
    events: MarketEvent[] = []
): SimulationResult => {
    
    // 1. Process Events (Modifiers)
    let materialCostModifier = 1.0;
    let demandModifier = 1.0;

    events.forEach(e => {
        if (e.effect === 'MATERIAL_COST_HIKE') materialCostModifier += e.magnitude;
        if (e.effect === 'DEMAND_BOOM') demandModifier += e.magnitude;
    });

    // Apply training/productivity to estimate staff-based capacity
    const staffToConfigKey: Record<string, string> = {
        engineers: 'Engineers',
        technicians: 'Technicians',
        semiSkilled: 'Semi-Skilled',
        adminSales: 'Admin & Sales',
        customerService: 'Customer Service'
    };

    let staffBasedCapacity = 0;
    Object.keys(team.staffCounts).forEach((r: string) => {
        const count = team.staffCounts[r as HRRole] || 0;
        const configKey = staffToConfigKey[r] || r;
        const baseUnits = EMPLOYEE_PRODUCTIVITY[configKey]?.base_units_per_employee || 0;
        const trainingLevel = decisions.hr.trainingLevels[r as HRRole] || 'None';
        const trainingEffect = TRAINING_PROGRAMS[trainingLevel]?.productivity_effect || 0;
        staffBasedCapacity += Math.floor(count * baseUnits * (1 + trainingEffect));
    });

    // Available capacity is limited by physical factory capacity and staff capability
    const availableCapacity = Math.max(0, Math.min(team.factoryCapacity, staffBasedCapacity));

    // Scale planned production to available capacity if needed (proportional reduction)
    const plannedTotalProduction = Object.values(decisions.operations.production).reduce((a, b) => a + (b || 0), 0);
    const productionScale = plannedTotalProduction > 0 && plannedTotalProduction > availableCapacity ? (availableCapacity / plannedTotalProduction) : 1;
    const scaledProduction: Record<string, number> = {
        techbook: 0,
        zroid: 0,
        itab: 0
    };
    Object.keys(decisions.operations.production).forEach((k: string) => {
        scaledProduction[k] = Math.floor((decisions.operations.production as any)[k] * productionScale);
    });

    // 2. Market Share Calculation (S-Curve)
    const marketShares: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    const unitsSold: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    const revenueByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    const productScores: Record<ProductId, number> = { techbook: 0.5, zroid: 0.5, itab: 0.5 };
    const productDemands: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    const productAvailable: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };

    PRODUCTS.forEach(p => {
        const w = WEIGHTS[p.name.toLowerCase()] || WEIGHTS[p.id] || { price: 1, terms: 1, innov: 1, ad: 1, stores: 1, agents: 1, staff: 1 };

        // Calculate sub-scores (0.0 to 1.0)
        const sPrice = sCurve(decisions.marketing.prices[p.id], MARKET_ANCHORS.price[p.name.toLowerCase()] || MARKET_ANCHORS.price[p.id], false);
        
        // Payment terms (Finance Debtors Days as proxy)
        const terms = decisions.finance.debtorsDays[p.id] || 30;
        const sTerms = sCurve(terms, MARKET_ANCHORS.paymentTerms, true); // Longer terms = better for customer

        // Innovation (Based on R&D Spend relative to baseline)
        const productRDSplit = decisions.operations.rdSplits[p.id] || 0;
        const productRD = decisions.operations.rdBudget * productRDSplit;
        const innovBase = (CONFIG as any).costs?.innovation?.base_cost_per_feature || 2000000;
        const estimatedInnovScore = Math.min(10, (productRD / innovBase) * 2);
        const sInnov = sCurve(estimatedInnovScore, MARKET_ANCHORS.innovation, true);

        // Advertising: include general ad split if provided
        const productAd = decisions.marketing.advertisingBudget * (decisions.marketing.adSplits[p.id] || 0) + (decisions.marketing.generalAdSplit ? decisions.marketing.advertisingBudget * decisions.marketing.generalAdSplit * 0.5 : 0);
        const sAd = sCurve(productAd, MARKET_ANCHORS.adSpend, true);

        // Distribution (Stores)
        const totalStores = team.storeCount + decisions.marketing.openCloseStores;
        const sStores = sCurve(totalStores, MARKET_ANCHORS.stores, true);

        const sAgents = sCurve(decisions.marketing.agentCommission, MARKET_ANCHORS.agents, true);

        // Weighted Sum (excluding staff which is applied at class-level CSAT effect)
        const totalWeight = (w.price || 0) + (w.terms || 0) + (w.innov || 0) + (w.ad || 0) + (w.stores || 0) + (w.agents || 0);
        const rawScore = (
            (sPrice * (w.price || 1)) + 
            (sTerms * (w.terms || 1)) + 
            (sInnov * (w.innov || 1)) + 
            (sAd * (w.ad || 1)) + 
            (sStores * (w.stores || 1)) +
            (sAgents * (w.agents || 1))
        ) / Math.max(1, totalWeight);

        productScores[p.id] = rawScore;

        // Market Share Calculation - map score into a sensible share
        let share = 0.16 * (rawScore / 0.5) * demandModifier;
        share = Math.max(0.01, Math.min(0.50, share));
        marketShares[p.id] = share;

        // Units Sold: use schedule or fallback config market_demand
        const period = team.currentPeriod || 1;
        const marketSize = getMarketSize(p.id, period);
        const demand = Math.floor(marketSize * share);

        // Check Availability (Inventory Constraint)
        const opening = Number(team.inventory[p.id]) || 0;
        const production = Number(scaledProduction[p.id]) || 0;
        const purchased = Object.values(decisions.procurement.supplierAllocation[p.id] || {}).reduce((s: number, v: any) => s + (Number(v.finishedGoods) || 0), 0);
        const available = opening + production + purchased;

        const actualSold = Math.min(demand, available);
        unitsSold[p.id] = actualSold;
        productDemands[p.id] = demand;
        productAvailable[p.id] = available;
        revenueByProduct[p.id] = actualSold * decisions.marketing.prices[p.id];
    });

    const totalRevenue = Object.values(revenueByProduct).reduce((a, b) => a + b, 0);

    // 3. Costs Calculation (COGS)
    // 3. Costs Calculation (COGS)
    let productionPayroll = 0;
    let opexPayroll = 0;
    let opexTraining = 0;
    const staffCounts = { ...team.staffCounts } as Record<string, number>;

    (Object.keys(staffCounts) as HRRole[]).forEach(r => {
        const hire = decisions.hr.hiring[r] || 0;
        staffCounts[r] = (staffCounts[r] || 0) + hire;
        if (staffCounts[r] < 0) staffCounts[r] = 0;

        const monthlySalary = decisions.hr.salaries[r] || 0;
        const trainingLevel = decisions.hr.trainingLevels[r] || 'None';
        const trainingCostPer = TRAINING_PROGRAMS[trainingLevel]?.cost_per_employee ?? (trainingLevel === 'Basic' ? 9600 : trainingLevel === 'Moderate' ? 32000 : trainingLevel === 'Advanced' ? 48000 : 0);

        opexTraining += staffCounts[r] * trainingCostPer; // All training remains in G&A/OPEX

        if (r === 'technicians' || r === 'semiSkilled') {
            productionPayroll += staffCounts[r] * monthlySalary * 8;
        } else {
            opexPayroll += staffCounts[r] * monthlySalary * 8;
        }
    });

    const totalProductionStaffCost = productionPayroll;
    const totalManufacturedUnits = PRODUCTS.reduce((sum, p) => sum + (scaledProduction[p.id] || 0), 0);
    const laborCostPerUnit = totalManufacturedUnits > 0 ? (totalProductionStaffCost / totalManufacturedUnits) : 0;

    let totalCOGS = 0;
    const cogsByProduct: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };
    const negotiation = decisions.negotiation;
    const isDealActive = negotiation.status === 'AGREED';

    // Track supplier payments and purchases paid this period
    let purchasesPaidThisPeriod = 0;
    let totalComponentCost = 0;
    let totalFGCost = 0;

    PRODUCTS.forEach(p => {
        const productProc = decisions.procurement.supplierAllocation[p.id] || {};
        let productComponentCost = 0;
        let productFGCost = 0;
        let compUnits = 0;
        let fgUnits = 0;

        SUPPLIERS.forEach(s => {
            const alloc = productProc[s];
            if (!alloc) return;
            const discountMultiplier = (isDealActive && negotiation.selectedSupplierId === s) ? (1 - negotiation.agreedDiscount) : 1;
            const compVal = Number(alloc.components) || 0;
            const fgVal = Number(alloc.finishedGoods) || 0;
            const compCost = (COMPONENT_COSTS[p.id]?.[s] || 0) * compVal * materialCostModifier * discountMultiplier;
            const fgCost = (FINISHED_GOODS_COSTS[p.id]?.[s] || 0) * fgVal * materialCostModifier * discountMultiplier;
            productComponentCost += compCost;
            compUnits += compVal;
            productFGCost += fgCost;
            fgUnits += fgVal;

            // Determine payment timing factor for this supplier
            const supplierDefaultTerms = (CONFIG as any).suppliers?.[s]?.performance_attributes?.payment_terms_days || 30;
            const agreedTerms = (isDealActive && negotiation.selectedSupplierId === s && negotiation.agreedPaymentTerms) ? negotiation.agreedPaymentTerms : supplierDefaultTerms;
            const termKey = `${agreedTerms}_days`;
            const paymentFactor = (CONFIG as any).supplier_payment_factors? termKey ? ((CONFIG as any).supplier_payment_factors[termKey] ?? 1.0) : 1.0 : 1.0;
            purchasesPaidThisPeriod += (compCost + fgCost) * paymentFactor;
        });

        totalComponentCost += productComponentCost;
        totalFGCost += productFGCost;

        const productionUnitCost = ((CONFIG as any).costs?.production?.cost_per_unit) || 720;

        const manufacturedUnits = scaledProduction[p.id] || 0;
        const avgComponentCost = compUnits > 0 ? (productComponentCost / compUnits) : 0;
        const manufacturedUnitCost = avgComponentCost + productionUnitCost + laborCostPerUnit;
        const avgFGUnitCost = fgUnits > 0 ? (productFGCost / fgUnits) : 0;

        // Allocate sales against FG purchases, manufactured units, then opening inventory
        let remainingSales = unitsSold[p.id];
        let productCOGS = 0;

        const usedFromFG = Math.min(remainingSales, fgUnits);
        productCOGS += usedFromFG * avgFGUnitCost;
        remainingSales -= usedFromFG;

        const usedFromManufactured = Math.min(remainingSales, manufacturedUnits);
        productCOGS += usedFromManufactured * manufacturedUnitCost;
        remainingSales -= usedFromManufactured;

        if (remainingSales > 0) {
            // Fallback opening inventory cost
            const stdCost = 1500;
            productCOGS += remainingSales * stdCost;
        }

        cogsByProduct[p.id] = productCOGS;
        totalCOGS += productCOGS;
    });

    if (totalManufacturedUnits === 0) {
        totalCOGS += totalProductionStaffCost;
    }

    // 4. Operating Expenses
    const marketingSpend = decisions.marketing.advertisingBudget;
    
    // Store Costs
    const finalStoreCount = team.storeCount + decisions.marketing.openCloseStores;
    const storeRunCost = finalStoreCount * STORE_COSTS.running;
    const storeTransCost = decisions.marketing.openCloseStores > 0 
        ? decisions.marketing.openCloseStores * STORE_COSTS.opening
        : Math.abs(decisions.marketing.openCloseStores) * STORE_COSTS.closing;
    
    // Agent Comm
    const agentSales = totalRevenue * 0.52; // Assume 52% sales via agents
    const agentComm = agentSales * decisions.marketing.agentCommission;

    // HR Payroll & Training (Excludes production staff costs, which are allocated to COGS)
    const payroll = opexPayroll;
    const training = opexTraining;

    const rdSpend = decisions.operations.rdBudget;
    const sumOtherExpenses = marketingSpend + storeRunCost + storeTransCost + agentComm + payroll + training + rdSpend;
    const year0OtherOpexSum = YEAR_0_RECORD.opex.marketing + YEAR_0_RECORD.opex.store + YEAR_0_RECORD.opex.agents + YEAR_0_RECORD.opex.payroll + YEAR_0_RECORD.opex.training + YEAR_0_RECORD.opex.rd;
    const otherOpexRatio = YEAR_0_RECORD.opex.other / year0OtherOpexSum;
    const otherOpex = Math.round(sumOtherExpenses * otherOpexRatio);
    
    const totalOpex = sumOtherExpenses + otherOpex;

    // 5. Profitability
    const grossProfit = totalRevenue - totalCOGS;
    const ebitda = grossProfit - totalOpex;
    const depreciation = team.factoryCapacity * 20 + 500000; // Mock depr logic
    const interest = team.longTermDebt * FINANCE_CONSTANTS.interestRate;
    const ebt = ebitda - depreciation - interest;
    const tax = ebt > 0 ? ebt * FINANCE_CONSTANTS.taxRate : 0;
    const netProfit = ebt - tax;

    // 6. Balance Sheet Updates
    // Cash Flow
    const capeX = decisions.operations.capacityChange > 0 
        ? decisions.operations.capacityChange * OPERATIONS_CONSTANTS.capexUnitCost 
        : 0; // Negative capex (selling) not supported in logic yet
    
    const debtChange = decisions.finance.debtChange;
    const equityChange = decisions.finance.equityChange;
    
    // Collections from customers based on payment timing factors
    let collectedCashFromSales = 0;
    PRODUCTS.forEach(p => {
        const revenue = revenueByProduct[p.id] || 0;
        const termDays = decisions.finance.debtorsDays[p.id] || ((CONFIG as any).decision_categories?.finance?.decisions?.customer_payment_terms?.products?.[p.name]?.default) || 30;
        const termKey = `${termDays}_days`;
        const productTiming = (CONFIG as any).payment_timing_factors?.[p.name] || {};
        const collectionRate = productTiming?.[termKey]?.base_quarter ?? productTiming?.[termKey]?.collection_pattern?.[0] ?? 1.0;
        collectedCashFromSales += revenue * collectionRate;
    });

    const changeInDebtors = totalRevenue - collectedCashFromSales;

    // Fetch prior period balance sheet
    const prevPeriod = team.currentPeriod - 1;
    const prevRecord = team.history?.[prevPeriod];

    const startCash = team.cashBalance;
    const startDebtors = prevRecord?.balanceSheet.receivables ?? 47500000;
    const startInventoryValue = prevRecord?.balanceSheet.inventory ?? 49900000;
    const startCreditors = prevRecord?.balanceSheet.currentLiabilities ?? 99000000;
    const startPPE = prevRecord?.balanceSheet.fixedAssets ?? 293500000;
    const startEquity = team.shareholdersEquity;
    const startDebt = team.longTermDebt;

    // Calculations
    const endPPE = startPPE + capeX - depreciation;
    const endDebtors = Math.max(0, startDebtors + changeInDebtors);
    
    const productionCost = (Object.keys(scaledProduction) as ProductId[]).reduce((s, pid) => s + (scaledProduction[pid] * (720 + laborCostPerUnit)), 0);
    const endInventoryValue = Math.max(0, startInventoryValue + productionCost + totalComponentCost + totalFGCost - totalCOGS);
    const endCreditors = Math.max(0, startCreditors + totalComponentCost + totalFGCost - purchasesPaidThisPeriod);
    const endDebt = startDebt + debtChange;
    const endEquity = startEquity + netProfit + equityChange;

    // Reconciled cash balance (makes balance sheet check net to 0)
    const endCash = endEquity + endDebt + endCreditors - endDebtors - endInventoryValue - endPPE;

    const netCashFlow = endCash - startCash;
    const investingCashFlow = -capeX;
    const financingCashFlow = debtChange + equityChange;
    const operatingCashFlow = netCashFlow - investingCashFlow - financingCashFlow;
    
    // Update Inventory Counts
    const newInventory = { ...team.inventory };
    PRODUCTS.forEach(p => {
        const production = scaledProduction[p.id] || 0;
        const bought = Object.values(decisions.procurement.supplierAllocation[p.id] || {}).reduce((s: number, v: any) => s + (v.finishedGoods || 0), 0);
        const sold = unitsSold[p.id];
        newInventory[p.id] = Math.max(0, newInventory[p.id] + production + bought - sold);
    });

    // Calculate cumulative features for each product
    const prevFeatures = team.features ?? { techbook: 0, zroid: 0, itab: 0 };
    const newFeatures: Record<ProductId, number> = { techbook: 0, zroid: 0, itab: 0 };

    PRODUCTS.forEach(p => {
        const splitVal = Number(decisions.operations.rdSplits[p.id]) || 0;
        const investment = Number(decisions.operations.rdBudget) * splitVal;
        
        // Calculate supplier innovation score based on allocation
        const alloc = decisions.procurement.supplierAllocation[p.id] || {};
        let totalAlloc = 0;
        let sumInnov = 0;
        SUPPLIERS.forEach(s => {
            const compVal = Number(alloc[s]?.components) || 0;
            const fgVal = Number(alloc[s]?.finishedGoods) || 0;
            const totalVal = compVal + fgVal;
            if (totalVal > 0) {
                const supplierInnov = SUPPLIER_METRICS[s as keyof typeof SUPPLIER_METRICS]?.innovation || 5.0;
                sumInnov += supplierInnov * totalVal;
                totalAlloc += totalVal;
            }
        });
        const supplierInnovScore = totalAlloc > 0 ? (sumInnov / totalAlloc) : 6.0;

        // Features developed this period (capped at 10)
        const baseFeatures = investment / 2000000;
        const featuresDeveloped = baseFeatures * (supplierInnovScore / 6.0);
        const developed = Math.min(10, Math.ceil(featuresDeveloped));
        
        newFeatures[p.id] = (prevFeatures[p.id] || 0) + developed;
    });

    const newTeamState: Team = {
        ...team,
        currentPeriod: team.currentPeriod + 1,
        cashBalance: endCash,
        storeCount: finalStoreCount,
        factoryCapacity: team.factoryCapacity + decisions.operations.capacityChange,
        inventory: newInventory,
        staffCounts: staffCounts,
        longTermDebt: endDebt,
        shareholdersEquity: endEquity,
        features: newFeatures
    };

    // --- Employee Satisfaction (ESAT) Engine ---
    const prevPeriodRecord = team.history?.[team.currentPeriod - 1];
    const prevESAT = prevPeriodRecord?.kpis?.employeeSatisfaction ?? 0.70;

    const DEFAULT_SALARIES: Record<HRRole, number> = {
        engineers: 45000,
        technicians: 20000,
        semiSkilled: 15000,
        adminSales: 15000,
        customerService: 10000
    };
    const oldSalaries = prevPeriodRecord?.salaries ?? DEFAULT_SALARIES;

    // 1. Calculate Weighted Salary Change
    let totalStaffCount = 0;
    let sumSalaryChange = 0;
    let sumTrainingFactor = 0;
    let sumUtilization = 0;

    // Workload/utilization drivers per role
    const prodWorkload = staffBasedCapacity > 0 ? (plannedTotalProduction / staffBasedCapacity) : (plannedTotalProduction > 0 ? 2.0 : 1.0);
    
    const requiredEngineers = Math.ceil(decisions.operations.rdBudget / 200000 + Math.abs(decisions.operations.capacityChange) / 1000) || 1;
    const requiredAdmin = Math.ceil(totalRevenue / 10000000) || 10;
    
    const totalSalesUnits = Object.values(unitsSold).reduce((a, b) => a + b, 0);
    const requiredCS = Math.ceil(totalSalesUnits / 1000) || 20;

    const utilizationByRole: Record<HRRole, number> = {
        engineers: staffCounts.engineers > 0 ? (requiredEngineers / staffCounts.engineers) : 1.0,
        technicians: prodWorkload,
        semiSkilled: prodWorkload,
        adminSales: staffCounts.adminSales > 0 ? (requiredAdmin / staffCounts.adminSales) : 1.0,
        customerService: staffCounts.customerService > 0 ? (requiredCS / staffCounts.customerService) : 1.0
    };

    const trainingFactorByLevel: Record<string, number> = {
        'None': 0.0,
        'Basic': 0.05,
        'Moderate': 0.10,
        'Advanced': 0.15
    };

    (Object.keys(staffCounts) as HRRole[]).forEach(r => {
        const count = staffCounts[r] || 0;
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

    // Reduced weights for ESAT
    const salaryEffect = weightedSalaryChange >= 0 ? 0.15 * weightedSalaryChange : 0.50 * weightedSalaryChange;
    const utilizationEffect = weightedUtilization > 1.0 ? 0.30 * (weightedUtilization - 1.0) : 0.0;
    const utilizationBonus = weightedUtilization < 1.0 ? 0.15 * (1.0 - weightedUtilization) : 0.0;

    const targetESAT = 0.70 + salaryEffect + (0.33 * weightedTrainingFactor) - utilizationEffect + utilizationBonus;
    const calculatedESAT = prevESAT * 0.8 + targetESAT * 0.2;

    // ESAT Change Constraint (max 5% change per year)
    const esatChangeVal = calculatedESAT - prevESAT;
    const limitedESAT = prevESAT + Math.max(-0.05, Math.min(0.05, esatChangeVal));
    const finalESAT = Math.min(0.95, Math.max(0.10, limitedESAT));

    // Customer Satisfaction (CSAT) based on Customer Buying Criteria scores weighted by sales volume
    let totalSalesUnitsForCSAT = 0;
    let sumProductCSAT = 0;
    PRODUCTS.forEach(p => {
        const sold = unitsSold[p.id] || 0;
        const score = productScores[p.id] ?? 0.5;
        sumProductCSAT += score * sold;
        totalSalesUnitsForCSAT += sold;
    });
    const weightedCustomerScore = totalSalesUnitsForCSAT > 0 ? (sumProductCSAT / totalSalesUnitsForCSAT) : 0.5;
    const prevCSAT = prevPeriodRecord?.kpis?.customerSatisfaction ?? 0.70;
    
    // Average stockout penalty across products (under stock penalizes CSAT up to -15% per product)
    let totalSalesDemand = 0;
    let sumStockoutPenalty = 0;
    PRODUCTS.forEach(p => {
        const demand = productDemands[p.id] || 0;
        const available = productAvailable[p.id] || 0;
        const stockoutRatio = demand > 0 ? (available / demand) : 1.0;
        const penalty = stockoutRatio < 1.0 ? 0.05 + 0.15 * (1.0 - stockoutRatio) : 0.0;
        sumStockoutPenalty += penalty * demand;
        totalSalesDemand += demand;
    });
    const avgStockoutPenalty = totalSalesDemand > 0 ? (sumStockoutPenalty / totalSalesDemand) : 0.0;

    const csAgentRatio = requiredCS > 0 ? (staffCounts.customerService / requiredCS) : 1.0;
    const csAgentEffect = csAgentRatio >= 1.0 ? Math.min(0.04, 0.02 * (csAgentRatio - 1.0)) : -0.10 * (1.0 - csAgentRatio);

    const targetCSAT = 0.50 + 0.40 * weightedCustomerScore + csAgentEffect;
    const calculatedCSAT = prevCSAT * 0.8 + targetCSAT * 0.2;

    // CSAT Change Constraint (max 7% change per year)
    const csatChangeVal = calculatedCSAT - prevCSAT;
    const limitedCSAT = prevCSAT + Math.max(-0.07, Math.min(0.07, csatChangeVal));
    const finalCSAT = Math.min(0.95, Math.max(0.10, limitedCSAT - avgStockoutPenalty));

    const newKPIs: KPI = {
        revenue: totalRevenue,
        netProfit: netProfit,
        marketShare: marketShares,
        customerSatisfaction: finalCSAT,
        employeeSatisfaction: finalESAT
    };

    // Calculate Ratios
    const avgDebtorDays = totalRevenue > 0 ? ((endDebtors / totalRevenue) * 365) / 3 : 0;
    const avgCreditorDays = totalCOGS > 0 ? ((endCreditors / totalCOGS) * 365) / 3 : 0;
    const interestCoverage = interest > 0 ? (ebt + interest) / interest : 0;

    const periodRecord: PeriodRecord = {
        period: team.currentPeriod,
        revenue: { total: totalRevenue, byProduct: revenueByProduct },
        cogs: { total: totalCOGS, byProduct: cogsByProduct },
        grossProfit: { total: grossProfit, byProduct: {
            techbook: revenueByProduct.techbook - cogsByProduct.techbook,
            zroid: revenueByProduct.zroid - cogsByProduct.zroid,
            itab: revenueByProduct.itab - cogsByProduct.itab
        }},
        opex: {
            marketing: marketingSpend,
            store: storeRunCost + storeTransCost,
            agents: agentComm,
            payroll,
            training,
            rd: rdSpend,
            other: otherOpex,
            total: totalOpex
        },
        ebitda,
        depreciation,
        interest,
        ebt,
        tax,
        netProfit,
        balanceSheet: {
            cash: endCash,
            receivables: endDebtors,
            inventory: endInventoryValue,
            fixedAssets: endPPE,
            totalAssets: endCash + endDebtors + endInventoryValue + endPPE,
            equity: endEquity,
            longTermDebt: endDebt,
            currentLiabilities: endCreditors,
            totalLiabilitiesAndEquity: endEquity + endDebt + endCreditors
        },
        cashFlow: {
            operating: operatingCashFlow,
            investing: investingCashFlow,
            financing: financingCashFlow,
            net: netCashFlow
        },
        debtorDays: {
            techbook: decisions.finance.debtorsDays.techbook || 30,
            zroid: decisions.finance.debtorsDays.zroid || 30,
            itab: decisions.finance.debtorsDays.itab || 30
        },
        creditorDays: avgCreditorDays,
        interestCoverage,
        kpis: newKPIs,
        prices: decisions.marketing.prices,
        salaries: decisions.hr.salaries,
        features: newFeatures
    };

    return { newTeamState, kpis: newKPIs, periodRecord };
};
