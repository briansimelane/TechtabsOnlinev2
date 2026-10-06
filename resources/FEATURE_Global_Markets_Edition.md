# Feature Request: "Global Markets Edition" — an optional simulation edition

## Scope guard — read this first

This feature adds an **optional, opt-in edition** of the simulation. It must be **purely additive**.

**The non-negotiable rule:**

> A class created without an edition must behave *identically* to today, byte for byte. If every file added by this feature were deleted, the application must still compile and run exactly as it does now.

Concretely, you may **not**:

- Change the behaviour of `processTurn()` for any existing call path.
- Change, rename, or reorder any existing field on `TurnDecisions`, `PeriodRecord`, `Team`, `KPI`, or `SimulationClass`.
- Change `utils/leagueScoring.ts`, `utils/industryPerformance.ts`, `utils/marketShareBackModel.ts`, `utils/marksEngine.ts`, or `constants.ts` values.
- Change any existing page under `pages/decisions/`, `pages/FinancialReports.tsx`, or `pages/MarketReports.tsx` other than to render an **additional** tab when the edition is active.
- Change `firestore.rules` or the Firestore collection structure.
- Refactor, restyle, or "improve" anything not listed under "Integration points".

New behaviour lives in new files under `utils/editions/` and `pages/editions/`. Existing files are touched only at the narrow integration points listed in §10.

**Acceptance gate before this feature is considered done:** run a saved standard class through all its periods before and after the change and diff the resulting `PeriodRecord` objects and the `computeIndustryPerformance()` output. They must be identical. See §12.

---

## 1. Goal

TechTabs currently operates in one country, one currency, with a single debt facility at a fixed interest rate and no covenants. The Global Markets Edition puts the same company into a multi-market, multi-currency environment so that participants experience where market risk enters a business's financial statements, and what it costs to remove it.

The teaching audience is bank Global Markets professionals, so the simulation must make four things visible and consequential:

1. Expansion into a market that does not earn its cost of capital.
2. Currency exposure arising from ordinary operating decisions, not from speculation.
3. The price of certainty — hedging has a carry cost, paid before anyone knows whether it was needed.
4. Covenants, which can be breached without borrowing another cent.

Everything in this document serves that. Anything that doesn't should be cut.

---

## 2. How an edition is selected and stored

### 2.1 Type changes (additive only)

In `types.ts`:

```ts
export type EditionId = 'standard' | 'global-markets';

export interface SimulationClass {
  // ... all existing fields unchanged ...
  editionId?: EditionId;   // absent or 'standard' => current behaviour
}
```

`editionId` is **optional**. Every existing class document in Firestore has no such field and must resolve to `'standard'` through a single helper:

```ts
// utils/editions/index.ts
export const getEdition = (cls?: SimulationClass): EditionConfig | null =>
  cls?.editionId && cls.editionId !== 'standard' ? EDITIONS[cls.editionId] : null;
```

A `null` edition means "standard" everywhere in the code. **Never** branch on `editionId === 'standard'`; branch on `edition != null`. This is what guarantees that deleting the feature restores current behaviour.

### 2.2 Edition data lives in JSON, not in code

Create `resources/editions/global-markets.json`. It is the **single source of truth** for every number in this edition, and it must match the participant case study pack exactly. Do not hard-code any of these values in TypeScript.

```jsonc
{
  "id": "global-markets",
  "label": "Global Markets Edition",
  "flags": {
    "multiMarket": true,
    "treasury": true,
    "covenants": true,
    "marketDesk": true,
    "valueScorecard": true
  },
  "baseCurrency": "ZAR",
  "markets": [ /* §3 */ ],
  "currencies": { /* §4 */ },
  "funding": { /* §6 */ },
  "covenants": { /* §7 */ },
  "scorecard": { /* §9 */ },
  "events": { /* §8 */ }
}
```

Loaded the same way `config.json` and `calculation_rules.json` already are in `utils/SimulationEngine.ts`.

### 2.3 Facilitator selection

In `pages/facilitator/ClassManagement.tsx`, the class-creation form gets **one** new control: an "Edition" dropdown, defaulting to **Standard**. `createClass()` in `contexts/SimulationContext.tsx` takes an optional third argument:

```ts
createClass: (name: string, teamCount: number, editionId?: EditionId) => void;
```

Omitting the argument must produce exactly the class document it produces today — no `editionId` key written at all.

