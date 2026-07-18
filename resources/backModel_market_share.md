# Antigravity Task: Recreate the Excel `backModel` — Actual Market Share Calculation (Facilitator View Only)

## Objective

Recreate the **actual market share engine** from the `backModel` sheet of `Henley_Simulation_Master_1.xlsm` inside the app, and expose the **full calculation working** (raw inputs → per-criterion scores → weighted scores → market share) in the **Facilitator view only**.

**Hard constraints:**

1. **Do NOT change anything students see.** The student/participant views, existing decision forms, and any results currently shown to teams must render exactly as they do today.
2. Implement the model as a **pure, standalone module** (e.g. `src/utils/marketShareBackModel.ts`) that takes all-team decisions/state as input and returns a fully transparent breakdown object. Only the Facilitator Dashboard consumes it.
3. The facilitator panel is **read-only** — it displays the working; it does not write back into team state.
4. Follow the Excel spec below **exactly** (including the documented quirks section) — this model is *relative* (teams are scored against each other), not absolute.

---

## 1. Model Overview (how Excel does it)

For each of the 3 products (Prod1 = **TechBook**, Prod2 = **Zroid**, Prod3 = **iTab**), the `backModel` sheet:

1. Determines which teams are **active** in that product's market.
2. Collects a **raw input value** per team for each of **10 customer buying criteria**.
3. Converts each raw value into a **score in (0, 1)** using the **normal cumulative distribution** (`NORMDIST(x, μ, σ, TRUE)`) where μ and σ are computed **across all teams** — i.e. every team is scored on where it sits relative to the field.
4. Multiplies each criterion score by a **product-specific driver rating** (customer buying criteria weights) and sums them into a **Total Score** per team.
5. **Market Share = team Total Score ÷ sum of all teams' Total Scores** (normalised to 1.0 across teams, per product).
6. Market share then drives units sold: `Units Sold = MIN(marketShare × marketDemand(period), unitsAvailableForSale)`.

---

## 2. Inputs

### 2.1 Per-team decision inputs (from the decisions table already implemented)

| Excel name | Meaning |
|---|---|
| `decProd{N}MS` | Team's **own market-share estimate** for product N (a decision input). Used ONLY as the activity gate here (and for participant-mode forecasts). |
| `decProd{N}Price` | Selling price for product N |
| `decProd{N}DebtorDays` | Payment terms offered to customers for product N (days) |
| `decCapacity` | Production capacity change this period |
| `decCommission` | Agent commission rate |
| `decAdvertising` | Total advertising budget |
| `decGenAdv` | % of advertising allocated to general/company advertising |
| `decProd{N}Adv` | % of advertising allocated to product N |

### 2.2 Per-team state inputs (period opening/closing balances)

