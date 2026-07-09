# Feature Request: Facilitator "Decision Table" Page (Live from Firebase) with Excel/CSV Export

## Scope guard — read this first

Implement **only** what is described in this document. Do **not** refactor, rename, restyle, or "improve" any other part of the application. Do not change the simulation engine, decision pages, Firestore schema, security rules, or any existing component behaviour. The only permitted touchpoints outside the new files are the three small integration edits listed in "Integration points" below.

---

## 1. Goal

Add a new page inside the **Facilitator portal** that displays a single consolidated **Decision Table**: one column per team, one row per decision, showing every team's **current (draft) decisions for the active period**, updating **live from Firebase**. The facilitator must be able to **download the table as an Excel (.xlsx) file and as a CSV file**.

The table is modelled on the facilitator's existing Excel-based decision capture sheet (rows = decisions, columns = Team 1..N), but the rows must follow **this app's actual decision model** as defined in `types.ts` (`TurnDecisions`). Note in particular: this app breaks **Procurement** down further than the old Excel sheet did — procurement here is a per-product × per-supplier allocation of **Components** and **Finished Goods** units, plus an AI **Negotiation** outcome (preferred supplier, discount, payment terms). The table must reflect that structure, not the old spreadsheet's supplier price/attribute rows.

## 2. Where the data comes from (do not add new listeners)

`contexts/SimulationContext.tsx` **already** maintains a real-time `onSnapshot` listener on `classes/{classId}/teams` whenever the authenticated role is FACILITATOR (or ADMINISTRATOR) and a class is selected. The listener keeps `state.classes[...].teams` up to date in React state.

Therefore the new page must simply consume the context:

```ts
const { classes, currentClassId } = useSimulation();
const currentClass = classes.find(c => c.id === currentClassId);
const teams = currentClass?.teams ?? [];
```

- Each `Team` document carries `draftDecisions: TurnDecisions` (the live, in-progress decisions for the current period), plus `name`, `id`, `code`, `ceoName`, `currentPeriod`, `status`.
- If a team has no `draftDecisions` yet, fall back to `INITIAL_DECISIONS` from `constants.ts` (this mirrors how `runClassSimulation` treats missing drafts) and visually mark those cells/columns as "defaults" (e.g., muted text).
- Demo mode works automatically because the context populates `classes` from localStorage in that mode — no special handling needed beyond using the context.
- If `currentClassId` is null, render the same "select a class first" empty state pattern used by `FacilitatorDashboard` / `ClassManagement` (a message with a link to `/facilitator/classes`). Do not invent a new class picker.

**Do not** open new Firestore listeners inside the page. **Do not** call `getDocs` on mount. The context state is the single source of truth and is already live.

## 3. New page

Create `pages/facilitator/DecisionTable.tsx`.

### 3.1 Header area

- Title: **"Decision Table"**, subtitle: class name + "Period {currentClass.currentPeriod} — live team decisions".
- A small "Live" indicator (e.g., pulsing green dot) to communicate real-time updates.
- Two buttons, right-aligned: **"Download Excel"** and **"Download CSV"** (lucide `Download` / `FileSpreadsheet` icons, styled like existing primary/secondary buttons in the facilitator pages).

### 3.2 Table layout

- Columns: first column = decision label (sticky/frozen with `position: sticky; left: 0` and a background so it stays readable while scrolling), then one column per team, ordered by team id (same sort as the context uses: `a.id.localeCompare(b.id)`).
- The table container must scroll horizontally (`overflow-x-auto`) — classes can have 10+ teams.
- Use the existing visual language: white card, `border-slate-200`, rounded-xl, small mono font for numbers, section header rows with a slate background — consistent with tables already in the app (e.g., the Procurement page and UserManagement table styles). Tailwind only; no new CSS files.
- Group rows under section header rows (full-width, bold, slate-100 background):

**Team Info**
| Row | Source | Format |
|---|---|---|
| Team Name | `team.name` | text |
| Team Code | `team.code` | text |
| CEO Name | `team.ceoName` | text |
| Period | `team.currentPeriod` | integer |
| Status | `team.status` | badge text (Saved / InProgress etc.) |