The edition **cannot be changed after the class is created**. Show it as read-only text on the class detail view. Mid-game switching would corrupt history and is not worth supporting.

---

## 3. Markets

### 3.1 Data

```jsonc
"markets": [
  {
    "id": "za", "name": "South Africa", "currency": "ZAR",
    "isHome": true,
    "demandSource": "schedule",        // uses existing getMarketSize() — unchanged
    "priceIndex": 1.00,
    "debtorDaysDefault": 45,
    "entryCost": 0, "channelOptions": ["OWN"],
    "countryRiskPremium": 0.000,
    "repatriationPct": 1.00
  },
  {
    "id": "ng", "name": "Nigeria", "currency": "NGN",
    "demandUnits": { "techbook": 70000, "zroid": 95000, "itab": 45000 },
    "demandCagr": 0.25,
    "priceIndex": 0.85,
    "debtorDaysDefault": 75,
    "entryCost": 12500000, "channelOptions": ["OWN", "DISTRIBUTOR"],
    "distributorMargin": 0.00,
    "importDuty": 0.20,
    "countryRiskPremium": 0.065,
    "repatriationPct": 0.60,
    "repatriationLagPeriods": 1
  },
  {
    "id": "ke", "name": "Kenya", "currency": "KES",
    "demandUnits": { "techbook": 32000, "zroid": 43000, "itab": 20000 },
    "demandCagr": 0.12,
    "priceIndex": 0.95,
    "debtorDaysDefault": 40,
    "entryCost": 7500000, "channelOptions": ["DISTRIBUTOR"],
    "distributorMargin": 0.03,
    "importDuty": 0.10,
    "countryRiskPremium": 0.035,
    "repatriationPct": 1.00
  }
]
```

`priceIndex` is the market's price tolerance relative to South Africa, used to set the market's **price anchor** — see §3.3.

### 3.2 Decision

New optional block on `TurnDecisions`:

```ts
export interface MarketDecision {
  active: boolean;                          // is the team selling here this period
  channel: 'OWN' | 'DISTRIBUTOR';
  prices: Record<ProductId, number>;        // in LOCAL currency
  debtorDays: Record<ProductId, number>;    // per market, local terms
}

export interface TurnDecisions {
  // ... existing fields entirely unchanged ...
  markets?: Record<string, MarketDecision>; // keyed by market id; absent => standard
}
```

Absent `markets` must be treated as "home market only, exactly as today". Do **not** add this key to `INITIAL_DECISIONS` in `constants.ts`. Build edition defaults in a separate `utils/editions/globalMarkets/defaults.ts` and merge them in only when the edition is active.

### 3.3 Calculation

Per market, per product, reuse the **existing** scoring machinery — do not write a second market-share algorithm:

1. Convert the team's local price to a comparable basis: `priceZAREquivalent = localPrice / spotRate(currency, period)`.
2. Score it against a market-specific anchor: `anchor_market = MARKET_ANCHORS.price[product] × market.priceIndex`.
3. Call the existing exported `sCurve(priceZAREquivalent, anchor_market, false)` from `utils/SimulationEngine.ts`.
4. All other sub-scores (advertising, stores, agents, innovation, terms) use the team's **global** decisions unchanged — this edition does not split marketing budgets by country. Terms use that market's `debtorDays`.
5. Weighted sum with the existing `WEIGHTS`, then the existing share mapping (`0.16 × rawScore / 0.5`, clamped 0.01–0.50).
6. Market size: home market uses `getMarketSize(productId, period)` **unchanged**; other markets use `demandUnits[product] × (1 + demandCagr)^(period − 1)`.

Units sold are then constrained by total available inventory across all markets. Allocate scarce units to markets **in descending order of local gross margin per unit**, and report any unfilled demand per market. State this rule in the student-facing report so it is not a black box.

### 3.4 Result

| What the team decides | What is calculated | What they see |
|---|---|---|
| Enter Nigeria, own stores, price in NGN | Entry cost charged to the period's cash flow and capitalised to fixed assets; local demand × earned share; revenue converted to ZAR | Revenue by market; cash down by the entry cost; a new line in the Value Creation report |
| Price too high for the market | Lower `sCurve` price score against that market's anchor → lower share | Unfilled demand and share by market in the Market Report |
| Enter both markets at once | R20m of entry cost in one period | Cash and leverage move immediately; covenant headroom narrows |

---

## 4. Currencies and FX

### 4.1 Data

