# Backend Configuration & Parameter Management

## Overview
Your simulation now has full backend integration with the JSON resources from the `resources/` folder. Facilitators can view the loaded configuration and adjust parameters in real-time.

## Features Added

### 1. **Backend Configuration Viewer** (`SimulationConfig.tsx`)
Located in: Facilitator Dashboard → **Backend Config** tab

**What it shows:**
- ✅ **Live confirmation** that JSON resources are loaded and active
- **Simulation metadata** - teams, periods, products, suppliers
- **Market demand data** with CAGR growth projections for each product
- **All supplier details** - prices, performance attributes, payment terms
- **Customer buying criteria weights** per product
- **Training programs** with costs and productivity effects
- **Operating costs** - stores, production, innovation
- **Financial parameters** - tax rate, WACC, interest rates
- **Calculation sequence** from calculation_rules.json

**Usage:**
1. Log in as a Facilitator
2. Navigate to Facilitator Dashboard
3. Click the "Backend Config" tab
4. Expand any section to see detailed configuration
5. Verify supplier prices, market growth rates, etc.

### 2. **Parameter Tweaker** (`ParameterTweaker.tsx`)
Located in: Facilitator Dashboard → **Parameter Tweaker** tab

**What you can adjust:**
- 📈 **Market Growth Rates (CAGR)** - adjust per product
- 💰 **Tax Rate** - change corporate tax rate
- 💵 **Interest Rate** - adjust interest income rate
- ⚠️ **Material Cost Modifier** - simulate supply chain disruptions (0.5x to 2.0x)
- 📊 **Demand Modifier** - simulate economic boom/recession (0.5x to 2.0x)
- 🏭 **Production Cost per Unit**
- 🏪 **Store Setup/Running Costs**
- 💡 **Innovation Base Cost**

**Features:**
- **Real-time impact preview** - see how changes affect Year 3 market size
- **Save scenarios** - create and name different parameter configurations
- **Load scenarios** - quickly switch between saved parameter sets
- **Reset to default** - restore original config.json values

**Current Limitation:**
These adjustments currently affect the **display only**. To make them active in the simulation engine:

**Option A: Manual Update**
1. Note your desired parameter changes
2. Update `resources/config.json` with new values
3. Restart the dev server

**Option B: Runtime Override (Future Enhancement)**
Implement a parameter override system in `SimulationContext.tsx` that passes tweaked values to `processTurn()`.

## How the Backend Integration Works

### Files Used:
```
resources/
├── config.json              → Loaded in SimulationEngine.ts
├── calculation_rules.json   → Loaded in SimulationEngine.ts
├── decision_schema.json     → UI form defaults
└── initial_state.json       → Starting team balance sheets
```

### Integration Points:

1. **Market Demand & Growth**
   - Uses `config.market_demand` with CAGR
   - Calculates: `BaseUnits × (1 + CAGR)^(period - 1)`

2. **Supplier Pricing**
   - Component costs from `config.suppliers[].component_prices`
   - Finished goods from `config.suppliers[].finished_goods_prices`
   - Negotiation discounts applied on top

3. **Training & Productivity**
   - Training costs from `config.training_programs`
   - Productivity multipliers: `base_units × (1 + training_effect)`
   - Staff capacity calculation limits production

4. **Customer Buying Criteria**
   - Weights from `config.customer_buying_criteria`
   - Used in market share S-curve calculation
   - Different weights per product (TechBook vs Zroid vs iTab)

5. **Cash Flow Timing**
   - Customer collections: `config.payment_timing_factors`
   - Supplier payments: `config.supplier_payment_factors`
   - Based on payment terms negotiated

## Testing the Backend

### Verify Backend is Active:
1. Go to Facilitator Dashboard → Backend Config
2. Check for green status: "Backend JSON Resources Active"
3. Expand "Market Demand & Growth" - see CAGR rates loaded
4. Expand "Suppliers" - verify prices match your config.json

### Test Parameter Tweaking:
1. Go to Facilitator Dashboard → Parameter Tweaker
2. Adjust "Market Growth Rates" slider for TechBook
3. Watch "Impact on Year 3 Market Size" update in real-time
4. Save the scenario with a name (e.g., "High Growth")
5. Create another scenario (e.g., "Recession") with different parameters
6. Switch between scenarios using the saved scenario buttons

### Verify Calculations:
1. Submit a turn with default parameters
2. Note the market size, revenue, COGS
3. Adjust parameters (e.g., increase material cost modifier to 1.5x)
4. *(Future)* Submit another turn and see COGS increase by ~50%

## Next Steps

### To Make Parameter Tweaking Live:
Add this to `SimulationContext.tsx`:

```typescript
const [simulationParams, setSimulationParams] = useState({
  materialCostModifier: 1.0,
  demandModifier: 1.0,
  // ... other params
});

const submitTurn = () => {
  // Pass params to engine
  const result = processTurn(
    state.currentTeam, 
    state.decisions, 
    activeEvents,
    simulationParams  // ← Add this
  );
  // ...
};
```

Then update `SimulationEngine.ts`:
```typescript
export const processTurn = (
  team: Team,
  decisions: TurnDecisions,
  events: MarketEvent[] = [],
  params?: any  // ← Add this
): SimulationResult => {
  // Use params.materialCostModifier instead of hard-coded 1.0
  let materialCostModifier = params?.materialCostModifier || 1.0;
  // ...
};
```

### Other Enhancements:
- Add debtors/creditors tracking in Team interface
- Implement feature level advancement with R&D investment
- Calculate customer satisfaction from supplier quality scores
- Add facilitator event injection (already in UI, needs backend)

## Access
- Dev server: http://localhost:3000
- Login as Facilitator to access these features
- Default facilitator code from `constants.ts`
