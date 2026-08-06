# TechTabs Debrief Presenter — Fix Brief v2

**For Antigravity.** Repo: `briansimelane/TechtabsOnlinev2`
Supersedes the relevant sections of `resources/TechTabs_Debrief_Presenter_Brief.md`.

---

## 0. The one rule that governs this entire brief

> **Every financial and unit figure on a debrief slide must be produced by the same code that produces the Industry Reports. Not a parallel calculation. Not a re-derivation. The same function.**

This is why Gross Profit, GP% and Operating Expenses don't tie back. Revenue was fixed by making it match; everything below it was not. Fix the architecture once (§1) and the individual slides stop drifting.

---

## 1. Root cause — three competing calculation engines

The codebase currently computes team financials in **three** places, and they disagree:

| # | Location | Basis | Used by |
|---|---|---|---|
| A | `pages/MarketReports.tsx` → `dynamicPerformanceData` / `getTeamIncome()` (~line 503) | `computeMarketShareBackModel` + `draftDecisions`; component cost from `SUPPLIER_METRICS`, direct labour amortised over produced units, other opex = 7.97% of the sum | **Industry Reports > Industry Performance** — the source of truth |
| B | `utils/SimulationEngine.ts` → `processTurn()` | S-curve share model, different COGS/labour split, different opex assembly | `team.history[period]` (committed years) |
| C | `hooks/useDebriefData.ts` (~lines 130–210) | A hand-rolled hybrid: back-model units × price for revenue, then a *reconstructed* per-unit COGS (`record.cogs.byProduct[p] / record.market.actualUnits[p]`) | The debrief slides |

Revenue happens to reconcile now because C multiplies back-model units by price, which is what A does. **Gross Profit does not, because C rebuilds COGS from B's numbers.** Opex doesn't either — the debrief reads `record.opex.*` from B, whose categories and amounts differ from A's.

### 1.1 Fix — extract one shared module

Create **`utils/industryPerformance.ts`**. Move `getTeamIncome`, `getTeamBalance` and the units breakdown out of `MarketReports.tsx` **verbatim** — same constants, same rounding, same 7.97% other-opex, same `laborCostPerUnit` fallback of 350, same `STORE_COSTS` / `SUPPLIER_METRICS` / `FINANCE_CONSTANTS` lookups. Do not "improve" any formula while moving it. If a number changes, the extraction is wrong.

```ts
export interface TeamIndustryPerformance {
  teamId: string;
  teamName: string;

  // Revenue & COGS
  revenueByProduct: Record<ProductId, number>;
  totalRevenue: number;
  cogsByProduct: Record<ProductId, number>;
  totalCogs: number;
  grossProfit: number;
  gpMargin: number;                    // % — grossProfit / totalRevenue * 100

  // Operating expenses — the exact seven Industry Performance rows
  opex: {
    marketing: number;                 // "Advertising & Marketing"
    store: number;                     // "Store Costs"
    payroll: number;                   // "Payroll (Salaries)"
    rd: number;                        // "R & D (Innovation)"
    agents: number;                    // "Agent Commissions"
    training: number;                  // "Staff Development (Training)"
    other: number;                     // "Other Operational Expenses"
    total: number;                     // "Total Operating Expenses"
  };

  ebitda: number;
  depreciation: number;
  financeCharges: number;
  ebt: number;
  taxation: number;
  netProfit: number;
  npMargin: number;                    // %
  equity: number;                      // from getTeamBalance
  roe: number;                         // %

  // Units — the Demand & Inventory Units Breakdown rows
  units: Record<ProductId, {
    marketSize: number;                // getMarketSize(pId, period)
    forecast: number;                  // "Demand Forecasted (Units)"
    demand: number;                    // "Demand Earned (Units)"
    available: number;                 // "Available Units (Stock)"
    actual: number;                    // "Actual Units Sold"
  }>;

  // Market Data
  totalScore: Record<ProductId, number>;   // "Total Scores" row
  marketShare: Record<ProductId, number>;  // "Market Share Earned" row, 0–1
  price: Record<ProductId, number>;

  // Staff — for Employee Utilisation
  staffCounts: Record<HRRole, number>;     // opening + hiring decision
  trainingLevels: Record<HRRole, TrainingLevel>;
  unitsProduced: number;                   // scaled production, all products
  unitsSold: number;                       // all products
}

export function computeIndustryPerformance(
  teams: Team[],
  period: number
): TeamIndustryPerformance[];
```