```jsonc
"currencies": {
  "ZAR": { "rate": 0.115 },
  "USD": { "spot": 18.50, "rate": 0.045, "path": [18.50, 19.10, 21.30] },
  "NGN": { "spot": 0.01156, "rate": 0.240, "path": [0.01156, 0.01120, 0.00830] },
  "KES": { "spot": 0.1435, "rate": 0.140, "path": [0.1435, 0.1405, 0.1330] }
}
```

`spot` and `path` are **ZAR per one unit of foreign currency** (so USD 18.50, NGN 0.01156 ≈ 1/86.5). `path[i]` is the rate at the **end** of period `i + 1`. `rate` is that currency's annual interest rate, used for forward pricing.

Keep the path in the JSON so you can tune the pedagogy without touching code. Note that the Year 2 entries encode the shock in §8: the rand weakens against the dollar and the naira steps down hard.

### 4.2 Rates used in calculation

- **Transactions during the year** settle at the average: `avg = (openSpot + closeSpot) / 2`.
- **Balance sheet items** (foreign cash, receivables, debt) translate at `closeSpot`.
- **Forward rate**, by covered interest parity, for tenor `t` years:

```
forward = openSpot × (1 + rate_ZAR × t) / (1 + rate_foreign × t)
```

This is the single most important formula in the feature. It produces the teaching point on its own: because ZAR rates (11.5%) exceed USD rates (4.5%), twelve-month forward USD prices about 7% above spot, and because NGN rates are 24%, forward NGN prices far below spot. **Do not** add a spread, a view, or a fudge factor. The carry must be visibly the interest differential and nothing else.

### 4.3 The team's exposures

Computed, not decided. Four exposure ids:

| Exposure id | Direction | Source |
|---|---|---|
| `USD_COSTS` | Short USD (pays) | Component and finished-goods purchases from suppliers flagged `"currency": "USD"` in the edition file (Zen and Cheng) |
| `NGN_REVENUE` | Long NGN (receives) | Nigerian revenue plus opening Nigerian receivables |
| `KES_REVENUE` | Long KES (receives) | Kenyan revenue plus opening Kenyan receivables |
| `USD_DEBT` | Short USD | Long-term debt principal and interest, when `fundingCurrency === 'USD'` |

Supplier costs in `constants.ts` stay in rands and are **not** edited. In the edition, the USD base cost is derived once: `usdCost = randCost / currencies.USD.spot`, then re-converted each period at that period's rate. This keeps Year 1 opening economics identical to the standard edition while making the rand's movement bite from Year 2.

---

## 5. The market desk (hedging)

### 5.1 Decision

```ts
export interface TreasuryDecisions {
  hedges: Record<string, { coverPct: number; tenorMonths: 6 | 12 }>;  // keyed by exposure id
  fundingCurrency: 'ZAR' | 'USD' | 'LOCAL';
  rateBasis: 'FIXED' | 'FLOATING';
  fixedPct: number;                 // 0–100, only when rateBasis === 'FIXED'
}

export interface TurnDecisions {
  // ... existing fields entirely unchanged ...
  treasury?: TreasuryDecisions;
}
```

`coverPct` is 0–100. Kenya's forward market is shallow: reject `tenorMonths: 12` on `KES_REVENUE` with a validation message, per `market.maxHedgeTenor` in the edition file.

### 5.2 Locking order — this is the pedagogy, get it right

The hedge decision must be committed **before** the period's market event is revealed. In practice:

- The exposure estimate shown at decision time is based on the team's **own forecast** (`forecastedMarketShare` × market size × price), not on the actual outcome. A team that over-forecasts over-hedges, which is itself a lesson.
- The facilitator reveals the event (§8) only after turn processing. The `ClassEvent` mechanism already in `types.ts` is the right vehicle — no new reveal machinery.
- Never let the engine "helpfully" cap cover at the realised exposure. Over-hedging must cost money.

### 5.3 Calculation

For each exposure with `coverPct > 0`:

```
coveredAmount   = exposureForeign × coverPct / 100
forwardRate     = openSpot × (1 + rateZAR × t) / (1 + rateForeign × t)
settledAtForward = coveredAmount × forwardRate
settledAtSpot    = (exposureForeign − coveredAmount) × avgSpot
zarValue         = settledAtForward + settledAtSpot

hedgeCostOrGain  = coveredAmount × (forwardRate − avgSpot)   // sign relative to staying open
```

