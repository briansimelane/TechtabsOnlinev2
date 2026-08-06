# TechTabs Online v2 — Facilitator Debrief Presenter

**Implementation brief for Antigravity**
Repo: `briansimelane/TechtabsOnlinev2`
Pattern reference: `briansimelane/evalu8smart2026` → `src/pages/Viewer/*`
Owner: Brian Simelane · LearningSims

---

## 1. Goal

Add a **Debrief Presenter**: a projector-friendly, animated slide deck that a facilitator opens from inside the TechTabs facilitator area and drives with arrow keys while the class watches. It is the TechTabs equivalent of the Evalu8Smart "Projector Viewer", but instead of mirroring a live board it presents **year-end results** as a controlled sequence of animated charts.

**Non-goals:** no export to PowerPoint/PDF in this phase, no student-side access, no editing of results from the presenter.

---

## 2. What already exists (read this before writing code)

### 2.1 The Evalu8Smart pattern to copy

| Concern | Evalu8Smart file | What to reuse |
|---|---|---|
| Pop-out trigger | `src/components/Dashboard.tsx` → `handleOpenViewer()` | `window.open('/viewer/{code}', 'evalu8-viewer', 'popup,width=1600,height=900')` |
| Un-authed standalone route | `src/App.tsx` → `<Route path="/viewer/:classCode" …/>` | Route sits **outside** the authenticated layout |
| Fixed-canvas scaling | `src/pages/Viewer/ViewerScaler.tsx` | 1920×1080 canvas, `transform: scale(min(vw/1920, vh/1080))` |
| Live data | `src/hooks/useGameBoardState.ts` | `onSnapshot` on the class doc, resolve code → classId |
| Fullscreen | `ViewerPage.tsx` | `F` key toggles `requestFullscreen()` |

Port all five ideas. **Do not port the board layout components** (`RegionLayer`, `PriceLadder`, `TechPanel`, `ImprovementStrip`) — TechTabs needs charts, not a board.

### 2.2 TechTabs constraints that will bite you

1. **HashRouter.** `App.tsx` uses `HashRouter`. The pop-out URL must be `#/debrief/{classId}`, e.g.
   `window.open('#/debrief/' + classId, 'techtabs-debrief', 'popup,width=1600,height=900')`.
   Build the URL as `${window.location.origin}${window.location.pathname}#/debrief/${classId}`.
2. **Auth guard.** `AppLayout` redirects to `/login` unless `isAuthenticated`. The debrief route must be registered **above** `AppLayout`, next to the `Router`, exactly like `/login` and `/survey` are special-cased — see §4.1.
3. **Import map.** `index.html` carries an `importmap` pointing at `esm.sh`. **Any new dependency must be added to BOTH `package.json` and the importmap, or the dev build breaks.** This brief is designed to need **zero new dependencies** — `recharts@^3.7.0` is already present in both.
4. **Tailwind is CDN-loaded** (`https://cdn.tailwindcss.com`) with a small `<style>` block in `index.html`. Arbitrary values work. Add debrief keyframes to that same block (§7.3) or to `index.css`.
5. **Firestore rules are fully open** (`allow read, write: if true`). The un-authed debrief window can read directly. Do not treat this as a security design — just don't make it worse.
6. **Firestore shape:** `classes/{classId}` holds `SimulationClass`; teams live in the subcollection `classes/{classId}/teams/{teamId}` as `Team` docs. `listClasses()` in `utils/firestoreHelpers.ts` shows the merge behaviour. History lives at `team.history[period]` as a `PeriodRecord`.

---

## 3. ⚠️ Blocking data gap — fix this first

Four of the requested slides need numbers that **TechTabs does not currently persist**. This is Phase 1 and nothing else works without it.

### 3.1 What's missing

| Slide | Needs | Where it lives now | Problem |
|---|---|---|---|
| Plan vs Actual (units) | Forecast units, Demand units, Actual units | `utils/marketShareBackModel.ts` → `computeMarketShareBackModel()` | Computed from `team.draftDecisions`, which `runClassSimulation` **resets to `INITIAL_DECISIONS`** immediately after the year runs. Past years are unrecoverable. |
| Value vs Price | Value score per team per product | Same — `ProductMarketShareResult.totalScoreByTeam` | Same problem. |
| Actual Market Share | Realised share | `PeriodRecord.kpis.marketShare` ✅ | Available, but computed by `SimulationEngine` (S-curve), **not** by the back model. Two different share engines coexist — see §3.4. |
| Customer Service | CS headcount and required CS | `Team.staffCounts.customerService` (current state only) | Not snapshotted per period. |