| Excel name | Meaning |
|---|---|
| `startCapacity` | Opening production capacity |
| `endStores` | Closing number of company stores (opening + open/close decision) |
| `endNegot5` | Closing headcount of employee type 5 = **Customer Service** staff |
| `endBrand{N}` | Closing **brand/innovation asset** for product N (cumulative: opening brand + this period's brand-building transactions, driven by innovation/advertising postings in `backTxrs`) |
| `calcOtherEffects` | "Other effects" hook — **currently hardcoded to 0** in Excel |

### 2.3 Configuration

| Excel name | Value |
|---|---|
| `setNumberOfTeams` | Number of teams in play (1–10) |
| `setPeriod` | Current period index (used to pick the demand column and one rating) |
| `tlsProd{N}Demand` | Market demand schedule per product per period (see §6) |
| `tlsDriver1` table | Customer buying criteria ratings (see §3) |

---

## 3. The Driver Table (`tlsDriver1`) — Customer Buying Criteria Ratings

This is the weighting table from `backTables!F79:I88`. Column per product, row per criterion. **These are the scoring weights.**

| # | Criterion | Raw input per team | TechBook | Zroid | iTab |
|---|---|---|---|---|---|
| 1 | Price | `decProd{N}Price` | 10 | 5 | **`IF(period == 3, 8, 3)`** |
| 2 | Payment Terms | `decProd{N}DebtorDays` | 9 | 3 | 2 |
| 3 | Availability | `startCapacity + decCapacity` | 7 | 6 | 9 |
| 4 | Stores | `endStores` | 8 | 8 | 5 |
| 5 | Agents | `decCommission` | 4 | 7 | 6 |
| 6 | Staff Availability | `endNegot5` (Customer Service headcount) | 3 | 4 | 8 |
| 7 | Product Innovation | `endBrand{N}` | 8 | 8 | 10 |
| 8 | Company Advertising | `decAdvertising × decGenAdv` | 6 | 9 | 4 |
| 9 | Product Advertising | `decAdvertising × decProd{N}Adv` | 5 | 10 | 7 |
| 10 | Other | `calcOtherEffects` (currently 0) | 0 | 0 | 0 |

Notes:
- The **only shared inputs across products** are criteria 3, 4, 5, 6, 8, 10 (same team value used in all three product models — only the *rating* differs).
- Criteria 1, 2, 7, 9 use **product-specific** values.
- The iTab Price rating is **period-dependent**: rating 8 in period 3, otherwise 3 (Excel: `=IF(setPeriod=3,8,3)`).
- Keep these ratings in a config object so the facilitator's Parameter Tweaker could later override them.

---

## 4. The Algorithm — replicate exactly

Pseudocode / TypeScript sketch. Run once per product `p ∈ {techbook, zroid, itab}` per period.

### Step 1 — Active flag per team

```
active[t] = (teamIndex(t) <= setNumberOfTeams) AND (decisions[t].prodMS[p] >= 0.000001)
activeCount = count(active[t] == true)
```
Excel: `=IF(setNumberOfTeams < k, FALSE, IF(decProd{N}MS < 0.000001, FALSE, TRUE))` per team column, `R8 = COUNTIF(..., TRUE)`.
A team that enters a 0% market-share estimate for a product is **out of that product's market entirely** and scores 0 on everything for it.

### Step 2 — Raw value matrix (per criterion c, per team t)

```
raw[c][t] = active[t] ? inputValue(c, p, t) : 0
```

### Step 3 — Field statistics per criterion

```
sigma[c] = STDEVP(raw[c][allTeamSlots 1..10])      // POPULATION std dev, zeros included
if (sigma[c] == 0) sigma[c] = 1                    // Excel: STDEVP(...)*1 + (STDEVP(...)=0)
mu[c]    = (activeCount == 0) ? 0 : SUM(raw[c][*]) / activeCount
```

Critical details:
- `STDEVP` is **population** standard deviation (divide by n, not n−1), computed over **all 10 team slots including the zeros** of inactive/absent teams. This matches Excel even if it looks odd — do not "fix" it to active-only.
- `mu` divides the sum by the **active count** (inactive teams contribute 0 to the sum), so μ is effectively the mean of active teams' values.
- There is also a per-criterion σ multiplier in Excel (column G, e.g. `G9 = 1`) — it is **1 for every criterion** today. Keep it as a configurable `sigmaMultiplier` defaulting to 1: `sigma = STDEVP(raw) * sigmaMultiplier + (STDEVP == 0 ? 1 : 0)`.

### Step 4 — Per-criterion score per team (Normal CDF)

```
// Criterion 1 (Price) — LOWER is better:
score[1][t] = (raw[1][t] == 0) ? 0
            : (1 - normCdf(raw[1][t], mu[1], sigma[1])) * (active[t] ? 1 : 0)

// Criteria 2..10 — HIGHER is better (yes, including Payment Terms:
// longer debtor days = more attractive to customers):
score[c][t] = (raw[c][t] == 0) ? 0
            : normCdf(raw[c][t], mu[c], sigma[c]) * (active[t] ? 1 : 0)
```

`normCdf(x, μ, σ)` = cumulative normal distribution = `0.5 * (1 + erf((x - μ) / (σ * √2)))`. JavaScript has no built-in — use an `erf` approximation (Abramowitz & Stegun 7.1.26 is fine, max error ~1.5e-7):

```ts
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}
function normCdf(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}
```

### Step 5 — Weighted total score per team

```
weighted[c][t]  = rating[p][c] * score[c][t]     // rating from §3 table
totalScore[t]   = Σ over c=1..10 of weighted[c][t]
```

### Step 6 — Market share

```
grandTotal      = Σ over all teams of totalScore[t]
marketShare[t]  = (grandTotal == 0) ? 0 : totalScore[t] / grandTotal
```

Shares across teams sum to 1.0 per product (this is the zero-sum competitive allocation). **Guard the division** — Excel would show `#DIV/0!` if no team is active; return 0s instead.

### Step 7 — Units sold (how the share is consumed — facilitator/auto mode)

```
demand[p]        = demandSchedule[p][setPeriod]          // §6
unitsSold[t][p]  = MIN(marketShare[t][p] * demand[p], availableForSale[t][p])
availableForSale = openingStock + unitsProduced + finishedGoodsPurchased
```

Excel: `=MIN(mmProd{N}MS * OFFSET(tlsProd{N}Demand, 0, setPeriod), availableForSale)`. (Participant mode instead uses `MIN(decProd{N}UnitsForecast × whatIf, availableForSale)` — that path is what students currently see; leave it untouched.)

---

## 5. Known Excel quirks — replicate intent, document deviations

The workbook contains three copy-paste bugs. Because the "Other" criterion rating is 0 for all products, **none of them changes the result today**, so implement the *intended* logic below and note this in code comments:

1. **Prod1 Criterion 10 score row** (`H37:Q37`) references Criterion 9's μ/σ (`$R$34, $G$34`) instead of its own (`$R$37, $G$37`). Intended: use its own μ/σ.
2. **Prod2 & Prod3 Criterion 10 mean cells** (`R87`, `R137`) divide by **Prod1's** active count (`$R$8`) instead of their own (`R58`/`R108`). Intended: divide by own product's active count.
3. **Holder column** of the units-sold rows (`backCalculations!G4:G5`) uses `mmProd1MS` for Products 2 and 3; the actual team columns (`H4:Q5`) are correct. Ignore the holder column.

Also note: `calcOtherEffects` is a hook that is hardcoded to 0 — implement it as a configurable per-team input defaulting to 0.

---

## 6. Market Demand Schedule (`tlsProd{N}Demand`, from `backTables`)

Columns are indexed by `setPeriod` (0-based: col 0 = Yr0 base):

| Product | Yr0 | Yr1 | Yr2 | Yr3 (Period 3) | P4 onward | CAGR from P4 |
|---|---|---|---|---|---|---|
| TechBook | 288,750 | 187,588 | 240,800 | 82,500 | `ROUNDUP(prev × 1.055)` | 5.5% |
| Zroid | 179,888 | 260,242 | 287,930 | 160,000 | `ROUNDUP(prev × 1.075)` | 7.5% |
| iTab | 89,750 | 127,559 | 251,407 | 180,000 | `ROUNDUP(prev × 1.105)` | 10.5% |

(P4 examples: TechBook 87,038 → 91,826 → 96,877; Zroid 172,000 → 184,900 → 198,768; iTab 198,900 → 219,785 → 242,863.) If the app already has a demand schedule in `config.json`, reconcile against these numbers and prefer these — they are the Excel source of truth.

---

## 7. Module API (suggested)

```ts
export interface CriterionBreakdown {
  id: number;                 // 1..10
  name: string;               // e.g. "Price"
  rating: number;             // product-specific weight from §3
  lowerIsBetter: boolean;     // true only for Price
  rawByTeam: number[];        // raw input values (0 for inactive)
  mu: number;
  sigma: number;
  scoreByTeam: number[];      // normCdf outputs in [0,1]
  weightedByTeam: number[];   // rating × score
}

export interface ProductMarketShareResult {
  productId: 'techbook' | 'zroid' | 'itab';
  period: number;
  activeByTeam: boolean[];
  activeCount: number;
  criteria: CriterionBreakdown[];   // all 10, in order
  totalScoreByTeam: number[];
  marketShareByTeam: number[];      // sums to 1 (or all 0)
  marketDemand: number;
  demandUnitsByTeam: number[];      // share × demand
  unitsSoldByTeam: number[];        // min(demand units, available)
  availableByTeam: number[];
}

export function computeMarketShareBackModel(
  allTeamsDecisions: TurnDecisions[],
  allTeamsState: TeamState[],
  config: { numberOfTeams: number; period: number; ratings: DriverTable; demand: DemandSchedule; sigmaMultipliers?: number[] }
): ProductMarketShareResult[];
```

Pure function, no side effects, unit-testable.

---

## 8. Facilitator UI Requirements

Add a **"Market Model (Actual)"** panel to the Facilitator Dashboard (visible only when role = facilitator):

1. **Product tabs**: TechBook / Zroid / iTab.
2. Per product, a table mirroring the Excel layout, teams as columns:
   - Row group per criterion: raw input row, then μ, σ, and the score row (formatted 0.000).
   - A "Score" summary table: rating column + weighted contribution per team per criterion (mirrors Excel rows 41–50).
   - **Total Scores** row and **Market Share** row (percentage, 1 decimal).
   - Demand, share × demand, availability cap, and final units sold rows.
3. Highlight per-criterion winner per row; show inactive teams greyed out.
4. Everything computed live from currently submitted decisions; recompute on any facilitator parameter tweak.
5. No element of this panel, route, or data payload may be reachable from the student role.

---

## 9. Acceptance Tests

1. **Two identical teams**: with 2 active teams making identical decisions, every σ > 0 criterion gives both a score of 0.5 and market share = 50/50.
2. **Single active team**: σ = 0 → σ forced to 1 → each nonzero criterion scores `normCdf(x, x, 1) = 0.5` (Price: 0.5); market share = 100%.
3. **Price direction**: lowering one team's price (all else equal) strictly increases its share of TechBook more than of Zroid (rating 10 vs 5).
4. **Inactivity**: a team with `prodMS = 0` for iTab gets 0 iTab share, but its other products are unaffected; its zeros still influence competitors' σ (population stdev over all 10 slots) — assert this explicitly.
5. **Zero-sum**: shares per product sum to 1.0 (±1e-9) whenever activeCount ≥ 1.
6. **No teams active**: all shares 0, no NaN/Infinity.
7. **Units cap**: units sold never exceed opening stock + production + FG purchases.
8. **Student view regression**: snapshot tests confirming participant-mode outputs are byte-identical before/after this change.

---

## 10. Source-of-truth references (Excel cells, for auditing)

- Active flags: `backModel!H8:R8` (Prod1), `H58:R58` (Prod2), `H108:R108` (Prod3)
- Criterion raw rows: Prod1 rows 9–36, Prod2 rows 59–86, Prod3 rows 109–136 (pattern: raw row, then σ in col G, μ in col R, score row beneath)
- Score/weighting blocks: rows 41–53 (Prod1), 91–103 (Prod2), 141–153 (Prod3)
- Final shares: `mCalcProd1MS = backModel!H53:Q53`, `mCalcProd2MS = H103:Q103`, `mCalcProd3MS = H153:Q153`
- Driver ratings: `backTables!F79:I88` (`tlsDriver1`, anchored at F79)
- Units sold: `backCalculations!G3:Q5` (`calcProd{N}Units`)
- Demand schedule: `backTables!D3:J5` (`tlsProd{N}Demand`)