`computeMarketShareBackModel(teams, period)` is called **once** at the top and its result threaded through. Right now `MarketReports.tsx` calls it inside every table cell (see the Demand & Inventory rows, ~line 1552 onward) — that's hundreds of full recomputations per render. Fixing it here fixes that too.

### 1.2 Wire it up

1. **`MarketReports.tsx`** — replace `dynamicPerformanceData`'s inline logic with a call to `computeIndustryPerformance`. The rendered table must be **byte-identical** to what it shows today. Screenshot before and after and compare.
2. **`useDebriefData.ts`** — delete the entire live-preview enrichment block (lines ~130–210: `liveRevTB`, `cogsPerUnitTB`, `liveGPTotal`, the whole `record = {...record, revenue: …, grossProfit: …, market: …}` rewrite). Replace with:

```ts
const perf = computeIndustryPerformance(activeTeams, period);
// DebriefTeam.perf = perf.find(p => p.teamId === t.id)
```

3. **`DebriefTeam`** gains a `perf: TeamIndustryPerformance` field. **Every slide reads `team.perf`**, not `team.record`, for revenue, COGS, GP, GP%, opex, net profit, ROE, units and scores.

`team.record` stays for CSAT/ESAT only (`record.kpis.customerSatisfaction` / `.employeeSatisfaction`) — those come from the engine and have no Industry Report equivalent.

### 1.3 Historical years

`computeIndustryPerformance` reads `draftDecisions`, which are reset after a year runs. So it only works for the **current** period. For past years, snapshot it:

- In `contexts/SimulationContext.tsx` → `runClassSimulation`, **before** `draftDecisions` are reset to `INITIAL_DECISIONS`, call `computeIndustryPerformance(cls.teams, cls.currentPeriod)` once and write each team's result to `history[currentPeriod].industry`.
- Add `industry?: TeamIndustryPerformance` to `PeriodRecord` in `types.ts` (optional, so old classes still parse).
- `useDebriefData` resolution order: `history[period].industry` → else live `computeIndustryPerformance` for the current period → else `null` (slide shows its empty state).

This is what makes League Overall (§8) possible at all.

---

## 2. Gross Profit slide

**File:** `pages/debrief/slides/GrossProfitSlide.tsx`

- `value` = `team.perf.grossProfit` (Industry Performance row "Total Gross Profit (GP)").
- GP% = `team.perf.gpMargin` — computed inside `industryPerformance.ts`, not recomputed in the slide.
- Delete the local `const gp = t.record.grossProfit.total` and the second inline GP% calculation in the pills block. One source, read twice from the same object.
- Keep `startFromZero={false}` on the bar chart; keep the GP% pill row.

**Acceptance:** open Industry Reports > Industry Performance and the debrief GP slide side by side for the same class and year. Every team's GP and GP% match to the rand.

---

## 3. Plan vs Actual slide

**File:** `pages/debrief/slides/ProductPlanVsActualSlide.tsx`

Three bars per team, in this order, all in **units**, all from `team.perf.units[productId]`:

| Bar | Label | Source | Definition |
|---|---|---|---|
| 1 | **Plan (Forecast)** | `.forecast` | `(decisions.marketing.forecastedMarketShare[pId] / 100) × getMarketSize(pId, period)` — the "Demand Forecasted (Units)" row |
| 2 | **Demand** | `.demand` | `backModel.demandUnitsByTeam[i]` — the "Demand Earned (Units)" row |
| 3 | **Actual** | `.actual` | `backModel.unitsSoldByTeam[i]` — the "Actual Units Sold" row |

