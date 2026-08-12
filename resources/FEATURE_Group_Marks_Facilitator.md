# FEATURE SPEC — Group Marks Calculation (Facilitator Only)

**Target repo:** `briansimelane/TechtabsOnlinev2` (branch `main`)
**Source of truth:** `ADMP2503_ALP_Blk_3_Yr1_Marks.xlsx`, sheets `GROUP MARKS Calculation`, `Supplier Evaluation for Quality`, `Individual Group Report`
**Author of spec:** reverse-engineered from the workbook; all formulas below have been re-implemented and verified to reproduce the workbook's cached values exactly (see §11 Golden Fixture).

---

## 0. SCOPE GUARD — READ FIRST

This is an **additive, facilitator-only** feature. Before writing any code, internalise these constraints:

1. **The student-facing experience is immutable.** No student page, component, route, nav item, decision form, report, or piece of copy may change in any way. If a change you are about to make is visible to a user whose `currentRole === 'STUDENT'`, stop and re-plan.
2. **The simulation engine is immutable.** Do **not** modify `utils/SimulationEngine.ts`, `processTurn`, or any KPI/financial calculation. This feature is a *read-only consumer* of `Team.history` and `Team.draftDecisions`. It never writes team state.
3. **No new Firestore listeners.** Consume the existing `useSimulation()` context. Do **not** add `onSnapshot`, `getDoc`, `getDocs`, or any direct Firestore read. The only write is the marks config, persisted through a new context method that reuses the existing `persistClass` path.
4. **Exactly six integration touchpoints are permitted** (§9). Everything else lives in new files. If you find yourself editing a seventh file, stop.
5. **Do not "improve" the marking algorithm.** Where the workbook does something unusual (§5.3, §6.4), replicate it and flag it. Deviations are called out explicitly below and are the *only* permitted deviations.

---

## 1. WHAT THIS FEATURE DOES

Adds a **Group Marks** page to the Facilitator portal that:

- Reads every active team's simulation results for the selected class.
- Ranks teams across **9 KPIs**, converts ranks into marks, and adds a **base mark** driven by 5 pass/fail hurdles.
- Lets the facilitator configure: **base mark pass/fail values**, the **Customer Satisfaction hurdle**, the **Employee Satisfaction hurdle**, the **active team count** (Excel `O31`), the **additional-marks scale**, and a **per-team class adjustment**.
- Displays the full working (values, ranks, per-criterion marks, totals) in one consolidated table.
- Exports a **per-team PDF** mirroring the workbook's `Individual Group Report` sheet, plus a batch "all teams" export and an XLSX export.

**Route:** `/facilitator/marks` — `FACILITATOR` role only.

---

## 2. THE ALGORITHM (authoritative)

### 2.1 Overview

```
TOTAL GROUP MARK (per team)
  = Total Base Mark          (5 pass/fail criteria × pass|fail value)
  + Total Additional Marks   (9 ranked KPIs → ROUNDDOWN(scale × rank / divisor))
  + Class Adjustment         (facilitator-entered, per team)
```

Excel provenance: `'GROUP MARKS Calculation'!D44 = D30 + D42 + D43` (columns D..H = teams 1..5).

### 2.2 The 9 ranked KPIs

Excel rows 10–18; ranks in rows L10:P18; additional marks in rows 33–41.

| # | Criterion | Excel row | App source (`h` = `team.history[P]`, `P` = latest completed period) |
|---|---|---|---|
| 1 | Gross Profit (%) | 10 | `h.grossProfit.total / h.revenue.total` |
| 2 | Net Profit (%) | 11 | `h.netProfit / h.revenue.total` |
| 3 | ROE | 12 | `h.netProfit / h.balanceSheet.equity` |
| 4 | Customer Satisfaction | 13 | `h.kpis.customerSatisfaction` (0–1) |
| 5 | Employee Satisfaction | 14 | `h.kpis.employeeSatisfaction` (0–1) |
| 6 | Acc. Revenue | 15 (`=D53`) | `Σ_{p=1..P} history[p].revenue.total` |
| 7 | Acc. Product Innovation | 16 (`=D59`) | `Σ_{p=1..P} history[p].opex.rd` |
| 8 | Total Production Capacity | 17 (`=D66`) | `team.factoryCapacity − INITIAL_FACTORY_CAPACITY` |
| 9 | Quality | 18 | supplier-spend-weighted quality — see §5 |

Two further rows are read but **not ranked** — they feed base marks only:

| Criterion | Excel row | App source |
|---|---|---|
| Bank Balance | 19 | `h.balanceSheet.cash` |
| Missed Sales | 20 | `Σ_products max(0, h.market.demandUnits[p] − h.market.actualUnits[p])` |

**Guards.** Division by zero returns `0` and sets a `flag` on that cell (rendered as a warning icon, see §7.4):
- `revenue.total === 0` → GP% = 0, NP% = 0, flagged.
- `balanceSheet.equity === 0` → ROE = 0, flagged. Negative equity is **not** flagged; compute the (negative) ratio normally.
- `h.market` undefined → Missed Sales = 0, flagged.

**Note on capacity (row 8).** The workbook's value is the *sum of capacity changes* (`startFindecCapacity`), not absolute capacity — e.g. team 1 shows `10000`, not `50000`. `PeriodRecord` does not persist `capacityChange`, but `team.factoryCapacity` is the running total seeded at `INITIAL_FACTORY_CAPACITY = 40000` and incremented by `capacityChange` each turn (`SimulationEngine.ts:461`), so `factoryCapacity − 40000 ≡ Σ capacityChange`. Display the difference (Excel-faithful). Ranks are identical either way, since every team starts from the same base — record this in a code comment so a future reader doesn't "fix" it.

### 2.3 Ranking — ascending, ties share the lower rank

Excel: `=RANK(D10,$D10:$H10,1)`. Order argument `1` means **ascending**, so the *lowest* value gets rank 1 and the *best* performer gets rank *N*. Higher rank = more marks. This is a points system, not a placings system — do not invert it.

Excel's `RANK` gives tied values the same (lower) rank and then skips. Implement exactly:

```ts
export function rankAscending(value: number, values: number[]): number {
  return 1 + values.filter(v => v < value).length;
}
```

Worked check against the workbook (Acc. Product Innovation, row 16): values `[15055857, 15055857, 35000000, 26000000, 20000000]` → ranks `[1, 1, 5, 4, 3]`. Matches `L16:P16`.

> **Deviation (intentional).** The workbook hard-codes rank ranges to `$D:$H` (5 teams) while the reference "TechTabs Ltd" column `I` uses `$D:$I`, producing `#N/A` throughout column I. This is a spreadsheet artefact. Rank over the **actual set of scored teams** (§3), consistently, for every KPI.

### 2.4 Additional marks

Excel `R31` (the divisor): `=(O31*9)+9` where `O31` = "Active class team" = number of teams.

```
divisor          = (activeTeamCount × 9) + 9
additionalMark_k = ROUNDDOWN(scale × rank_k / divisor, 0)      // scale = 50 by default
totalAdditional  = Σ_{k=1..9} additionalMark_k
```

`ROUNDDOWN(x, 0)` truncates toward zero. All inputs are non-negative, so `Math.floor` is correct — but use `Math.trunc` to be safe if a negative ever appears.

**Rounding happens per criterion, then sums.** Do not sum ranks and round once. With 5 teams the ceiling per criterion is `floor(50 × 5 / 54) = 4`, so max additional = 36, not 41.

The `9` in the divisor is the KPI count; the `+9` is a deliberate one-team headroom allowance by the assessment designer. Implement it literally as `(activeTeamCount * 9) + 9` and comment the derivation.

### 2.5 Base marks

Excel rows 25–29, e.g. `D25 = IF(L25="Yes",10,7)`, `L25 = IF(D11>0,"Yes","No")`.

| # | Criterion | Excel | Pass condition |
|---|---|---|---|
| 1 | Has positive NP% | L25 | `netProfitPct > 0` |
| 2 | Has positive Cash | L26 | `bankBalance > 0` |
| 3 | No Missed Sales | L27 | `!(missedSales > 0)` |
| 4 | Customer Satisfaction ≥ hurdle | L28 | `csat >= csatHurdle` |
| 5 | Employee Satisfaction ≥ hurdle | L29 | `esat >= esatHurdle` |

Each yields `config.baseMarkPass` (default **10**) or `config.baseMarkFail` (default **7**). `Total Base Mark = Σ` (Excel `D30`).

Note the asymmetry, and preserve it: criteria 1–3 use **strict** `>`; criteria 4–5 use **`>=`**. Criterion 3 is expressed as `IF(x>0,"No","Yes")`, so a missed-sales value of exactly `0` **passes**, and a negative value would also pass.

The row labels are dynamic in the report, so build them from config:
`Customer Satisfaction >${(csatHurdle*100).toFixed(0)}%`, and the section header
`Base Mark: (${baseMarkPass}% if Ok, ${baseMarkFail}% if not)`.

### 2.6 Class adjustment

Excel row 43, a free-typed number per team (`6` for all teams in the sample, `7` for the reference team). Facilitator-entered, may be negative, may be zero. Stored per team in the class doc.

---

## 3. WHICH TEAMS ARE SCORED

Scored set = `currentClass.teams.filter(t => !t.isArchived && !t.isComputer)`.

- **Archived teams** are excluded entirely (not ranked, not shown, not exported).
- **Computer teams** (`isComputer === true`) are excluded. This mirrors column `I` in the workbook, which holds the "TechTabs Ltd" reference company and is deliberately excluded from the `$D:$H` rank ranges.
- Teams with **no completed period** (`!history || no key ≥ 1`) are shown in the table as "No results yet", excluded from ranking, and excluded from the divisor's auto count.

**Active team count (Excel `O31`).** Defaults to `scoredTeams.length`. The facilitator may override it via `config.activeTeamCountOverride` (a nullable integer, min 1, max 20). When overridden, the override is used **for the divisor only** — ranking still happens across the real scored set. Show a subtle "overridden" badge next to the divisor readout when this is in effect.

**Scoring period.** `P = max(numeric keys of team.history where key >= 1)`, computed **per team**, then reconciled: if teams disagree, use `min(P_i)` across scored teams as the class scoring period so every team is compared on the same year, and surface a warning banner naming the lagging teams. Expose `P` in the header as "Scoring as at Period {P}".

---

## 4. ACCUMULATED VS POINT-IN-TIME

The workbook labels rows 15–17 "Acc." / "Total" and leaves rows 10–14 and 19–20 unlabelled. Sample data covers Year 1 only, so both readings coincide there. For multi-year runs, honour the labels:

- **Cumulative** (sum over `p = 1..P`): Acc. Revenue, Acc. Product Innovation, Total Production Capacity.
- **Point-in-time** (period `P` only): GP%, NP%, ROE, CSAT, ESAT, Bank Balance, Quality.
- **Missed Sales**: controlled by `config.missedSalesBasis`, default `'latest'` (point-in-time, Excel-faithful). `'cumulative'` sums shortfalls across `p = 1..P`. Expose as a small select in the settings panel labelled "Missed sales basis".

Period `0` (`YEAR_0_RECORD`) is the opening balance sheet and is **never** included in any accumulation.

---

## 5. QUALITY — THE SUPPLIER EVALUATION SUB-ENGINE

> Brian flagged this specifically. Read this whole section before implementing.

### 5.1 What it is

Quality is a **procurement-spend-weighted average of supplier quality ratings**. A team that buys mostly from Alpha (quality 10) scores near 10; a team that buys mostly from Neepo (quality 5) scores near 5.

Excel `'Supplier Evaluation for Quality'!E175`:

```
Quality = (AlphaValue/Total)×AlphaQuality
        + (NeepoValue/Total)×NeepoQuality
        + (ZenValue/Total)×ZenQuality
        + (ChengValue/Total)×ChengQuality
```