Sign convention: for a **payable** (`USD_COSTS`, `USD_DEBT`) a positive `forwardRate − avgSpot` is a cost; for a **receivable** (`NGN_REVENUE`, `KES_REVENUE`) it is a gain. Store both the cost and the counterfactual so the debrief can show them side by side.

Over-hedging (`coveredAmount > actualExposure`) settles the excess at `(forwardRate − avgSpot) × excess` as a realised gain or loss with no offsetting operating flow. Report it on its own line — teams need to see that over-hedging is a position, not protection.

### 5.4 Result

| Decision | Calculation | Result |
|---|---|---|
| Cover 100% of USD costs, 12m | Costs settle at ~19.80 instead of a realised average | Pays ~7% carry. If the rand holds, that is a pure cost. If it falls 15%, they avoided 15% and paid 7% |
| Cover 0% | Everything at realised average | Year 2 rand weakness lands straight in COGS and compresses gross margin |
| Cover 100% of NGN revenue | Receipts fixed at a forward far below spot | They have locked in the devaluation rather than avoided it — the right debrief conversation |

---

## 6. Funding and capital structure

### 6.1 Data

```jsonc
"funding": {
  "rates": { "ZAR": 0.115, "USD": 0.060, "LOCAL_NG": 0.240, "LOCAL_KE": 0.140 },
  "fixedPremium": 0.010,
  "floatingPath": [0.000, 0.040, -0.015],
  "creditGrades": [
    { "id": "A", "maxLeverage": 1.5, "maxPlanVariance": 0.10, "margin": 0.010 },
    { "id": "B", "maxLeverage": 2.5, "maxPlanVariance": 0.25, "margin": 0.020 },
    { "id": "C", "maxLeverage": 3.0, "maxPlanVariance": 0.50, "margin": 0.035 },
    { "id": "D", "maxLeverage": 99,  "maxPlanVariance": 99,   "margin": 0.055 }
  ]
}
```

`FINANCE_CONSTANTS.interestRate` (0.065) in `constants.ts` stays untouched and continues to govern the standard edition.

### 6.2 Calculation

- Interest rate = `rates[fundingCurrency] + creditGrade.margin + (rateBasis === 'FIXED' ? fixedPremium : floatingPath[period − 1])`.
- USD debt is revalued at `closeSpot` each period. The movement in the ZAR carrying value is an **unrealised FX loss or gain** taken through the income statement on its own line, and the balance sheet `longTermDebt` carries at the revalued amount.
- Credit grade is assigned on **last period's** closing leverage and plan variance (first-period teams start at B), so a team can watch its own cost of debt deteriorate as a consequence of its earlier choices.
- Overdraft continues to use `FINANCE_CONSTANTS.overdraftInterestRate` unchanged.

The trap is deliberate and must survive implementation: `rates.USD` (6.0%) is roughly half `rates.ZAR` (11.5%), so dollar funding looks obviously correct until Year 2, when the revaluation hits both the interest charge and the debt balance while earnings stay in rands.

---

## 7. Covenants

### 7.1 Data

```jsonc
"covenants": {
  "netDebtToEbitda": { "max": 3.0 },
  "interestCover":   { "min": 3.0 },
  "breachPenaltyMargin": 0.025,
  "breachBlocksDividends": true
}
```

### 7.2 Calculation

Tested at each period end, after the income statement is complete:

- `netDebt = longTermDebt + max(0, −cash)`; `netDebt / ebitda ≤ 3.0`.
- Interest cover uses the **existing** `interestCoverage` already computed in `utils/SimulationEngine.ts` (`(ebt + interest) / interest`). Do not recompute it differently.

On breach: add `breachPenaltyMargin` to next period's rate, force `dividends = 0` for the next period (validate on the Finance decision page with a clear message), and set a flag the facilitator and debrief can read. Breaches are visible in the debrief by design.

**Do not** auto-cure, auto-raise equity, or otherwise rescue a team. A breached team must have to decide between defending the balance sheet and defending the strategy — that is the Year 2 lesson.

---

## 8. Market events

One compound event in period 2, driven entirely by the FX and rate paths already in the edition file — no new event engine, and no reuse of the `MarketEvent` effects enum.

```jsonc
"events": {
  "2": {
    "title": "Naira devaluation and a higher-for-longer rand",
    "body": "...",            // shown via the existing ClassEvent / ScenarioBriefing mechanism
    "reveal": "AFTER_DECISIONS"
  }
}
```

