# Business Simulation JSON Documentation

## Overview
This package contains JSON files extracted from your Excel-based business simulation, structured for building an online version. The simulation is a competitive, multi-team business strategy game covering Marketing, Operations, Procurement, HR, and Finance decisions.

## Core JSON Files

### 1. **config.json** (9.6 KB)
Master configuration file containing all static game parameters:
- Market demand data and growth rates for 3 products (TechBook, Zroid, iTab)
- 4 supplier profiles with performance attributes and pricing
- Training programs (4 levels from None to Advanced)
- Employee productivity rates for 5 categories
- Customer buying criteria (weighted importance by product)
- Financial parameters (interest, tax, WACC)
- Payment timing factors for cash flow modeling
- Customer satisfaction impact multipliers

**Use:** Load once at game initialization. Reference throughout for all game rules and parameters.

### 2. **initial_state.json** (7.1 KB)
Starting financial position and operational state for teams at Period 1:
- Complete chart of accounts with starting balances
- Asset accounts (cash, debtors, inventory, PPE)
- Liability accounts (creditors, overdraft, debt)
- Equity accounts
- Operational state (employees, capacity, stores, product features)
- All 8 teams start with identical positions

**Use:** Clone this template for each team at game start. Teams diverge from Period 2 onwards based on their decisions.

### 3. **decision_schema.json** (22 KB)
Complete definition of all decisions teams can make each period:
- **Marketing:** Market share targets, forecasts, pricing, advertising budget/allocation, distribution channels
- **Operations:** Production quantities, finished goods purchases, capacity changes, innovation budget/allocation, product features
- **Procurement:** Supplier selection and negotiation for 4 suppliers (performance attributes, component/FG pricing and volumes)
- **HR:** Recruitment, remuneration, and training for 5 employee categories
- **Finance:** Customer payment terms, debt management, equity management

Each decision includes:
- Data type (integer, currency, percentage, enum)
- Validation rules (min, max, allowed values)
- Default values from Period 1
- Constraints and dependencies

**Use:** Generate decision input forms. Validate submissions. ~100-150 individual decisions per team per period.

### 4. **calculation_rules.json** (13 KB)
Business logic and formulas that govern game progression:
- 12-step calculation sequence
- Market mechanics (demand calculation, market share allocation, sales)
- Financial calculations (revenue, COGS, operating expenses, cash flow)
- Balance sheet updates (all accounts)
- Production mechanics (capacity constraints, component requirements, productivity)
- Supplier dynamics (pricing, performance impacts, payment timing)
- Customer satisfaction calculation and demand impacts
- Performance metrics (profitability, efficiency, liquidity, leverage ratios)
- Competitive dynamics and strategic trade-offs
- Event system for random market events
- Validation and error handling rules

**Use:** Core calculation engine. Implement these formulas to process decisions and generate results.

### 5. **integration_guide.json** (16 KB)
Implementation guide and architecture recommendations:
- Overview of simulation and data flow
- Frontend/backend architecture recommendations
- Technology stack suggestions
- 4-phase implementation plan (Foundation → Competition → Sophistication → Polish)
- Key implementation patterns (decision collection, calculation execution, state management)
- Detailed market share algorithm pseudocode
- Data structure definitions
- Testing strategy and scenarios
- Facilitator feature requirements
- Performance and scalability considerations
- Migration equivalences from Excel
- Next steps and additional resources

**Use:** Development roadmap and technical reference for building the online simulation.

## File Relationships

```
┌─────────────────┐
│   config.json   │ ──┐
│  (static rules) │   │
└─────────────────┘   │
                      ▼
┌─────────────────┐   ┌──────────────────────┐   ┌─────────────────┐
│initial_state.json├─>│   Game State Store    │<──┤decision_schema  │
│ (Period 1 start)│   │  (current position)   │   │ (input forms)   │
└─────────────────┘   └───────────┬──────────┘   └─────────────────┘
                                  │
                                  ▼
                      ┌─────────────────────────┐
                      │ calculation_rules.json  │
                      │   (process decisions)   │
                      └───────────┬─────────────┘
                                  │
                                  ▼
                      ┌───────────────────────┐
                      │   Updated Game State  │
                      │  (Period N+1 start)   │
                      └───────────────────────┘
```

## Quick Start

1. **Review** `integration_guide.json` for architecture and implementation approach
2. **Load** `config.json` into your application as global configuration
3. **Initialize** game state for each team using `initial_state.json`
4. **Build** decision input forms from `decision_schema.json`
5. **Implement** calculation engine using `calculation_rules.json`
6. **Test** with single team before adding competition

## Key Design Principles

1. **Separation of Concerns:** Configuration, state, schema, and logic are separated for flexibility
2. **Immutable State:** Each period's state is saved separately for audit trail and rollback
3. **Validation at Multiple Levels:** Client-side (schema), business rules (calculations), and constraints
4. **Competition-Driven:** Teams compete for market share using weighted scoring across buying criteria
5. **Financial Realism:** Double-entry bookkeeping, statements must balance, cash flow tracking

## Data Sizes and Complexity

- **3 products** (TechBook, Zroid, iTab) with distinct characteristics
- **4 suppliers** (Alpha, Neepo, Zen, Cheng) with different strengths
- **5 employee categories** with productivity and training effects
- **8 teams** competing (can scale 1-20)
- **6 periods** typical duration (can extend to 12+)
- **~100-150 decisions** per team per period
- **50+ KPIs** calculated each period

## Technical Notes

- All currency values in consistent units (e.g., rand)
- Percentages stored as whole numbers in JSON (25 = 25%)
- Internal calculations may use decimals (0.25)
- Account codes follow pattern: XX-Y-ZZ (category-product-subaccount)
- Named ranges from Excel preserved as keys for traceability

## Support and Extensions

These JSON files capture the current Excel version. As you develop the online version, you can:
- Add new products or suppliers
- Introduce new decision types
- Extend calculation rules
- Add events and scenarios
- Customize for specific learning objectives

## Notes

- Original Excel file: Non_Macro_v1.xlsx (43 worksheets)
- Extraction date: February 8, 2026
- Structure designed for AI-assisted development
- All formulas and logic preserved from Excel model

For questions or clarifications about specific calculations or structures, refer to the original Excel file or the detailed comments within each JSON file.