**Marketing & Sales** (`draftDecisions.marketing`)
| Row | Field | Format |
|---|---|---|
| Market Share: TechBook / Zroid / iTab (3 rows) | `forecastedMarketShare[productId]` | percent |
| Price: TechBook / Zroid / iTab (3 rows) | `prices[productId]` | number, thousands separators |
| Advertising Budget | `advertisingBudget` | currency-style number |
| Advertising Split: TechBook / Zroid / iTab (3 rows) | `adSplits[productId]` | percent |
| Advertising Split: General | `generalAdSplit` | percent |
| Company Stores (Open/Close) | `openCloseStores` | signed integer |
| Agent Commission | `agentCommission` | percent |

**Operations** (`draftDecisions.operations`)
| Row | Field | Format |
|---|---|---|
| Production: TechBook / Zroid / iTab (3 rows) | `production[productId]` | number |
| Req. Finished Goods: TechBook / Zroid / iTab (3 rows) | `reqFinishedGoods[productId]` | number |
| Capacity Change | `capacityChange` | signed number |
| Innovation Budget | `rdBudget` | number |
| Innovation Split: TechBook / Zroid / iTab (3 rows) | `rdSplits[productId]` | percent |

**Procurement — Negotiation** (`draftDecisions.negotiation`)
| Row | Field | Format |
|---|---|---|
| Preferred Supplier | `selectedSupplierId` | text or "—" |
| Negotiation Status | `status` | text |
| Agreed Discount | `agreedDiscount` | percent (only meaningful when status is AGREED; show "—" otherwise) |
| Agreed Payment Terms | `agreedPaymentTerms` | days (same rule) |

**Procurement — Supplier Allocation** (`draftDecisions.procurement.supplierAllocation`)
For each product (TechBook, Zroid, iTab) render a sub-header row "Supplier Allocation — {Product}", then for each supplier in the app's supplier list (use the existing `SUPPLIERS` / supplier constants from `constants.ts` — do not hard-code a new list) two rows:
| Row | Field | Format |
|---|---|---|
| {Supplier}: Components | `supplierAllocation[productId][supplier].components` | number |
| {Supplier}: Finished Goods | `supplierAllocation[productId][supplier].finishedGoods` | number |

Also add, per product, two computed summary rows to help the facilitator spot allocation problems at a glance:
| Row | Computation | Format |
|---|---|---|
| Total Components Allocated | sum over suppliers | number; highlight red when ≠ `operations.production[productId]` |
| Total Finished Goods Allocated | sum over suppliers | number; highlight red when ≠ `operations.reqFinishedGoods[productId]` |

(These are the same "unallocated" checks the student Procurement page computes — reuse the same logic, computed locally in the page; do not import from or modify the Procurement page.)