`forecastedMarketShare` is stored **0–100, not 0–1**. Divide by 100. Getting this wrong is a 100× error and it is the most likely reason the slide looks wrong today.

Other changes:
- Remove the `hasData` gate that keys off `record.market` — key it off `team.perf` being present instead.
- Keep the two gap callouts but move them into the chart as labelled brackets between bar 1→2 and bar 2→3 at `revealStep >= 2`, rather than as a text panel below.
- Footer: `Plan = forecast share × market size · Demand = share earned × market size · Actual = min(demand, available stock)`.

**Acceptance:** for every team and product, the three bars equal the corresponding rows in Market Data > Demand & Inventory Units Breakdown exactly.

---

## 4. Value vs Price — 2×2 matrix

**File:** `pages/debrief/slides/ProductValuePriceSlide.tsx` — rewrite.

### 4.1 Axes

- **X = Price**, from `team.perf.price[productId]`. Cheapest left, most expensive right.
- **Y = Value**, from `team.perf.totalScore[productId]` — the **"Total Scores"** row in Market Data > `{Product}` criteria table (`backModel.totalScoreByTeam[i]`). Lowest bottom, highest top.

**This overrides the earlier `VALUE_AXIS_EXCLUDES_PRICE` recommendation.** Delete that constant and the ex-price path. Brian wants the Total Score as students see it in the report. The quadrant framing (average at centre) handles the price-correlation concern without needing a separate metric.

### 4.2 Quadrants

Divide at the **class averages**, not at fixed values:

```ts
const avgPrice = mean(points.map(p => p.price));
const avgValue = mean(points.map(p => p.value));
```

Draw a solid crosshair (`ReferenceLine x={avgPrice}` and `y={avgValue}`, `stroke="#94A3B8"`, `strokeWidth={2}`) and tint the four quadrants faintly (≤6% opacity). Label each corner:

```
        ▲ Value (Total Score)
  ┌──────────────┬──────────────┐
  │  VALUE       │  PREMIUM     │
  │  LEADER      │  POSITION    │   high value
  │  low price   │  high price  │
  ├──────────────┼──────────────┤ ── avg value
  │  BUDGET      │  OVER-       │
  │  PLAY        │  PRICED      │   low value
  │  low price   │  high price  │
  └──────────────┴──────────────┘
                 │
              avg price          ▶ Price
```

Quadrant labels sit in the corners at ~22px, `#94A3B8`, uppercase, behind the bubbles.

### 4.3 Normalisation — spread the bubbles

Real prices cluster (e.g. R2,400–R2,700) and Total Scores cluster (e.g. 4.1–4.8), so on raw axes every bubble lands in a blob at the centre. Normalise each axis to a **±1 spread around its mean**, then set the domain to `[-1.15, 1.15]`:

```ts
const norm = (v: number, values: number[]) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const maxDev = Math.max(...values.map(x => Math.abs(x - mean)));
  return maxDev === 0 ? 0 : (v - mean) / maxDev;   // -1 … +1, mean at 0
};
```

The crosshair then sits at `x=0, y=0` and the extreme team touches the edge of its quadrant. Axis ticks show the **real** values, not the normalised ones — map ticks back through the inverse, or hide the numeric ticks entirely and label the axis ends `Lower price` / `Higher price` and `Lower value` / `Higher value`. Prefer the second: the room reads position, not coordinates.

Tooltip and the bubble label still carry the real price and real score.

### 4.4 Bubbles

- Radius from `team.perf.units[productId].actual` via `ZAxis range={[400, 2400]}`.
- Fill `TEAM_COLORS[colorIndex]`, `stroke="#FFFFFF"`, `strokeWidth={3}`, `fillOpacity={0.85}`.
- **Team number inside the bubble**, white, bold, ~28px, centred — use a custom `<Scatter shape={…}>` renderer drawing `<circle>` + `<text>`, since recharts `LabelList` won't centre reliably on a scatter.
- Team number = the digits in `team.id` (the `(N)` prefix already parsed in `useDebriefData`).
- If two bubbles overlap within ~2% of the plot width, nudge the later one by 12px on X. Simple pass, no force layout.