### 3.2 Fix — extend `PeriodRecord`

In `types.ts`, add two optional blocks (optional so existing saved classes still parse):

```ts
export interface PeriodMarketRecord {
  marketSize:     Record<ProductId, number>; // total market units for the year
  forecastUnits:  Record<ProductId, number>; // forecastedMarketShare% × marketSize
  demandUnits:    Record<ProductId, number>; // share earned × marketSize
  actualUnits:    Record<ProductId, number>; // min(demand, available)
  availableUnits: Record<ProductId, number>;
  actualShare:    Record<ProductId, number>; // 0–1, realised
  valueScore:     Record<ProductId, number>; // see §3.3
  valueScoreExPrice: Record<ProductId, number>;
}

export interface PeriodRecord {
  // …existing fields unchanged…
  market?:      PeriodMarketRecord;
  staffCounts?: Record<HRRole, number>;   // closing headcount for the year
  requiredCS?:  number;                   // ceil(totalUnitsSold / 1000)
}
```

Populate them in `utils/SimulationEngine.ts` inside `processTurn`, where `periodRecord` is assembled (~line 587). All the raw values already exist as locals in that function: `unitsSold`, `productDemands`, `productAvailable`, `marketShares`, `productScores`, `getMarketSize(p.id, period)`, `staffCounts`, `requiredCS`. It is a pure additive change — **do not alter any existing field or any existing calculation.**

`forecastUnits` comes from `decisions.marketing.forecastedMarketShare[p.id]` — note this is stored as a **percentage 0–100**, not a fraction (`MarketReports.tsx` line 218 divides by 100). Get this wrong and the Plan vs Actual slide is off by 100×.

### 3.3 Value score definition (design decision — flag it, don't bury it)

`ProductMarketShareResult.totalScoreByTeam` is the weighted sum across all 10 buying criteria **including Price**. Plotting that against Price on the other axis is partly self-referential — a cheap team scores high on "value" *because* it is cheap, and the bubble chart says nothing.

Persist **both**, and drive the slide from `valueScoreExPrice` by default:

```ts
// value excluding the Price criterion (id: 1), rescaled to 0–100
const priceWeighted = criteria.find(c => c.id === 1)!.weightedByTeam[i];
const valueExPrice  = (totalScoreByTeam[i] - priceWeighted);
```

Expose a single constant in the debrief config so Brian can flip it in one line during a session:

```ts
export const VALUE_AXIS_EXCLUDES_PRICE = true;
```

### 3.4 Two market-share engines — pick one, say which

`SimulationEngine.ts` uses an S-curve share model. `marketShareBackModel.ts` uses a normal-CDF competitive model against the other teams, and is what `MarketReports.tsx` shows students. **These do not agree.** If the debrief shows share from one and the students' Market Report shows the other, the class will catch it in the room.