**Human Resources** (`draftDecisions.hr`) — for each `HRRole` (use the app's `HR_ROLES` / role constants, not a hard-coded list):
| Row | Field | Format |
|---|---|---|
| {Role}: Recruit/(Dismiss) | `hiring[role]` | signed integer |
| {Role}: Salary | `salaries[role]` | number |
| {Role}: Training | `trainingLevels[role]` | text (Basic / Moderate / Advanced / None) |

**Finance** (`draftDecisions.finance`)
| Row | Field | Format |
|---|---|---|
| Debtor Days: TechBook / Zroid / iTab (3 rows) | `debtorsDays[productId]` | days |
| Dividends | `dividends` | number |
| Debt (Raise/Pay) | `debtChange` | signed number |
| Equity (Raise/Retire) | `equityChange` | signed number |

### 3.3 Formatting rules

- Reuse `formatNumber` / `formatPercent` from `utils/numberFormat.ts` — do not write new formatting helpers unless one genuinely doesn't exist there.
- Percentages stored as 0–1 fractions must display as percentages (e.g., `0.25` → `25%`). Market share values may be stored 0–100 in `forecastedMarketShare` per the type comment — check the actual stored convention in `INITIAL_DECISIONS` and format accordingly; the on-screen value must match what the student sees on their decision pages.
- Missing/undefined values render as "—" on screen and empty cells in exports.
- Build the row definitions as a single data-driven array of `{ section, label, getValue(team): string | number }` and render both the table and the exports from that one array, so the screen and the downloaded files can never diverge.

## 4. Export (Excel + CSV)

Add a small utility used only by this page (e.g., `utils/decisionTableExport.ts`, or keep it inside the page file — implementer's choice, but no changes to existing utils):

- **CSV**: build the CSV string from the same row-definition array (first column = decision label, then one column per team; include the section names as their own rows so the CSV mirrors the on-screen grouping). Escape commas/quotes properly. Trigger download via `Blob` + `URL.createObjectURL` + a temporary `<a download>`. No dependency needed.
- **Excel (.xlsx)**: use **SheetJS (`xlsx`)**.
  - Add `"xlsx"` to `package.json` dependencies.
  - This project also uses an ESM import map in `index.html` (esm.sh) — add a matching entry there (`"xlsx": "https://esm.sh/xlsx@<pin a current version>"`) so the AI Studio / import-map runtime resolves it the same way the other libraries do.
  - Generate a single worksheet named `Decisions` via `XLSX.utils.aoa_to_sheet` from the same array-of-arrays used for CSV, set a wide first column (`ws['!cols']`), and download with `XLSX.writeFile`.
- Filename pattern for both: `{className}_P{period}_decisions_{YYYY-MM-DD}.xlsx|csv` (sanitise the class name for filesystem safety).
- Export must snapshot whatever is currently in state at click time (which is live), including numeric raw values — export raw numbers (not display-formatted strings) for numeric cells in the xlsx so the facilitator can compute on them in Excel; CSV may use raw numbers too. Percent fields: export the fraction (e.g., 0.25) in xlsx with a note row is NOT needed — just keep it consistent, and keep the on-screen display formatted.

## 5. Integration points (the only edits to existing files)

1. **`App.tsx`** — add one route, following the existing pattern exactly:
   ```tsx
   <Route path="/facilitator/decision-table" element={
     <ProtectedRoute allowedRoles={['FACILITATOR']}><DecisionTable /></ProtectedRoute>
   } />
   ```
   plus the corresponding import.
2. **`components/Sidebar.tsx`** — add one `NavLink` in the FACILITATOR navigation block (under the "Management" group, after "Class Management"), using an appropriate lucide icon (e.g., `Table` or `Grid3x3`), following the exact structure/classNames of the neighbouring links, including the collapsed-sidebar `title` behaviour. Label: **"Decision Table"**.
3. **`package.json` / `index.html`** — the `xlsx` dependency + import-map entry described in §4.

Nothing else in the codebase may be modified.

## 6. Acceptance criteria

1. Logging in as a facilitator (`DEMO-FAC` works for demo mode) and selecting a class, the new "Decision Table" sidebar item opens `/facilitator/decision-table` showing all teams as columns and all decision rows listed in §3.2.
2. When a student (in another browser/session) changes a decision and it persists to Firestore, the corresponding cell updates on the facilitator's screen without a page refresh (this should fall out automatically from the existing context listener — verify, don't rebuild).
3. "Download CSV" produces a well-formed CSV whose rows/columns match the screen.
4. "Download Excel" produces a valid .xlsx that opens in Excel with the same content, one sheet, readable column widths.
5. Teams with no draft decisions show defaults, visibly muted, and never crash the page (defensive optional-chaining on every nested field — Firestore documents may be partially populated).
6. Students and admins cannot reach the page via URL (ProtectedRoute enforces FACILITATOR).
7. No visual or behavioural change anywhere else in the app; `npm run build` passes with no new TypeScript errors.

## 7. Out of scope (explicitly)

- No editing of decisions from this table (read-only).
- No historical/past-period view (current draft period only).
- No changes to Firestore document shapes, security rules, or the simulation engine.
- No PDF export.