Period 1 is deliberately quiet: `path[1]` moves the rand only ~3%. Teams need one clean round to find their footing before the shock, especially in a two-round delivery. Resist the temptation to add noise to Year 1.

The facilitator must be able to trigger the reveal manually, so timing follows the room. Use the existing `ClassEvent` with `visibleToStudents` toggled.

---

## 9. The scorecard

### 9.1 Leave `utils/leagueScoring.ts` alone

Create `utils/editions/globalMarkets/scoring.ts` exporting the same shape of result so the existing League slides can render either. The debrief picks the scorer based on the edition, nothing else changes.

### 9.2 Measures (four, equally weighted, same ranked-points method as today)

| Measure | Formula |
|---|---|
| Economic profit | `NOPAT − Σ_markets (investedCapital_market × waccForMarket)` where `waccForMarket = FINANCE_CONSTANTS.wacc + market.countryRiskPremium` |
| Net profit % | Existing `npMargin` from `computeIndustryPerformance()` |
| Cash conversion | `cashFlow.operating / ebitda`, clamped to [−1, 2] |
| Delivery against plan | `1 − |actualNetProfit − plannedNetProfit| / max(|plannedNetProfit|, 1)`, floored at 0 |

`NOPAT = ebit × (1 − taxRate)` using the existing `taxRate`. Invested capital per market = that market's fixed assets (entry cost, depreciated) plus its working capital (receivables + allocated inventory − local payables). Home market takes the residual.

"Planned net profit" is the team's own Year 1 submission. Add one field to the treasury decision block (`plannedNetProfit: number`) captured on the strategy planning screen in period 1 only, and store it on the team document. A team that does not submit one scores 0 on that measure — say so on the screen.

ROE continues to be computed and reported but is **not** scored in this edition. It rewards leverage, which is the behaviour the day is designed to interrogate.

### 9.3 Qualifying gates

Disqualification if any of: CSAT < 74%, ESAT < 74%, an uncured covenant breach at the final period end, or cash below zero beyond the overdraft limit. The first two reuse the existing hurdle logic in `utils/marksEngine.ts` — read it, don't rewrite it.

---

## 10. Integration points — the complete list

Everything else is new files. These are the only existing files you may touch, and only as described:

1. **`types.ts`** — add `EditionId`, `editionId?` on `SimulationClass`, `markets?` and `treasury?` on `TurnDecisions`, `gm?: GlobalMarketsRecord` on `PeriodRecord`. All optional. No existing field changed.
2. **`contexts/SimulationContext.tsx`** — `createClass` takes an optional `editionId`; the three `processTurn(...)` call sites (lines ~257, ~945, ~2491) pass an optional fourth argument `edition` resolved via `getEdition(currentClass)`. When it is `null`, behaviour is unchanged.
3. **`utils/SimulationEngine.ts`** — `processTurn` gains a fourth optional parameter. Inside, a single early branch: if `edition` is null, run the existing body untouched; otherwise delegate the new calculations to `utils/editions/globalMarkets/engine.ts`. Do not interleave `if (edition)` checks through the existing 700 lines — that is how the standard edition breaks six months from now.
4. **`pages/facilitator/ClassManagement.tsx`** — one Edition dropdown on the create form.
5. **`pages/FinancialReports.tsx`** — append new tabs to the `ReportTab` union and tab list **only when the edition is active**.
6. **`App.tsx`** — routes for the new decision page and report pages.
7. **`components/Sidebar.tsx`** — conditional nav entry for "Treasury & Markets".
8. **`utils/debriefSlides.tsx`** — append new slides to the registry when the edition is active; existing slide ids and order unchanged.

---

## 11. New results and reports

All new figures must be derived from the same computation that feeds the debrief, following the existing rule that debrief numbers come from the Industry Performance path and are never recomputed in the slide layer.

Store them on `PeriodRecord.gm`:

```ts
export interface GlobalMarketsRecord {
  byMarket: Record<string, {
    revenueLocal: number; revenueZAR: number; unitsSold: Record<ProductId, number>;
    unfilledDemand: Record<ProductId, number>; grossProfitZAR: number;
    investedCapital: number; wacc: number; economicProfit: number;
    trappedCash: number;
  }>;
  exposures: Record<string, {
    exposureForeign: number; coverPct: number; forwardRate: number; avgSpot: number;
    hedgeCostOrGain: number; counterfactual: number; overHedged: number;
  }>;
  funding: { currency: string; rate: number; creditGrade: string; fxRevaluation: number; };
  covenants: { netDebtToEbitda: number; interestCover: number; breached: string[]; };
  scorecard: { economicProfit: number; cashConversion: number; planVariance: number; };
}
```