**Recommendation:** persist the back-model outputs into `PeriodMarketRecord` (run `computeMarketShareBackModel` on the class's teams *before* resetting draft decisions in `runClassSimulation`), and drive **every** debrief slide from `PeriodRecord.market`. Leave `kpis.marketShare` untouched for backwards compatibility. Note this choice at the top of the file you write it in.

### 3.5 Backfill for classes already run

Add `utils/debriefBackfill.ts`:

- If `record.market` is absent, derive what is derivable — `actualUnits ≈ revenue.byProduct[p] / (record.prices?.[p] || 1)`, `actualShare` from `kpis.marketShare`.
- Set `forecastUnits`, `demandUnits`, `valueScore` to `null` and have the affected slides render a quiet inline notice: *"Plan vs Actual is available from the next simulated year."* — never a crash, never a zero-height chart, never a fake zero bar.

---

## 4. Architecture

### 4.1 Routing

`App.tsx` — register before `AppLayout` consumes the path:

```tsx
const App: React.FC = () => (
  <SimulationProvider>
    <Router>
      <Routes>
        <Route path="/debrief/:classId" element={<DebriefPresenter />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </Router>
  </SimulationProvider>
);
```

`DebriefPresenter` must not render `Sidebar`, `Header`, or depend on `isAuthenticated`.

### 4.2 Slide control — Firestore-backed

The facilitator may project from the same machine (second screen) **or** drive from a phone while the deck runs on a lecture-room PC. Use Firestore as the single source of truth so both work:

**Doc:** `classes/{classId}/debrief/state`

```ts
interface DebriefState {
  slideIndex: number;    // 0-based index into the compiled slide list
  revealStep: number;    // within-slide stagger step (0 = nothing revealed)
  period: number;        // which simulation year is being debriefed
  isLive: boolean;       // false = presenter shows a holding card
  updatedAt: string;     // ISO
}
```

- The **presenter window** subscribes via `onSnapshot` and also *writes* on key press — so the projected window itself is a valid controller (facilitator clicks it and uses arrows).
- The **facilitator dashboard** renders a small remote panel (prev / next / slide jump / year selector / end) writing to the same doc.
- Debounce writes to ~150 ms. Apply key presses to local state optimistically, then write — arrow keys must feel instant on a projector, not wait for a round trip.

### 4.3 File layout

```
pages/debrief/
  DebriefPresenter.tsx        // route root: data load, keyboard, fullscreen, slide router
  DebriefScaler.tsx           // port of ViewerScaler (1920×1080)
  DebriefRemote.tsx           // small control panel rendered in the facilitator dashboard
  slides/
    TitleSlide.tsx
    SectionSlide.tsx          // reusable divider: "TechBook", "Operations", "League Table"
    TotalRevenueSlide.tsx
    RevenueByProductSlide.tsx
    RevenueMixSlide.tsx
    GrossProfitSlide.tsx
    ProductRevenueSlide.tsx    // props: productId
    ProductShareSlide.tsx      // props: productId
    ProductPlanVsActualSlide.tsx
    ProductValuePriceSlide.tsx
    OpexSlide.tsx
    CustomerServiceSlide.tsx
    CustomerSatisfactionSlide.tsx
    EmployeeSatisfactionSlide.tsx
    LeagueCurrentSlide.tsx
    LeagueOverallSlide.tsx
  components/
    SlideFrame.tsx            // title, eyebrow, footer, team-colour rail, slide counter
    TeamBarChart.tsx          // shared recharts wrapper + reveal animation
    Reveal.tsx                // staggered-entry wrapper driven by revealStep
    Figure.tsx                // count-up number with tabular figures
hooks/
  useDebriefData.ts           // class + teams + history → DebriefDataset
  useDebriefState.ts          // Firestore slide-control subscribe/publish
utils/
  debriefSlides.ts            // compiles the ordered slide list
  debriefFormat.ts            // R / % / units formatters (reuse utils/numberFormat.ts)
  leagueScoring.ts            // NEW shared module — see §6
  debriefBackfill.ts
```

### 4.4 `useDebriefData`

```ts
export interface DebriefTeam {
  id: string; name: string; colorIndex: number;
  record: PeriodRecord;            // history[period]
  prior?: PeriodRecord;            // history[period-1], for delta chips
}
export interface DebriefDataset {
  className: string;
  period: number;                  // "Year N"
  teams: DebriefTeam[];            // archived teams excluded, sorted by team.id
  loading: boolean;
  error: string | null;
}
```

Subscribe to `classes/{classId}` **and** `collection(db,'classes',classId,'teams')`. Filter out `team.isArchived` and `team.isComputer` is *kept* (bots are legitimate competitors in the room). Sort by `team.id` so a team keeps the same colour and the same bar position on every single slide — this consistency is the whole readability argument for the deck.

---

## 5. Slide sequence (28 slides)

Compile in `debriefSlides.ts`. Products loop over `PRODUCTS` from `constants.ts` (`techbook` → "TechBook", `zroid` → "Zroid", `itab` → "iTab") so the order is data-driven, not hand-typed.

| # | Slide | Type | Data source |
|---|---|---|---|
| 1 | **{Class Name} · Year {N}** | Title | `class.name`, `class.currentPeriod` |
| 2 | Total Revenue per team | Bar | `record.revenue.total` |
| 3 | Revenue per product per team | Grouped bar (3 series) | `record.revenue.byProduct` |
| 4 | Revenue contribution per product (%) | 100% stacked bar | `byProduct / total` |
| 5 | Gross Profit (R) | Bar + GP% label | `record.grossProfit.total` |
| 6 | **TechBook** | Section | — |
| 7 | Revenue: TechBook | Bar | `revenue.byProduct.techbook` |
| 8 | Actual Market Share: TechBook | Bar (%) | `market.actualShare.techbook` |
| 9 | Plan vs Actual: TechBook | Grouped bar, 3 series (Forecast / Demand / Actual), units | `market.forecastUnits / demandUnits / actualUnits` |
| 10 | Value vs Price: TechBook | Scatter/bubble — X = Price, Y = Value | `record.prices.techbook`, `market.valueScoreExPrice.techbook` |
| 11–15 | **Zroid** section + 4 slides | as 6–10 | `zroid` |
| 16–20 | **iTab** section + 4 slides | as 6–10 | `itab` |
| 21 | **Operations** | Section | — |
| 22 | Operating Expenses | Stacked bar per team | `record.opex.{marketing,store,agents,payroll,training,rd,other}` |
| 23 | Customer Service | Dual: CS headcount vs required, coverage ratio | `staffCounts.customerService`, `requiredCS` |
| 24 | Customer Satisfaction | Bar (%) + prior-year delta | `kpis.customerSatisfaction` |
| 25 | Employee Satisfaction | Bar (%) + prior-year delta | `kpis.employeeSatisfaction` |
| 26 | **League Table** | Section | — |
| 27 | League — Current Year | Ranked table + score bar | §6 |
| 28 | League — Overall | Stacked bar, one segment per year | §6 |

### Slide notes

**#4 Revenue mix.** 100% stacked, one bar per team, product colours constant. Add a faint industry-average reference line so a team can see whether its mix is unusual or just typical.

**#9 Plan vs Actual.** Three bars per team in units. The teaching point is the two gaps: *Forecast → Demand* = "did you read the market?", *Demand → Actual* = "could you supply what you won?". Label those two gaps explicitly on the chart when `revealStep >= 2`. This is the highest-value slide in the deck — give it the most careful treatment.

**#10 Value vs Price.** Scatter, X = price (R), Y = value score. Bubble radius = units sold, so volume is readable without a fourth axis. Draw a faint diagonal "fair value" trend line through the point cloud (least-squares): above it = over-delivering on value for the price, below = over-priced. Label every bubble with the team name — a legend forces the room to look away from the plot.

**#22 Opex.** Stack in a fixed order (payroll, marketing, store, agents, training, R&D, other) so stack bands line up across teams. Show total R above each bar.

**#23 Customer Service.** Left: grouped bars, CS headcount vs required CS. Right: coverage ratio (`actual / required`) with a 1.0 reference line. Required CS is `ceil(totalUnitsSold / 1000)` — the same formula `SimulationEngine` uses to compute the CSAT penalty, so the causal link to slide 24 is visible.

**#24 / #25.** Percentages, 0–100% axis, delta chip vs prior year (▲/▼ with the point change). The engine caps CSAT movement at ±7% and ESAT at ±5% per year — mention the cap in the slide footnote so nobody argues about small deltas.

---

## 6. League scoring — shared module (`utils/leagueScoring.ts`)

### 6.1 There is a bug in the existing implementation

`pages/facilitator/FacilitatorDashboard.tsx` (~line 253) reads prior-year figures as:

```ts
const rev = hist.incomeStatement?.revenue || 0;
const gp  = hist.incomeStatement?.grossProfit || 0;
const np  = hist.incomeStatement?.netProfit || 0;
const eq  = hist.balanceSheet?.equity || 0;
```

`PeriodRecord` has **no `incomeStatement` key**. The correct paths are `hist.revenue.total`, `hist.grossProfit.total`, `hist.netProfit`, `hist.balanceSheet.equity`. Only the last one resolves. **Result: `prevScore` is currently always 0 and `finalScore === score` for every team, in every year.** Slide 28 would inherit the bug.

Fix it, and prevent recurrence by extracting the scoring into one module that both the dashboard and the debrief import. Do not fork the logic.

### 6.2 Module contract

```ts
export interface TeamYearMetrics {
  teamId: string; teamName: string;
  revenue: number; grossProfit: number; netProfit: number; equity: number;
  gpMargin: number; npMargin: number; roe: number;   // all as %
}
export interface TeamYearScore extends TeamYearMetrics {
  year: number;
  gpPoints: number; npPoints: number; roePoints: number;
  score: number;      // gpPoints + npPoints + roePoints
  maxScore: number;   // nTeams * 3
}

export function metricsFromRecord(rec: PeriodRecord): TeamYearMetrics;
export function scoreYear(teams: {id,name,record}[], year: number): TeamYearScore[];
export function scoreCumulative(teams: DebriefTeam[], throughYear: number): {
  teamId: string;
  byYear: Record<number, number>;   // year → that year's score
  total: number;
}[];
```

Preserve the existing rules exactly: rank ascending on each metric so **1 = worst, nTeams = best**, points summed across the three metrics, `maxScore = nTeams * 3`. Ties: keep the current stable-sort behaviour (distinct consecutive ranks) — do not switch to average ranks without asking, it would change historical standings.

`metricsFromRecord` is the single place the field paths live:

```ts
const revenue = rec.revenue.total;
const grossProfit = rec.grossProfit.total;
const netProfit = rec.netProfit;
const equity = rec.balanceSheet.equity;
```

### 6.3 Slide 27 — League Current

Ranked rows, best score at the top. Per row: rank, team colour chip, team name, GP% · NP% · ROE (each with its points as a small superscript), then the score as a filled bar out of `maxScore`. Reveal rows bottom-up on `revealStep` — the winner lands last, which is the moment the room is waiting for.

### 6.4 Slide 28 — League Overall

Horizontal stacked bar per team, one segment per year (Year 1 … Year N), segment labelled with that year's points, total at the bar end, sorted by cumulative total. Use one hue with increasing lightness per year rather than rainbow segments — the reader is comparing *totals across teams* and *trajectory within a team*, not identifying years by colour. Legend maps lightness to year.

---

## 7. Visual design

### 7.1 Direction

A projected results deck at 1920×1080, read from 10 metres, in a room where the numbers are about to be argued over. It should read as a **broadcast results board**: authoritative, high contrast, numerically precise, with team identity carried consistently from slide 1 to slide 28. Not a corporate slide template.

### 7.2 Tokens

```
Ink        #0B1220   canvas
Ink-2      #131C2E   panel / chart plot area
Rule       #22304A   gridlines, dividers
Chalk      #E8EDF7   primary text
Chalk-dim  #8296B4   labels, axes, footnotes
Signal     #37D9A4   positive delta, "actual", winner accent
Warn       #F2994A   gap / shortfall callouts
```

Team colours — 6 fixed hues assigned by sorted team index, never re-shuffled:
`#4CC3FF · #FFC24C · #FF6B8A · #9B8CFF · #37D9A4 · #FF9560`

Product colours (stable across slides 3, 4, 22): TechBook `#4CC3FF`, Zroid `#9B8CFF`, iTab `#FFC24C`.

**Type:** display — `Archivo`, weight 700–800, tight tracking, for slide titles and the title slide. Body/labels — `Inter` (already loaded). Figures — `IBM Plex Mono`, `font-variant-numeric: tabular-nums`, so digits don't jitter during count-up animation and columns align. Add the two families to the existing Google Fonts `<link>` in `index.html`.

Type scale on the 1920 canvas: eyebrow 28px · slide title 76px · axis/label 26px · data label 32px · hero figure 120px.

**Signature element:** a 12px team-colour rail down the left edge of every data slide, segmented by team in current rank order. It re-orders with a transition as the deck moves through slides, so the room can watch standings shift without a leaderboard being on screen. It is the one piece of motion that carries meaning rather than polish.

Keep everything else quiet: no gradients, no shadows, no rounded chart corners, no chart junk. One accent, one signature, disciplined spacing.

### 7.3 Animation

Add to the `<style>` block in `index.html`:

```css
@keyframes debrief-slide-in { from { opacity:0; transform: translateY(24px);} to { opacity:1; transform:none;} }
@keyframes debrief-fade     { from { opacity:0 } to { opacity:1 } }
@media (prefers-reduced-motion: reduce) {
  .debrief-anim, .debrief-anim * { animation: none !important; transition: none !important; }
}
```

Rules:
- **Slide transition:** 320 ms fade + 24px rise. One transition style for the whole deck.
- **Bars:** recharts `isAnimationActive`, `animationDuration={700}`, `animationBegin={index * 90}` for a left-to-right sweep.
- **Figures:** count-up over 700 ms, matched to the bar growth, `tabular-nums` throughout.
- **Reveal steps:** `revealStep` gates layers within a slide — 0 chart frame, 1 bars, 2 data labels / callouts, 3 the insight line. `→` advances the reveal, then the slide; `←` reverses. This is what lets Brian talk over a slide instead of racing it.
- Respect `prefers-reduced-motion` everywhere.

### 7.4 Copy

Slide titles are plain and specific: "Revenue per product", not "Revenue Performance Deep Dive". Every slide carries a one-line footer stating what the number is and where it comes from ("Units sold × price, per product, Year 3"). The empty state on a backfilled year says what's available and when, not that something failed.

---

## 8. Facilitator entry point

Add to `pages/facilitator/ClassManagement.tsx` (in the class header, near the existing class actions) and to `pages/facilitator/FacilitatorDashboard.tsx`:

```tsx
<button onClick={openDebrief} className="…">
  <Presentation className="h-4 w-4" /> Open Debrief
</button>
```

`openDebrief` writes an initial `DebriefState` (`slideIndex: 0, revealStep: 0, period: cls.currentPeriod - 1, isLive: true`) then opens the pop-out. Default the debriefed year to the **last completed** year, and let the remote change it.

`Presentation` is already available from `lucide-react`.

Render `<DebriefRemote classId={…} />` beneath the button when a debrief window is open: prev / next, slide list jump, year selector, and "End debrief" (sets `isLive: false`; the presenter then shows a holding card with the class name).

Guard: if no team has `history[period]`, disable the button with the tooltip "Run the year to unlock the debrief."

---

## 9. Build order

| Phase | Scope | Done when |
|---|---|---|
| **1** | `PeriodRecord` extension + `SimulationEngine` persistence + backfill util + back-model snapshot in `runClassSimulation` | A newly run year writes a complete `market` block; an old class loads without error |
| **2** | `leagueScoring.ts`, fix the `incomeStatement` bug, refactor `FacilitatorDashboard` to import it | Dashboard `prevScore` is non-zero from Year 2, and matches a hand calculation |
| **3** | Route, `DebriefPresenter`, `DebriefScaler`, `useDebriefData`, `useDebriefState`, `SlideFrame`, title + section slides, keyboard + fullscreen | Pop-out opens, shows title slide, arrows move between placeholders, syncs across two windows |
| **4** | Slides 2–5 and the shared `TeamBarChart` / `Reveal` / `Figure` primitives | Financial overview block presents end to end |
| **5** | Product block (6–20), parameterised by `productId` | All three products render from one component set |
| **6** | Operations block (21–25) | Opex, CS, CSAT, ESAT complete |
| **7** | League block (26–28) | Current and cumulative standings correct against a hand-checked class |
| **8** | Animation polish, reduced-motion, empty states, 1366×768 and 4K projector check | Full run-through on a real class with no console errors |

---

## 10. Acceptance criteria

1. Facilitator opens the debrief from `ClassManagement`; a 1600×900 pop-out shows the title slide with the correct class name and year.
2. `→` / `←` advance and reverse through reveal steps then slides; `F` toggles fullscreen; `Esc` exits fullscreen; `Home` returns to slide 1.
3. Driving the deck from the facilitator dashboard remote updates the projected window within ~300 ms, and vice versa.
4. All 28 slides render for a class with ≥ 2 completed years and 4+ teams, with no console errors.
5. A team's colour and horizontal position are identical on every slide in the deck.
6. Plan vs Actual reconciles: `Actual = min(Demand, Available)` for every team and product, and `Forecast` matches `forecastedMarketShare% × market size` shown in the students' Market Report.
7. League Current totals match a hand calculation; League Overall Year-N segment equals League Current's score for that year.
8. A class run before this change still opens; slides needing unavailable data show the inline notice, not a crash or a zero bar.
9. The deck scales cleanly at 1366×768, 1920×1080 and 3840×2160 with no scrollbars and no clipped labels.
10. `prefers-reduced-motion: reduce` disables all animation while every slide remains fully readable.
11. `package.json` dependencies are unchanged; `index.html` importmap is unchanged apart from the Google Fonts link.

---

## 11. Open questions for Brian

1. **Value axis** — default is value *excluding* price (§3.3). Confirm, or flip `VALUE_AXIS_EXCLUDES_PRICE`.
2. **Market share source** — recommendation is the back model everywhere, so the debrief matches the students' Market Report (§3.4). Confirm.
3. **Bot teams** — currently included in all charts and the league. Confirm, or exclude them from the league only.
4. **Multi-year slides** — slides 2–25 show the selected year only. Should any of them (revenue, CSAT, ESAT) offer a trend view across all years on a second reveal step?