Delete the least-squares "Fair Value Trend" line and the Above/Below-line commentary strip — the quadrants replace them.

---

## 5. Operating Expenses

**File:** `pages/debrief/slides/OpexSlide.tsx`

Read `team.perf.opex` and stack **all seven** Industry Performance categories, in the report's own row order (bottom to top):

1. Advertising & Marketing
2. Store Costs
3. Payroll (Salaries)
4. R & D (Innovation)
5. Agent Commissions
6. Staff Development (Training)
7. Other Operational Expenses

Delete the current `t.record.opex` read. Show **Total Operating Expenses** as a value label above each stacked bar (`team.perf.opex.total`). Keep the legend; keep the fixed stack order so bands line up across teams.

**Acceptance:** each team's stack segments and total match the seven Operating Expenses rows and the "Total Operating Expenses" row in Industry Performance.

---

## 6. Employee Utilisation (replaces Customer Service)

**File:** rename `CustomerServiceSlide.tsx` → `EmployeeUtilisationSlide.tsx`; update `utils/debriefSlides.tsx` (slide id `customer-service` → `employee-utilisation`).

### 6.1 Formula

For each role, capacity is headcount × base productivity × training uplift:

```ts
capacity(role) = staffCounts[role]
               × EMPLOYEE_PRODUCTIVITY[role].base_units_per_employee
               × (1 + TRAINING_PROGRAMS[trainingLevels[role]].productivity_effect)
```

Constants already exist in `resources/config.json` → `employee_productivity` (Engineers 3420, Technicians 2422.5, Semi-Skilled 1870, Admin & Sales 1840, Customer Service 570) and `training_programs` → `productivity_effect`. Read them from `CONFIG`, exactly as `SimulationEngine.ts` line 118 does — **do not hard-code these numbers into the slide.**

Then:

| Role group | Roles | Utilisation numerator |
|---|---|---|
| **Production** | Technicians, Semi-Skilled | `team.perf.unitsProduced` (scaled production, all three products) |
| **Non-production** | Engineers, Admin & Sales, Customer Service | `team.perf.unitsSold` (actual units sold, all three products) |

```ts
utilisation(role) = numerator(role) / capacity(role)   // 1.0 = fully utilised
```

Note the production roles share one numerator against their **combined** capacity — a technician and a semi-skilled worker both build the same units. Compute `productionUtilisation = unitsProduced / (capacity(technicians) + capacity(semiSkilled))` and show it once for the pair, rather than double-counting the same output against each role.

That gives four series per team: Production (combined), Engineers, Admin & Sales, Customer Service.

### 6.2 Presentation

- Grouped bar chart, X = teams, four bars per team, Y = utilisation %.
- `ReferenceLine y={100}` labelled "Full utilisation".
- Colour by band, not by role: under 80% `#94A3B8` (idle), 80–110% `#059669` (healthy), over 110% `#E11D48` (over-stretched). The teaching point is the band, and a legend of four role colours doesn't carry it.
- Small role legend below using neutral swatches with the role names.
- Footer: `Production staff measured against units produced · Support staff against units sold · Capacity = headcount × base output × training uplift`.

---

## 7. Customer Satisfaction & Employee Satisfaction

**Files:** `CustomerSatisfactionSlide.tsx`, `EmployeeSatisfactionSlide.tsx`

### 7.1 Why they're blank

Both wrap their content in `<div className="space-y-4">`. `TeamBarChart`'s root is `w-full h-full flex-1 min-h-0` and its `<ResponsiveContainer height="100%">` resolves against that. With an auto-height, non-flex parent, `h-full` computes to 0 → the container gets zero height → nothing renders.

Every working slide uses `<div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between space-y-3">`. Use that wrapper on both slides. Also drop the `height={600}` prop — it's ignored once `ResponsiveContainer` is at `height="100%"`, and leaving it in invites the same confusion later.