**Student report tabs** (new, only when the edition is active):

- **Exposure Report** — by currency: revenue, costs, assets, liabilities, net open position, covered vs uncovered.
- **Value Creation Report** — NOPAT, invested capital, ROIC, WACC and economic profit **by market**. This is the report participants will photograph.
- **Covenant & Funding Report** — leverage, interest cover, headroom against each threshold, credit grade, rate build-up.
- **Market Desk** — forward rates by currency and tenor with the interest-rate build-up shown, so the carry is never mysterious.

**New debrief slides**, appended after the existing Operations section and before the League section:

| Slide id | Title | Content |
|---|---|---|
| `gm-exposure` | Net Open Position by Team | Grouped bar, one bar per currency |
| `gm-cost-of-certainty` | The Cost of Certainty | Per team: hedge cost paid vs. exposure loss avoided. **The money slide** — this is what the whole afternoon builds to |
| `gm-economic-profit` | Economic Profit by Market | Stacked bar, negative values must render below the axis |
| `gm-covenants` | Covenant Headroom | Breaches flagged in red |
| `gm-plan-vs-actual` | Delivery Against Plan | Planned vs actual net profit per team |

---

## 12. Testing

**Regression (blocking).** Before starting, export a completed standard class's `history` for every team to a fixture file. After implementation, re-run the same decisions through `processTurn()` with no edition and assert deep equality on every `PeriodRecord` and on `computeIndustryPerformance()` output. Commit the fixture. This test must run in CI and must never be weakened.

**Unit tests for the new engine:**

1. Forward pricing: USD 12m from spot 18.50 at 11.5% / 4.5% returns 19.74 ± 0.01. NGN forward is *below* spot.
2. A 100% hedge with a flat FX path produces a cost exactly equal to the carry, and zero FX gain.
3. A 0% hedge through the period-2 path produces the full adverse movement in COGS.
4. Over-hedging by 20% produces a standalone realised loss with no operating offset.
5. A market returning 18% in Nigeria produces positive net profit and **negative** economic profit.
6. A team with unchanged debt breaches the leverage covenant purely from an EBITDA fall — confirming the covenant is a ratio test, not a borrowing test.
7. USD debt revaluation moves both the interest charge and the balance sheet carrying value.
8. A missing `plannedNetProfit` scores 0 on delivery and does not throw.

**Scenario test:** two teams, identical operating decisions, differing only in `coverPct`. Through the period-2 path, the hedged team must end with lower profit in period 1 and materially higher profit in period 2. If that is not true, the carry or the FX path is wrong, and the session has no debrief.

---

## 13. Build order

**Phase 1 — required for the session**

1. Edition plumbing (§2) plus the regression fixture and test (§12). Nothing else starts until this passes.
2. Markets: Nigeria and Kenya, demand, pricing, entry cost (§3).
3. FX: spot paths, exposure calculation, forward pricing, the hedge decision with forwards only (§4, §5).
4. Funding currency and rate basis; USD debt revaluation (§6).
5. Covenant test with penalty (§7).
6. Exposure Report and Value Creation Report (§11).
7. Economic-profit scorecard and gates (§9).
8. Two debrief slides: `gm-exposure` and `gm-cost-of-certainty`.
9. The period-2 compound event (§8).

**Phase 2 — later**

Options and collars with a volatility input; Egypt and a hard-currency export market; trapped cash and repatriation lag; the full credit-grade spread mechanism; a sensitivity / cash-flow-at-risk report; receivable financing and letters of credit.

**Minimum viable fallback** if Phase 1 runs short: Nigeria only, forwards on `USD_COSTS` and `NGN_REVENUE`, and the covenant test. Those three alone carry the teaching argument. Everything else is enrichment.

---

## 14. Consistency requirement

Every number in `resources/editions/global-markets.json` — demand, price indices, entry costs, spot rates, interest rates, covenant thresholds, country risk premiums — must match the participant case study pack exactly. Participants do their pre-work from that document and will notice within minutes if the simulation disagrees with it. When a value changes, it changes in both places in the same commit.