where `Total = SUM(E164:E167)` (row 168), the four supplier "Values" are rows 164–167, and the four quality ratings are rows 170–173 (pulled from each supplier's per-team `...Quality` decision row: 37 / 63 / 89 / 115).

### 5.2 Supplier "Value" (the weight)

Excel `E164 = E44+E45+E47+E48+E50+E51+E53+E54+E56+E57+E59+E60`. Decoding the `startFindec` row labels, that is, for each of the three products:

```
componentVolume + componentPurchase + finishedGoodsVolume + finishedGoodsPurchase
```

### 5.3 ⚠️ Quirk 1 — the weight mixes units and currency

The formula adds raw **unit counts** to **currency amounts**. `componentVolume` (e.g. `10200` units) is summed alongside `componentPurchase` (e.g. `R12,240,000`). Dimensionally this is meaningless, but it is what the workbook does, and the unit terms are ~0.06% of the magnitude so they barely move the result.

**Replicate it.** Guard it behind a named module constant so it is self-documenting and reversible:

```ts
/**
 * Excel 'Supplier Evaluation for Quality'!E164 sums unit volumes together with
 * purchase values (e.g. E44 componentVolume + E45 componentPurchase). This mixes
 * dimensions, but it is the workbook's behaviour and the unit terms contribute
 * <0.1% of the weight. Set false to weight on purchase value alone.
 */
const INCLUDE_RAW_UNIT_TERMS = true;
```

### 5.4 ⚠️ Quirk 2 — an off-by-one copy-paste bug in the Zen row (row 166)

This is a **real bug in the source workbook** and it materially understates Zen's weight.

Supplier blocks are laid out identically, offset 26 rows apart (Alpha 35, Neepo 61, Zen 87, Cheng 113). Within each block, `Prod1RM` sits at `base+8`, `Prod1CompVolume` at `base+9`, `Prod1CompPurchase` at `base+10`.

| Supplier | Excel formula, first pair | Rows referenced | Correct? |
|---|---|---|---|
| Alpha (164) | `E44+E45` | CompVolume + CompPurchase | ✅ |
| Neepo (165) | `E70+E71` | CompVolume + CompPurchase | ✅ |
| **Zen (166)** | **`E95+E96`** | **Prod1RM + CompVolume** | ❌ |
| Cheng (167) | `E122+E123` | CompVolume + CompPurchase | ✅ |

Row 166 references `E95` (`startFindecSupplier3Prod1RM`, a *unit price*, e.g. `1200`) and **omits `E97`** (`startFindecSupplier3Prod1CompPurchase`, e.g. `12,240,000`). Every other pair in row 166 is correct — only the first is shifted up by one.

**Proof:** team 4 ("The Exchange", column G) bought nothing from Zen, yet `G166 = 1200` — exactly the Zen techbook raw-material unit price, and nothing else.

**Impact, measured:**

| Team | Workbook Quality | Quality with bug corrected | Δ |
|---|---|---|---|
| 1 Till the end of Charter | 7.741923 | 7.655482 | −0.086 |
| 2 The Vault | 7.422321 | 7.371420 | −0.051 |
| 3 CTRL + ALT + ELITE | 8.791382 | 8.791401 | +0.000 |
| 4 The Exchange | 7.892225 | 7.892033 | −0.000 |
| 5 Maverick Minds | 8.654978 | 8.654991 | +0.000 |

In this dataset the Quality *ranks* are unchanged, so marks are unaffected — but with a different procurement mix the bug could flip a rank and move a mark.

**Decision: implement the CORRECT formula.** Include `Prod1CompPurchase` for Zen exactly as for the other three suppliers. Add a module constant `REPLICATE_EXCEL_ZEN_BUG = false` with a comment pointing back to this section, so Brian can flip it to reconcile app output against the spreadsheet cell-for-cell if he ever needs to. Do **not** surface this constant in the facilitator UI.

*(A second, harmless copy-paste slip exists at `N171` — it reads `N89` (Zen quality) where the pattern requires `N63` (Neepo quality). Column N is unused padding for a non-existent team. No action needed; noted for completeness.)*

### 5.5 App implementation

Everything needed is already in `constants.ts` and matches the workbook exactly — verify this holds before relying on it:

```ts
SUPPLIERS = ['Alpha', 'Neepo', 'Zen', 'Cheng']
SUPPLIER_METRICS.Alpha.quality = 10.0   // Excel row 37
SUPPLIER_METRICS.Neepo.quality =  5.0   // Excel row 63
SUPPLIER_METRICS.Zen.quality   =  6.0   // Excel row 89
SUPPLIER_METRICS.Cheng.quality =  7.0   // Excel row 115
COMPONENT_COSTS.techbook       = { Alpha: 1560, Neepo: 1380, Zen: 1200, Cheng: 1160 }
FINISHED_GOODS_COSTS.techbook  = { Alpha: 1660, Neepo: 1480, Zen: 1300, Cheng: 1260 }
```

**Negotiated overrides must be honoured.** The workbook's per-team supplier rows reflect negotiation outcomes, not the base card — team 5 ("Maverick Minds") shows `I63 = 8` for Neepo quality against a base of 5, and `I69 = 1060` for Neepo techbook RM against a base of 1380. Resolve every input through `team.draftDecisions.supplierOverrides` first:

```ts
const ov = team.draftDecisions?.supplierOverrides;
const qualityOf = (s: string) =>
  ov?.quality?.[s] ?? SUPPLIER_METRICS[s].quality;
const compCostOf = (p: ProductId, s: string) =>
  ov?.componentCosts?.[p]?.[s] ?? COMPONENT_COSTS[p][s];
const fgCostOf = (p: ProductId, s: string) =>
  ov?.finishedGoodsCosts?.[p]?.[s] ?? FINISHED_GOODS_COSTS[p][s];
```

**Pseudocode:**

```ts
export interface SupplierQualityBreakdown {
  perSupplier: Record<string, {
    componentUnits: number; componentValue: number;
    finishedGoodsUnits: number; finishedGoodsValue: number;
    weight: number; weightShare: number;   // 0–1
    quality: number; contribution: number; // weightShare × quality
  }>;
  totalWeight: number;
  quality: number;      // 0–10
  flagged: boolean;     // true when totalWeight === 0
}

export function computeSupplierQuality(team: Team): SupplierQualityBreakdown {
  const alloc = team.draftDecisions?.procurement?.supplierAllocation;
  // No procurement data at all → quality 0, flagged. Excel would emit #DIV/0!.
  const per: Record<string, ...> = {};

  for (const s of SUPPLIERS) {
    let compUnits = 0, compValue = 0, fgUnits = 0, fgValue = 0;
    for (const p of PRODUCTS.map(x => x.id)) {
      const a = alloc?.[p]?.[s] ?? { components: 0, finishedGoods: 0 };
      compUnits += a.components;
      compValue += a.components   * compCostOf(p, s);
      fgUnits   += a.finishedGoods;
      fgValue   += a.finishedGoods * fgCostOf(p, s);
    }
    const weight = INCLUDE_RAW_UNIT_TERMS
      ? compUnits + compValue + fgUnits + fgValue   // Excel-faithful, §5.3
      : compValue + fgValue;
    per[s] = { componentUnits: compUnits, componentValue: compValue,
               finishedGoodsUnits: fgUnits, finishedGoodsValue: fgValue,
               weight, quality: qualityOf(s), weightShare: 0, contribution: 0 };
  }

  const totalWeight = SUPPLIERS.reduce((t, s) => t + per[s].weight, 0);
  if (totalWeight <= 0) return { perSupplier: per, totalWeight: 0, quality: 0, flagged: true };

  let quality = 0;
  for (const s of SUPPLIERS) {
    per[s].weightShare  = per[s].weight / totalWeight;
    per[s].contribution = per[s].weightShare * per[s].quality;
    quality += per[s].contribution;
  }
  return { perSupplier: per, totalWeight, quality, flagged: false };
}
```

### 5.6 Data-availability caveat (important)

`PeriodRecord` does **not** persist procurement decisions, so historical supplier allocations are unavailable. Quality is therefore computed from `team.draftDecisions.procurement.supplierAllocation` — the team's **current/most recent** allocation. This matches the workbook, which scores a single year using that year's `startFindec...` decisions, and is consistent with Quality being a point-in-time row (§4).

Render an informational note in the methodology panel:
> "Quality is calculated from each team's current procurement allocation and negotiated supplier terms. Historical per-period allocations are not retained by the simulation."

**Do not** modify `SimulationEngine.ts` or `PeriodRecord` to add a procurement snapshot as part of this feature. If per-period Quality history is wanted later, it is a separate, separately-scoped change.

---

## 6. DATA MODEL

### 6.1 New types — append to `types.ts` (additive only)

```ts
export type MissedSalesBasis = 'latest' | 'cumulative';

export interface MarksConfig {
  /** Mark awarded when a base-mark hurdle is met. Excel: the 10 in IF(...,10,7). */
  baseMarkPass: number;              // default 10
  /** Mark awarded when a base-mark hurdle is missed. Excel: the 7 in IF(...,10,7). */
  baseMarkFail: number;              // default 7
  /** Customer Satisfaction hurdle as a fraction 0–1. Excel L28: >=0.75 */
  csatHurdle: number;                // default 0.75
  /** Employee Satisfaction hurdle as a fraction 0–1. Excel L29: >=0.75 */
  esatHurdle: number;                // default 0.75
  /** Excel O31. null = auto (count of scored teams). Divisor = (n*9)+9 → R31. */
  activeTeamCountOverride: number | null;   // default null
  /** Excel: the 50 in ROUNDDOWN(50*L33,0). Advanced. */
  additionalMarksScale: number;      // default 50
  /** Excel row 43. teamId -> marks. Absent key = 0. */
  classAdjustments: Record<string, number>; // default {}
  missedSalesBasis: MissedSalesBasis;       // default 'latest'
  updatedAt?: string;
}
```

Add **one** optional field to the existing `SimulationClass` interface — do not reorder or alter any existing field:

```ts
export interface SimulationClass {
  // ... all existing fields unchanged ...
  marksConfig?: MarksConfig;
}
```

### 6.2 Defaults — in `utils/marksEngine.ts`

```ts
export const DEFAULT_MARKS_CONFIG: MarksConfig = {
  baseMarkPass: 10,
  baseMarkFail: 7,
  csatHurdle: 0.75,
  esatHurdle: 0.75,
  activeTeamCountOverride: null,
  additionalMarksScale: 50,
  classAdjustments: {},
  missedSalesBasis: 'latest',
};
```

Always read config as `{ ...DEFAULT_MARKS_CONFIG, ...(currentClass.marksConfig ?? {}) }` so classes saved before this feature shipped, and any future added key, degrade gracefully.

### 6.3 Persistence

Follow the exact pattern of `updateClassShowSurvey` in `contexts/SimulationContext.tsx` (~line 1380): optimistic `setState`, then `void persistClass(updatedClass).catch(...)`. No new Firestore primitives, no new collection, no new listener. The config lives on the class document.

Debounce numeric-input persistence at **600 ms** so typing in an adjustment field doesn't fire a write per keystroke. Persist immediately on blur and on select-change.

### 6.4 Constants — in `utils/marksEngine.ts`

```ts
/** Seed capacity every team starts with (SimulationContext resetClassToYear1 / team creation). */
export const INITIAL_FACTORY_CAPACITY = 40000;
/** §5.3 — Excel sums unit volumes with purchase values. */
const INCLUDE_RAW_UNIT_TERMS = true;
/** §5.4 — Excel row 166 off-by-one omits Zen Prod1CompPurchase. We implement it correctly. */
const REPLICATE_EXCEL_ZEN_BUG = false;
```

---

## 7. UI SPECIFICATION — `pages/facilitator/GroupMarks.tsx`

Match the visual language of the existing `pages/facilitator/DecisionTable.tsx`: Tailwind, `slate` palette, white cards with `border-slate-200 rounded-xl shadow-sm`, `lucide-react` icons, sticky first column on wide tables.

### 7.1 No-class-selected state

Reuse the class-picker empty state from `DecisionTable.tsx` verbatim (card grid of classes, `School` icon header, "Create Your First Class" fallback). Change only the heading to "Select a Class for Group Marks" and the subtitle.

### 7.2 Header bar

- Class name, class id chip, **"Scoring as at Period {P}"** badge.
- Right-aligned actions: `Export All PDFs`, `Export XLSX`, `Print`.
- Warning banner (amber) if teams are on different periods, naming the lagging teams.
- Warning banner (amber) if fewer than 2 scored teams — ranking is meaningless with one team; still render, still allow export.

### 7.3 Settings panel (collapsible, open by default)

A card titled **Marks Settings** with a `Settings2` icon, laid out as a responsive grid:

| Control | Type | Bounds | Help text |
|---|---|---|---|
| Base mark — hurdle met | number | 0–100, step 1 | "Awarded per criterion when the hurdle is met (Excel: 10)." |
| Base mark — hurdle missed | number | 0–100, step 1 | "Awarded per criterion when the hurdle is missed (Excel: 7)." |
| Customer Satisfaction hurdle | number, **% in the UI** | 0–100, step 0.5 | "Teams at or above this score earn the full base mark." |
| Employee Satisfaction hurdle | number, **% in the UI** | 0–100, step 0.5 | "Teams at or above this score earn the full base mark." |
| Active team count | number + "Auto" toggle | 1–20 | "Excel O31. Sets the rank divisor: (n × 9) + 9." |
| Additional marks scale | number (advanced) | 1–200 | "Excel: the 50 in ROUNDDOWN(50 × rank ÷ divisor)." |
| Missed sales basis | select | latest \| cumulative | "Whether missed sales are read from the scoring period only, or summed across all periods." |

**Store hurdles as fractions (0–1); display and edit as percentages.** Convert on read and write. Reject `NaN` and out-of-range input by reverting to the last valid value rather than persisting garbage.

Beneath the grid, a live readout strip:

> Rank divisor **54** = (5 × 9) + 9 · Max base mark **50** · Max additional marks **36** · Max before adjustment **86**

Compute `maxAdditional = 9 × Math.trunc(scale × activeTeamCount / divisor)`. Recompute live. Put an `Undo2` "Reset to Excel defaults" button at the card footer.

If `activeTeamCountOverride` is set, show an amber "Overridden — auto would be N" chip next to the divisor.

### 7.4 Main marks table

Rows = criteria, columns = teams. Sticky left label column; horizontal scroll on narrow viewports. Group into visually separated sections with subtle header rows, mirroring the workbook:

1. **Performance** — 9 KPI rows, each cell showing `value` with the rank as a small muted pill: `0.6007 · rank 2`. Then `Bank Balance` and `Missed Sales` rows (value only, no rank pill).
2. **Base Mark: ({pass}% if Ok, {fail}% if not)** — 5 rows. Each cell shows the mark, tinted `emerald` on pass and `amber` on fail, with a `Check`/`X` glyph. Then **Total Base Mark** (bold, `slate-100` row).
3. **Additional marks based on Rank** — 9 rows showing the awarded mark. Then **Total additional marks** (bold).
4. **Class Adjustments (if required)** — an editable `<input type="number">` per team, right-aligned, bordered so it reads as editable. Accepts negatives. Blank = 0.
5. **TOTAL GROUP MARKS** — bold, larger type, `blue-50` background, with a subtle bar or ring showing the mark relative to the max attainable.

Formatting rules:
- GP%, NP%, ROE, CSAT, ESAT → `formatPercent(value, 2)` from `utils/numberFormat`.
- Acc. Revenue, Bank Balance → `formatCurrency(value, 0)`.
- Acc. Product Innovation → `formatCurrency(value, 0)`.
- Capacity, Missed Sales → `formatNumber(value, 0)`.
- Quality → `value.toFixed(2)` out of 10.

Flagged cells (§2.2) render a small amber `AlertTriangle` with a `title` explaining the cause. Teams with no completed period render a full-height muted "No results yet" column and are omitted from ranking.

Add a per-team footer cell with a `FileText` **Report (PDF)** button.

### 7.5 Quality breakdown drawer

Because Quality is the least transparent input, add an expandable row (chevron on the Quality label) that reveals, per team, the supplier weighting table from §5.5:

| Supplier | Component units | Component value | FG units | FG value | Weight | Share | Quality | Contribution |

Footer row: total weight, share `100.00%`, and the resulting quality. If `flagged`, show "No procurement allocation recorded — quality defaults to 0."

### 7.6 Methodology panel (collapsible, closed by default)

A plain-language audit trail so the marks can be defended to a student. Must state:
- The three-part formula and the Excel cell for each part (`D30`, `D42`, `D43`, `D44`).
- The rank rule: ascending, ties share the lower rank, best = *N* (`RANK(...,1)`).
- The divisor derivation `(n × 9) + 9` (Excel `R31`, driven by `O31`).
- That rounding is per criterion (`ROUNDDOWN`), not on the total.
- The Quality method, the negotiated-override behaviour, and the §5.6 caveat.
- A short note that the source workbook contains an off-by-one in the Zen weighting which this implementation corrects (§5.4), with the measured impact.

---

## 8. PDF EXPORT — `utils/marksPdf.ts`

Mirrors the `Individual Group Report` sheet.

### 8.1 Libraries

`jspdf@^4.2.1` and `jspdf-autotable@^5.0.8` are **already in `package.json`** — do not add or change dependencies.

```ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
```

Vite resolves these from `node_modules`; the `index.html` import map is belt-and-braces for the esm.sh dev path. For consistency with the existing convention, add two entries to the import map (§9.5). If `jspdf-autotable` fails to resolve over esm.sh in the dev server, remove **only those two import-map entries** and rely on the bundler — do not restructure the import map or touch any other entry.

Import at module top level in `utils/marksPdf.ts` only, and load that module via `await import('../utils/marksPdf')` from the page handler so jsPDF stays out of the main bundle.

### 8.2 Per-team document

A4 portrait, 14 mm margins. Filename: `GroupMarks_{className}_{teamName}_P{period}.pdf`, non-alphanumerics replaced with `_`.

**Header block**
```
ASSIGNMENTS - In Class Business Simulation        (bold, 13pt)
{class.name}                                      (10pt, slate)
Group Number: {index}    Group Name: {team.name}  (10pt)
Scoring period: {P}      Generated: {DD MMM YYYY} (8pt, muted)
```
Excel provenance: `Individual Group Report` B2, B3, B5/C5, B7/C7.

**Table 1 — Criteria Reviewed** (Excel B9:D20) — columns `Criteria Reviewed | Value | Rank Score`, 11 rows: the 9 ranked KPIs then Bank Balance and Missed Sales with an empty Rank Score cell.

**Table 2 — MARK CALCULATION** (Excel B22:C29) — section title row `Base Mark: ({pass}% if Ok, {fail}% if not)`, then 5 criterion rows with the awarded mark, then a bold `Total Base Mark` row.

**Table 3 — Additional marks based on Rank** (Excel B31:C41) — 9 rows, then bold `Total additional marks`.

**Table 4 — Summary** — `Class Adjustments (if required)` then `TOTAL GROUP MARKS`, the latter bold, larger, with a light blue fill. Append `/ {maxAttainable}` in muted type beside the total.

**Appendix (page 2) — Quality calculation** — the §7.5 supplier breakdown table, plus a one-line method statement. Include by default; allow `{ includeQualityAppendix: false }` in the options object.

**Footer, every page** — `{class.name} · {team.name} · Page X of Y`, 8pt, muted.

Styling: `theme: 'grid'`, head fill `#1e293b` with white text, body font 9pt, alternate row fill `#f8fafc`, numeric columns right-aligned. Reuse `formatCurrency` / `formatPercent` / `formatNumber` from `utils/numberFormat` so the PDF and the on-screen table never disagree.

### 8.3 Batch export

`Export All PDFs` loops the scored teams and saves one file each, sequentially with a short yield between saves so the browser doesn't drop downloads. Show a progress indicator (`Generating 3 of 6…`) and disable the button while running. Do **not** add a zip dependency.

### 8.4 XLSX export

Reuse the `xlsx` import pattern already used in `DecisionTable.tsx`. One workbook, three sheets: `Marks Summary` (the full §7.4 grid, values not formulas), `Quality Breakdown`, `Settings` (the resolved `MarksConfig` plus the computed divisor). Filename `GroupMarks_{className}_P{period}.xlsx`.

---

## 9. INTEGRATION TOUCHPOINTS — EXACTLY SIX

### 9.1 `App.tsx` — one import, one route

```tsx
import GroupMarks from './pages/facilitator/GroupMarks';
```
```tsx
<Route path="/facilitator/marks" element={<ProtectedRoute allowedRoles={['FACILITATOR']}><GroupMarks /></ProtectedRoute>} />
```
Place immediately after the existing `/facilitator/decision-table` route. Change nothing else in this file.

### 9.2 `components/Sidebar.tsx` — one nav link

Inside the `{!isStudent && !isAdmin && (` facilitator block, in the **Management** group, immediately after the Decision Table `NavLink`:

```tsx
<NavLink to="/facilitator/marks" className={navItemClass} onClick={handleLinkClick} title={isCollapsed ? "Group Marks" : undefined}>
  <Award size={iconSize} />
  {!isCollapsed && <span>Group Marks</span>}
</NavLink>
```

Add `Award` to the existing `lucide-react` import. Do not touch the student or admin blocks.

### 9.3 `types.ts` — additive only

Add `MissedSalesBasis` and `MarksConfig` (§6.1); add `marksConfig?: MarksConfig;` to `SimulationClass`. No existing type is modified or reordered.

### 9.4 `contexts/SimulationContext.tsx` — one method

Add to `SimulationContextType`:
```ts
updateClassMarksConfig: (classId: string, config: MarksConfig) => Promise<void>;
```
Implement it modelled line-for-line on `updateClassShowSurvey`, add it to the provider's value object, and import `MarksConfig` from `../types`. Nothing else changes.

### 9.5 `index.html` — two import-map entries (optional, see §8.1)

```json
"jspdf": "https://esm.sh/jspdf@^4.2.1",
"jspdf-autotable": "https://esm.sh/jspdf-autotable@^5.0.8"
```

### 9.6 New files (no existing code affected)

- `utils/marksEngine.ts` — pure, dependency-free calculation module.
- `utils/marksPdf.ts` — PDF generation.
- `pages/facilitator/GroupMarks.tsx` — the page.

**`package.json` is not modified.** All required dependencies are already present.

---

## 10. MODULE API — `utils/marksEngine.ts`

Pure functions only. No React, no Firebase, no DOM. This is the unit-testable core.

```ts
export const MARK_KPIS = [
  { key: 'grossProfitPct',  label: 'Gross Profit (%)',        excelRow: 10, format: 'percent'  },
  { key: 'netProfitPct',    label: 'Net Profit (%)',          excelRow: 11, format: 'percent'  },
  { key: 'roe',             label: 'ROE',                     excelRow: 12, format: 'percent'  },
  { key: 'csat',            label: 'Customer Satisfaction',   excelRow: 13, format: 'percent'  },
  { key: 'esat',            label: 'Employee Satisfaction',   excelRow: 14, format: 'percent'  },
  { key: 'accRevenue',      label: 'Acc. Revenue',            excelRow: 15, format: 'currency' },
  { key: 'accInnovation',   label: 'Acc. Product Innovation', excelRow: 16, format: 'currency' },
  { key: 'capacity',        label: 'Total Production Capacity', excelRow: 17, format: 'number' },
  { key: 'quality',         label: 'Quality',                 excelRow: 18, format: 'decimal2' },
] as const;

export type MarkKpiKey = typeof MARK_KPIS[number]['key'];

export const BASE_CRITERIA = [
  { key: 'positiveNP',   label: 'Has positive NP%',   excelRow: 25 },
  { key: 'positiveCash', label: 'Has positive Cash',  excelRow: 26 },
  { key: 'noMissedSales',label: 'No Missed Sales',    excelRow: 27 },
  { key: 'csatHurdle',   label: 'Customer Satisfaction', excelRow: 28 }, // label suffixed at render
  { key: 'esatHurdle',   label: 'Employee Satisfaction', excelRow: 29 },
] as const;

export interface TeamMarksResult {
  teamId: string;
  teamName: string;
  groupNumber: number;              // 1-based position in the scored set
  hasResults: boolean;
  scoringPeriod: number | null;
  values: Record<MarkKpiKey, number>;
  flags:  Partial<Record<MarkKpiKey, string>>;   // key -> human-readable reason
  bankBalance: number;
  missedSales: number;
  ranks: Record<MarkKpiKey, number>;
  additionalMarks: Record<MarkKpiKey, number>;
  totalAdditional: number;                        // Excel D42
  baseResults: Record<string, { passed: boolean; mark: number }>;
  totalBase: number;                              // Excel D30
  classAdjustment: number;                        // Excel D43
  total: number;                                  // Excel D44
  qualityBreakdown: SupplierQualityBreakdown;
}

export interface ClassMarksResult {
  scoringPeriod: number | null;
  activeTeamCount: number;          // Excel O31 (after override)
  autoTeamCount: number;            // what auto would have been
  isTeamCountOverridden: boolean;
  divisor: number;                  // Excel R31
  maxBase: number;
  maxAdditional: number;
  maxAttainable: number;            // maxBase + maxAdditional
  teams: TeamMarksResult[];
  warnings: string[];               // e.g. period mismatch, <2 teams
}

export function computeClassMarks(
  teams: Team[],
  config: MarksConfig,
): ClassMarksResult;

export function rankAscending(value: number, values: number[]): number;
export function computeSupplierQuality(team: Team): SupplierQualityBreakdown;
export const DEFAULT_MARKS_CONFIG: MarksConfig;
export const INITIAL_FACTORY_CAPACITY: number;
```

`computeClassMarks` performs its own filtering (§3), so the page passes `currentClass.teams` straight through. It must be **deterministic and side-effect free** — same inputs, same output, always.

---

## 11. GOLDEN FIXTURE — ACCEPTANCE TESTS

These figures come from the workbook's own cached values and have been independently re-derived. `computeClassMarks` **must** reproduce them exactly. Encode as a test or a dev-only assertion.

**Inputs** (5 teams; `activeTeamCount = 5`; defaults `pass 10 / fail 7 / hurdles 0.75 / scale 50`; adjustments all `6`):

| KPI | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| Gross Profit (%) | 0.5803820396 | 0.6007049948 | 0.6669274425 | 0.6851826746 | 0.6656312467 |
| Net Profit (%) | 0.1241628301 | 0.1419834939 | 0.2162841401 | 0.2514652279 | 0.2096886741 |
| ROE | 0.1563631375 | 0.1802453724 | 0.3321520199 | 0.3461023272 | 0.3062929075 |
| Customer Satisfaction | 0.7419617960 | 0.7399295005 | 0.7333072558 | 0.7314817325 | 0.7334368753 |
| Employee Satisfaction | 0.7446942181 | 0.7645340390 | 0.7588482722 | 0.7662483552 | 0.7494732959 |
| Acc. Revenue | 427769953.03 | 443777662.15 | 658957882.85 | 603170146.44 | 519179037.95 |
| Acc. Product Innovation | 15055857 | 15055857 | 35000000 | 26000000 | 20000000 |
| Total Production Capacity | 10000 | 10000 | 10000 | 54500 | 0 |
| Quality | 7.7419228597 | 7.4223214922 | 8.7913816955 | 7.8922246077 | 8.6549784891 |
| Bank Balance | −25361536.47 | 21369123.74 | 153637414.24 | 75115895.43 | −9657127.70 |
| Missed Sales | 0 | 0 | 0 | 18513.7466 | 0 |

**Expected outputs**

`divisor = (5 × 9) + 9 = 54` · `maxBase = 50` · `maxAdditional = 36` · `maxAttainable = 86`

Rank matrix (Excel `L10:P18`):

| KPI | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| Gross Profit (%) | 1 | 2 | 4 | 5 | 3 |
| Net Profit (%) | 1 | 2 | 4 | 5 | 3 |
| ROE | 1 | 2 | 4 | 5 | 3 |
| Customer Satisfaction | 5 | 4 | 2 | 1 | 3 |
| Employee Satisfaction | 1 | 4 | 3 | 5 | 2 |
| Acc. Revenue | 1 | 2 | 5 | 4 | 3 |
| Acc. Product Innovation | 1 | 1 | 5 | 4 | 3 |
| Total Production Capacity | 2 | 2 | 2 | 5 | 1 |
| Quality | 2 | 1 | 5 | 3 | 4 |

| Result | T1 | T2 | T3 | T4 | T5 | Excel row |
|---|---|---|---|---|---|---|
| Total Base Mark | **41** | **47** | **47** | **44** | **41** | 30 |
| Total additional marks | **6** | **11** | **25** | **28** | **16** | 42 |
| Class Adjustment | 6 | 6 | 6 | 6 | 6 | 43 |
| **TOTAL GROUP MARKS** | **53** | **64** | **78** | **78** | **63** | 44 |

**Additional required assertions**

1. `rankAscending(15055857, [15055857,15055857,35000000,26000000,20000000]) === 1` and `rankAscending(35000000, ...) === 5` — ties share the lower rank.
2. Per-criterion truncation: with `rank = 5`, `divisor = 54`, `scale = 50` → `Math.trunc(50*5/54) = 4`. Summing ranks first and rounding once yields 41 for T4 rather than 28 — assert 28.
3. T1 base = 41: fails "positive Cash" (−25.4m) and both satisfaction hurdles → `10+7+10+7+7`.
4. T4 base = 44: fails "No Missed Sales" (18513.7 > 0) and both hurdles → `10+10+7+7+10`.
5. Hurdle sensitivity: set `csatHurdle = 0.70` → every team passes criterion 4, each base mark rises by exactly 3, and totals become `56, 67, 81, 81, 66`.
6. Base-value sensitivity: set `baseMarkPass = 20`, `baseMarkFail = 0` → T1 base = `20+0+20+0+0 = 40`.
7. Team-count sensitivity: `activeTeamCountOverride = 6` → `divisor = 63`; T4 additional falls from 28 to `9 × trunc(50×rank/63)` computed per criterion.
8. Supplier quality, corrected formula (§5.4), given the sample allocations: T1 `7.655482`, T2 `7.371420`, T3 `8.791401`, T4 `7.892033`, T5 `8.654991` (± 1e-5). With `REPLICATE_EXCEL_ZEN_BUG = true`, T1 must equal `7.741923` (± 1e-5).
9. Negotiated override honoured: T5's Neepo quality resolves to **8**, not the base 5.
10. A team with `isComputer: true` or `isArchived: true` is absent from `result.teams` and excluded from `autoTeamCount`.
11. A team with `history = { 0: YEAR_0_RECORD }` only returns `hasResults: false`, is excluded from ranking, and does not shift other teams' ranks.
12. `computeClassMarks` called twice with identical inputs returns deeply equal results.

---

## 12. DEFINITION OF DONE

- [ ] `/facilitator/marks` renders for `FACILITATOR`; a `STUDENT` or `ADMIN` navigating there is redirected to `/dashboard` by `ProtectedRoute`.
- [ ] "Group Marks" appears in the facilitator sidebar only. Student and admin sidebars are byte-identical to `main`.
- [ ] Every golden-fixture assertion in §11 passes.
- [ ] All six settings persist to the class document, survive a page reload, and survive a class switch-away-and-back.
- [ ] Class adjustments are per team, accept negatives, debounce at 600 ms, and persist on blur.
- [ ] Per-team PDF matches the `Individual Group Report` layout, including the dynamic `Base Mark: (X% if Ok, Y% if not)` heading.
- [ ] Batch PDF export produces one file per scored team with no dropped downloads.
- [ ] XLSX export opens cleanly in Excel with all three sheets populated.
- [ ] The quality breakdown drawer's per-supplier shares sum to 100.00% for every team with procurement data.
- [ ] Zero new Firestore listeners. Confirm by grepping the diff for `onSnapshot`, `getDoc`, `getDocs`, `collection(` — expect no matches.
- [ ] `git diff --stat` touches at most: `App.tsx`, `components/Sidebar.tsx`, `types.ts`, `contexts/SimulationContext.tsx`, `index.html`, plus the three new files. `package.json` unchanged.
- [ ] `npm run build` succeeds with no new TypeScript errors.
- [ ] No file under `pages/decisions/`, `pages/Dashboard.tsx`, `pages/FinancialReports.tsx`, `pages/MarketReports.tsx`, `pages/Survey.tsx`, `pages/debrief/`, or `utils/SimulationEngine.ts` is modified.

---

## 13. EXCEL CELL REFERENCE INDEX

For auditability, the complete map back to the source workbook.

**`GROUP MARKS Calculation`**

| Cell / range | Meaning |
|---|---|
| `D6:H6` / `D7:H7` | Team numbers / names (columns D..H = teams 1..5) |
| `I7` | Reference team name, pulled from `'Supplier Evaluation for Quality'!J163` |
| `B10:B20` | The 11 criterion labels |
| `D10:H20` | Criterion values per team |
| `D18:H18` | Quality, pulled from `'Supplier Evaluation for Quality'!E175:I175` |
| `L10:P18` | `=RANK(value, $D..$H, 1)` — ascending ranks |
| `L19:P19` | `=SUM(L10:L18)` — total rank (display only; not used in marks) |
| `O31` | **Active class team** count — the configurable team count |
| `R31` | `=(O31*9)+9` — the rank divisor |
| `L25:P29` | `=IF(condition,"Yes","No")` — base-mark hurdle tests |
| `D25:H29` | `=IF(L25="Yes",10,7)` — base marks |
| `D30:H30` | `=SUM(D25:D29)` — Total Base Mark |
| `L33:P41` | `=L10/$R$31` — rank fraction |
| `D33:H41` | `=ROUNDDOWN(50*L33,0)` — additional marks |
| `D42:H42` | `=SUM(D33:D41)` — Total additional marks |
| `D43:H43` | Class Adjustments (hand-entered) |
| `D44:H44` | `=D30+D42+D43` — **TOTAL GROUP MARKS** |
| `D50:I53` | Revenue years 1–3 and total (feeds row 15) |
| `D56:I59` | R&D budget years 1–3 and total (feeds row 16) |
| `D62:I66` | Capacity years 0–3 and total (feeds row 17) |

**`Supplier Evaluation for Quality`**

| Cell / range | Meaning |
|---|---|
| `C2:C158` | `startFindec...` decision row labels; `E..I` = teams 1..5 |
| rows 35/61/87/113 | Supplier block starts: Alpha / Neepo / Zen / Cheng |
| `+2` from block start | Supplier Quality (rows 37, 63, 89, 115) |
| `+8, +11, +14` | Prod1/2/3 raw-material unit price |
| `+9,+10 / +12,+13 / +15,+16` | Prod1/2/3 component volume, component purchase |
| `+17, +20, +23` | Prod1/2/3 finished-goods unit price |
| `+18,+19 / +21,+22 / +24,+25` | Prod1/2/3 FG volume, FG purchase |
| `E164:I164` | Alpha Value (weight) |
| `E165:I165` | Neepo Value |
| `E166:I166` | Zen Value — **contains the off-by-one bug, §5.4** |
| `E167:I167` | Cheng Value |
| `E168:I168` | `=SUM(E164:E167)` — total weight |
| `E170:I173` | The four supplier quality ratings |
| `E175:I175` | `=Σ (Value_s / Total) × Quality_s` — **Quality Average** |

**`Individual Group Report`** — the PDF template

| Cell | Meaning |
|---|---|
| `B2`, `B3` | Title lines |
| `C5` | Group Number (the lookup key) |
| `C7` | `=HLOOKUP($C$5,'GROUP MARKS Calculation'!$D$6:$H$44,2,FALSE)` — group name |
| `B9:D9` | Column headers: Criteria Reviewed / Value / Rank Score |
| `B10:D20` | The 11 criteria, values from `$D$6:$H$44`, ranks from `$L$6:$P$18` |
| `B22` | `MARK CALCULATION` section header |
| `B23:C29` | Base mark block and Total Base Mark |
| `B31:C41` | Additional marks block and Total additional marks |
| `B42:C42` | Class Adjustments |
| `B43:C43` | TOTAL GROUP MARKS |