### 7.2 Content

- Bar per team, `(record.kpis.customerSatisfaction ?? 0.70) × 100`, Y domain `[0, 100]`, one decimal.
- **Remove the footer commentary entirely** — both the `footer` prop text about the ±7% / ±5% engine caps and, on CSAT, the delta-chip grid if it doesn't fit cleanly. Pass `footer=""` so `SlideFrame` falls back to the neutral default, or extend `SlideFrame` to omit the footer line when `footer` is an empty string.
- Keep the prior-year delta chips **only** if the chart still fills the slide; if the layout is tight, drop them. The bar chart is the slide.

Same treatment on both files.

---

## 8. League — Current Year

**File:** `pages/debrief/slides/LeagueCurrentSlide.tsx` — rewrite the table body.

### 8.1 Bugs to fix

1. **Header overlaps content.** The outer `<div className="w-full bg-white … space-y-3">` has no height constraint inside `SlideFrame`'s `flex-1 min-h-0 overflow-hidden` content area. Give it `h-full flex flex-col min-h-0`, make the header row `shrink-0`, and put the rows in a `flex-1 min-h-0` container.
2. **8th team is cut off.** Same cause. With the flex fix, size rows to fit: `rowHeight = availableHeight / nTeams`, or simply let the rows container flex and set row padding from `nTeams` (`p-3.5` for ≤6 teams, `p-2` for 7–8, `p-1.5` above that). No scrollbar on a projected slide — everything must fit.
3. **Animation doesn't run.** `isVisible = revealStep === 0 || revealStep >= rowRankFromBottom` shows every row at step 0. Drop the `revealStep === 0` clause:

```ts
const rankFromBottom = totalRows - idx;      // last place = 1
const isVisible = revealStep >= rankFromBottom;
```

Last place appears first, the winner lands last. `maxRevealSteps` is already `dataset.teams.length` in `debriefSlides.tsx` — correct, leave it.

### 8.2 Score column

- Show **just the number**. Remove the progress bar, the `/ maxScore`, and the `maxScore` reference from the footer.
- Render it large: ~44px, `IBM Plex Mono`, `font-extrabold`, `tabular-nums`, right-aligned.

### 8.3 KPI cell layout — value on top, points below

Replace the `value + superscript` treatment in the GP%, NP% and ROE columns with a stacked cell:

```
   18.4%          ← value: 30px, mono, bold, slate-900
     6            ← points: 20px, mono, bold, muted colour
```

Centre both lines in the cell. Keep the existing per-metric accent colours on the points line (GP blue, NP emerald, ROE violet). Column header stays a single word: `GP %`, `NP %`, `ROE`, `SCORE`.

Widen the ROE column — it's `col-span-1` today against `col-span-2` for GP and NP, which is what makes the header crowd. Suggested 12-column split: Rank 1 · Team 3 · GP% 2 · NP% 2 · ROE 2 · Score 2.

### 8.4 Data source

Feed `scoreYear` from `team.perf` (`gpMargin`, `npMargin`, `roe`), not from `metricsFromRecord(t.record)`. Add an overload to `utils/leagueScoring.ts`:

```ts
export function scoreYearFromPerformance(
  perf: TeamIndustryPerformance[],
  year: number
): TeamYearScore[];
```

Ranking rules stay exactly as they are: rank ascending on each metric so 1 = worst and nTeams = best, three metrics summed.

---

## 9. League — Overall (cumulative)

**File:** `pages/debrief/slides/LeagueOverallSlide.tsx` — replace the stacked bar chart with a **table** matching slide 27's styling.

### 9.1 Layout

| Rank | Team | Year 1 | Year 2 | Year 3 | Total |
|---|---|---|---|---|---|
| 1 | (3) Team Name | 18 | 21 | 22 | **61** |
| 2 | (1) Team Name | 20 | 19 | 16 | **55** |
| 3 | (5) Team Name | 14 | 17 | — | **31** |

