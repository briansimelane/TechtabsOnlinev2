
import { Team, TurnDecisions, ProductId, KPI, MarketEvent, HRRole } from '../types';
import CONFIG from '../resources/config.json';
import CALC_RULES from '../resources/calculation_rules.json';
import { PRODUCTS, STORE_COSTS, FINANCE_CONSTANTS, OPERATIONS_CONSTANTS } from '../constants';

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
const K_SENSITIVITY = 1.5;

// Market anchors and weights derived from config where possible
const MARKET_ANCHORS = {
    price: (() => {
        const anchors: any = {};
        Object.keys((CONFIG as any).market_demand).forEach((p: string) => anchors[p.toLowerCase()] = ((CONFIG as any).decision_categories?.marketing?.decisions?.pricing?.products?.[p]?.default) || 1);
        return anchors;
    })(),
    paymentTerms: 45,
    innovation: 5,
    adSpend: 8000000,
    stores: ((CONFIG as any).metadata?.num_teams) || 8,
    agents: 0.015,
    staff: 1.0
};

const WEIGHTS: Record<string, any> = {};
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
const sCurve = (value: number, anchor: number, isHigherBetter: boolean): number => {
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

        // Weighted Sum
        const totalWeight = (w.price || 0) + (w.terms || 0) + (w.innov || 0) + (w.ad || 0) + (w.stores || 0) + (w.agents || 0) + (w.staff || 0);
        const rawScore = (
            (sPrice * (w.price || 1)) + 
            (sTerms * (w.terms || 1)) + 
            (sInnov * (w.innov || 1)) + 
            (sAd * (w.ad || 1)) + 
            (sStores * (w.stores || 1))
        ) / Math.max(1, totalWeight);

        // Market Share Calculation - map score into a sensible share
        let share = 0.16 * (rawScore / 0.5) * demandModifier;
        share = Math.max(0.01, Math.min(0.50, share));
        marketShares[p.id] = share;

        // Units Sold: use config market_demand with CAGR
        const md = (CONFIG as any).market_demand?.[p.name];
        const baseUnits = md ? md.year1_units : ((p.id === 'techbook') ? 337000 : (p.id === 'zroid') ? 389600 : 152800);
        const cagr = md ? md.cagr : 0;
        const period = team.currentPeriod || 1;
        const marketSize = Math.floor(baseUnits * Math.pow(1 + cagr, Math.max(0, period - 1)));
        const demand = Math.floor(marketSize * share);

        // Check Availability (Inventory Constraint)
        const opening = team.inventory[p.id] || 0;
        const production = scaledProduction[p.id] || 0;
        const purchased = Object.values(decisions.procurement.supplierAllocation[p.id] || {}).reduce((s: number, v: any) => s + (v.finishedGoods || 0), 0);
        const available = opening + production + purchased;

        const actualSold = Math.min(demand, available);
        unitsSold[p.id] = actualSold;
        revenueByProduct[p.id] = actualSold * decisions.marketing.prices[p.id];
    });

    const totalRevenue = Object.values(revenueByProduct).reduce((a, b) => a + b, 0);

    // 3. Costs Calculation (COGS)
    let totalCOGS = 0;
    const negotiation = decisions.negotiation;
    const isDealActive = negotiation.status === 'AGREED';

    // Track supplier payments and purchases paid this period
    let purchasesPaidThisPeriod = 0;
    PRODUCTS.forEach(p => {
        const productProc = decisions.procurement.supplierAllocation[p.id] || {};
        let totalComponentCost = 0;
        let totalFGCost = 0;
        let compUnits = 0;
        let fgUnits = 0;

        SUPPLIERS.forEach(s => {
            const alloc = productProc[s];
            if (!alloc) return;
            const discountMultiplier = (isDealActive && negotiation.selectedSupplierId === s) ? (1 - negotiation.agreedDiscount) : 1;
            const compCost = (COMPONENT_COSTS[p.id]?.[s] || 0) * (alloc.components || 0) * materialCostModifier * discountMultiplier;
            const fgCost = (FINISHED_GOODS_COSTS[p.id]?.[s] || 0) * (alloc.finishedGoods || 0) * materialCostModifier * discountMultiplier;
            totalComponentCost += compCost;
            compUnits += (alloc.components || 0);
            totalFGCost += fgCost;
            fgUnits += (alloc.finishedGoods || 0);

            // Determine payment timing factor for this supplier
            const supplierDefaultTerms = (CONFIG as any).suppliers?.[s]?.performance_attributes?.payment_terms_days || 30;
            const agreedTerms = (isDealActive && negotiation.selectedSupplierId === s && negotiation.agreedPaymentTerms) ? negotiation.agreedPaymentTerms : supplierDefaultTerms;
            const termKey = `${agreedTerms}_days`;
            const paymentFactor = (CONFIG as any).supplier_payment_factors?.[termKey] ?? 1.0;
            purchasesPaidThisPeriod += (compCost + fgCost) * paymentFactor;
        });

        const productionUnitCost = ((CONFIG as any).costs?.production?.cost_per_unit) || 720;

        const manufacturedUnits = scaledProduction[p.id] || 0;
        const avgComponentCost = compUnits > 0 ? (totalComponentCost / compUnits) : 0;
        const manufacturedUnitCost = avgComponentCost + productionUnitCost;
        const avgFGUnitCost = fgUnits > 0 ? (totalFGCost / fgUnits) : 0;

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

        totalCOGS += productCOGS;
    });

    // 4. Operating Expenses
    const marketingSpend = decisions.marketing.advertisingBudget + decisions.marketing.promoBudget;
    
    // Store Costs
    const finalStoreCount = team.storeCount + decisions.marketing.openCloseStores;
    const storeRunCost = finalStoreCount * STORE_COSTS.running;
    const storeTransCost = decisions.marketing.openCloseStores > 0 
        ? decisions.marketing.openCloseStores * STORE_COSTS.opening
        : Math.abs(decisions.marketing.openCloseStores) * STORE_COSTS.closing;
    
    // Agent Comm
    const agentSales = totalRevenue * 0.52; // Assume 52% sales via agents
    const agentComm = agentSales * decisions.marketing.agentCommission;

    // HR Payroll & Training
    let payroll = 0;
    let training = 0;
    const staffCounts = { ...team.staffCounts } as Record<string, number>;

    (Object.keys(staffCounts) as HRRole[]).forEach(r => {
        const hire = decisions.hr.hiring[r] || 0;
        staffCounts[r] = (staffCounts[r] || 0) + hire;
        if (staffCounts[r] < 0) staffCounts[r] = 0;

        const monthlySalary = decisions.hr.salaries[r] || 0;
        payroll += staffCounts[r] * monthlySalary * 12;

        const trainingLevel = decisions.hr.trainingLevels[r] || 'None';
        const trainingCostPer = TRAINING_PROGRAMS[trainingLevel]?.cost_per_employee ?? (trainingLevel === 'Basic' ? 9600 : trainingLevel === 'Moderate' ? 32000 : trainingLevel === 'Advanced' ? 48000 : 0);
        training += staffCounts[r] * trainingCostPer;
    });

    const rdSpend = decisions.operations.rdBudget;
    const otherOpex = 22000000; // Fixed Admin
    
    const totalOpex = marketingSpend + storeRunCost + storeTransCost + agentComm + payroll + training + rdSpend + otherOpex;

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

    // Simplified Cash Flow: convert accrual net profit to cash by adjusting for change in debtors and supplier payments
    let newCash = team.cashBalance + netProfit + depreciation - capeX + debtChange + equityChange - changeInDebtors - purchasesPaidThisPeriod;
    
    // Update Inventory Counts
    const newInventory = { ...team.inventory };
    PRODUCTS.forEach(p => {
        const production = scaledProduction[p.id] || 0;
        const bought = Object.values(decisions.procurement.supplierAllocation[p.id] || {}).reduce((s: number, v: any) => s + (v.finishedGoods || 0), 0);
        const sold = unitsSold[p.id];
        newInventory[p.id] = Math.max(0, newInventory[p.id] + production + bought - sold);
    });

    const newTeamState: Team = {
        ...team,
        currentPeriod: team.currentPeriod + 1,
        cashBalance: newCash,
        storeCount: finalStoreCount,
        factoryCapacity: team.factoryCapacity + decisions.operations.capacityChange, // Available next turn
        inventory: newInventory,
        staffCounts: staffCounts,
        longTermDebt: team.longTermDebt + debtChange,
        shareholdersEquity: team.shareholdersEquity + netProfit + equityChange // Retained Earnings + New Equity
    };

    const newKPIs: KPI = {
        revenue: totalRevenue,
        netProfit: netProfit,
        marketShare: marketShares,
        customerSatisfaction: 0.75 + (Math.random() * 0.1), // Mock calc
        employeeSatisfaction: 0.80 + (Math.random() * 0.05)
    };

    return { newTeamState, kpis: newKPIs };
};