- Year columns are generated for **all configured simulation years** (5 in TechTabs, per the `gameState.currentRound >= 5` guard), not just years played. Render a column for each.
- **A year not yet played shows blank** — empty string, not `0`, not `—`. Nothing.
- **Total** = sum of the years that do exist. Bold, largest figure in the row.
- **Rank by Total, descending.** Ties keep the existing stable-sort behaviour.
- Same row styling, same team colour chip, same medal treatment on the top three, same reveal animation (last place first) as slide 27. The two league slides should look like the same table with different columns.

### 9.2 Data

The current implementation builds history from `record` + `prior` only — a maximum of two years, so a Year-3 debrief silently loses Year 1. Fix:

- `DebriefTeam` gains `fullHistory: Record<number, PeriodRecord>` — the whole `team.history` object, not two entries.
- `scoreCumulative` reads `fullHistory[yr].industry` (the §1.3 snapshot) via `scoreYearFromPerformance` where available, falling back to `metricsFromRecord(fullHistory[yr])` for years recorded before the snapshot existed.
- A year is "played" if at least one team has a record for it. Years with no records get a blank column.

Keep `maxRevealSteps` in sync: set it to `dataset.teams.length` so the row-by-row reveal works like slide 27.

---

## 10. Build order

| Phase | Work | Verify by |
|---|---|---|
| **1** | `utils/industryPerformance.ts` — verbatim extraction; single back-model call | `MarketReports.tsx` refactored to use it renders identical output |
| **2** | `PeriodRecord.industry` + snapshot in `runClassSimulation` | Run a year; `history[n].industry` is populated |
| **3** | `useDebriefData` — delete the hybrid block, expose `perf` and `fullHistory` | Debrief loads with no console errors |
| **4** | Gross Profit (§2), Opex (§5) | Both tie to Industry Performance to the rand |
| **5** | Plan vs Actual (§3) | Ties to Demand & Inventory Units Breakdown |
| **6** | Value vs Price 2×2 (§4) | Bubbles spread across all four quadrants on real class data |
| **7** | Employee Utilisation (§6) | Replaces Customer Service in the deck |
| **8** | CSAT / ESAT layout fix (§7) | Charts render; no commentary |
| **9** | League Current (§8), League Overall (§9) | 8 teams all visible; reveal runs bottom-up |

---

## 11. Acceptance criteria

1. For any class and year, every rand figure on the debrief matches Industry Reports > Industry Performance exactly: total revenue, revenue by product, COGS, **gross profit**, **GP%**, each of the seven opex lines, total opex, net profit.
2. Plan vs Actual's three bars equal Demand Forecasted, Demand Earned and Actual Units Sold from Market Data, per team, per product.
3. Value vs Price shows four labelled quadrants split at the class average price and average Total Score, with bubbles distributed across them rather than clustered at the centre. Each bubble carries its team number.
4. Employee Utilisation shows production staff against units produced and support staff against units sold, using the productivity constants from `config.json`.
5. CSAT and ESAT charts render at full slide height with no commentary text.
6. League Current: all teams visible with no clipping at 8 teams, header clear of the rows, reveal runs last place → first, score shown as a bare number, each KPI stacked value-over-points.
7. League Overall: table with one column per simulation year plus Total, ranked by Total, unplayed years blank.
8. `computeMarketShareBackModel` is called once per render pass, not once per table cell — Market Reports should feel noticeably faster.
9. No new dependencies in `package.json` or the `index.html` importmap.

---

## 12. Note for Brian

One thing worth deciding before Antigravity starts: Industry Performance is a **live forecast** built from teams' current draft decisions, not a record of a completed year. That's fine while you're debriefing the year that just closed — the decisions are still sitting there. But the moment you advance the class to the next year, those decisions reset and the previous year's Industry Performance can no longer be reproduced.

§1.3 handles this by snapshotting the figures into `history[period].industry` as the year runs. Until that ships, **debrief a year before advancing the class**, or the older years in League Overall will fall back to the engine's numbers and won't tie to what the class saw on screen.
