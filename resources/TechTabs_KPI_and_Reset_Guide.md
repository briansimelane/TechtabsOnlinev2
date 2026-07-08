# TechTabs Online v2 — Year Reset & KPI Correctness Guide for Antigravity

Source of truth: `Henley_Simulation_Master.xlsm` (the Excel model TechTabs Online v2 is based on). This document was produced by extracting the actual formulas and named ranges from the workbook, not by inference, so treat it as the spec to build/audit against.

---

## 1. How the financial engine actually works (read this first)

The Excel model is a real general ledger, not a flat spreadsheet of hardcoded period values. Every balance sheet and income statement line follows one pattern, repeated for every account:

```
Closing balance (backEnd)  =  Opening balance (backStart)  +  Period movement (backChange)
```

- **`backStart`** — opening balances for the period, one row per chart-of-accounts code (e.g. `10-0-01 = Cash & Cash Equivalents`). These are pasted-in values (not live formulas), because at period rollover the *prior period's closing balances get copied into this sheet as the new opening balances* (a "close the books" step).
- **`backTxrs`** — the transaction journal. Every decision/event that touches the books posts a row here tagged with an account code.
- **`backChange`** — period movement per account, computed as `=SUMIF(backTxrs!$A:$A, backChange!$A<row>, backTxrs!G:G)` — i.e. it sums all journal entries for that account code in the current period.
- **`backEnd`** — closing balance per account: `=backStart!G<row> + backChange!G<row>`.
- **`backReset`** — the canonical **Year 0 closing balance sheet** (cash, debtors by segment, finished + component inventory, PPE, accumulated depreciation, creditors by segment, share capital, retained earnings, prior net profit, plus Year 0 sales/COGS/opex actuals), pre-built for several team-count scenarios (columns I:R, selected via `CHOOSE(setNumberOfTeams, ...)`).

**Implication for your app's data model:** if Antigravity didn't replicate this ledger pattern (opening + movement = closing, posted via discrete transactions), a "reset to Year 1" can't just zero out a few fields — it has to mean *"reload `backReset`'s Year 0 values as the new Year 1 opening balance, and clear all transactions/journal entries for Year 1 onward."* Ask Antigravity to confirm how the app currently models periods before implementing the reset, because the correct implementation depends entirely on whether it mirrors this ledger pattern or uses some other state representation.

---

## 2. Year reset feature — exact requirements

**Goal:** Give the user (admin) a "Reset to Year 1" action. After reset:
- Year 0 is preserved and shown as the prior/baseline year in all comparative views (KPI dashboards, trend charts, year-over-year tables) — exactly as it does today, untouched.
- Year 1 becomes the new "current" year, with its opening balance sheet equal to the Year 0 closing balance sheet (i.e., the `backReset` values).
- All decisions, transactions, and calculated results for Year 1 onward are cleared.
- The reset is scoped to a single session/team — not global — since multiple teams may run in parallel.

**Source data to map (from `backReset`):**
- Current assets: cash, debtors (by customer segment — up to 5 segments), finished goods inventory (by product — up to 5 products), component inventory (by product), investments
- Non-current assets: PPE, accumulated depreciation
- Current liabilities: bank overdraft, creditors (by segment, up to ~8 lines), SARS/taxes
- Non-current liabilities: bank loan, solvency loan, other long-term debt
- Equity: ordinary shares, preference shares, retained earnings, prior net profit
- Year 0 actuals: sales by product, COGS by product, other income, opex lines (advertising, channel/agent expenses, etc.)
- These values differ by `setNumberOfTeams` (10 presets) — confirm which preset the live app's sessions correspond to before mapping.

**Prompt block for Antigravity:**

> Implement a "Reset to Year 1" action (admin-only, behind a confirmation dialog since it's destructive). I'm providing `Henley_Simulation_Master.xlsm`. Use the `backReset` sheet as the source of truth for the Year 0 closing balance sheet — map every row (cash, debtors by segment, finished + component inventory by product, PPE, accumulated depreciation, creditors by segment, share capital, retained earnings, prior net profit, and Year 0 sales/COGS/opex) to its equivalent field in our Firestore data model.
>
> On reset:
> 1. Restore Year 0's closing balances as Year 1's opening balances, exactly as `backReset` defines them.
> 2. Clear all decisions, transactions, and calculated results for Year 1 onward.
> 3. Set the session's current-year pointer to Year 1.
> 4. Keep Year 0 fully intact and visible as the prior/baseline year in every comparative view (KPI dashboards, trend charts, year-over-year tables).
> 5. Do not touch the session/team/user setup — only year-by-year financial and decision data.
> 6. Scope this strictly to the session being reset, never globally.
>
> Before writing code, tell me: does our current data model already follow an opening-balance + period-movement = closing-balance pattern per account (like the Excel model's `backStart` + `backChange` = `backEnd`)? If not, explain how you're representing "Year 1 opening balance" in our schema, since that determines how the reset has to work. Show me exactly which Firestore collections/documents the reset touches, and which `backReset` team-count preset (of the 10 in the sheet) matches our session configuration.

---

## 3. KPI calculation audit — exact formulas to check against

All formulas below are transcribed directly from `backEnd` (rows 138–283), using the workbook's own named ranges so Antigravity can search the Excel file itself to verify.

### Income statement build-up
| Line | Formula |
|---|---|
| Total Revenue | `endFinTotalRevenue = endSales` (sum of per-product sales, each posted via the journal) |
| Gross Profit (per product) | `endFinProdXGP = endFinProdXRevenue - endFinProdXCOGS` |
| Net Profit | `endFinNetProfit = endFinEbt - endFinTax` |

### Margin & efficiency ratios
| KPI | Formula | Notes |
|---|---|---|
| GP Margin (per product) | `Product GP / Product Revenue` | |
| GP Margin (total) | `endFinTotalGP / endFinTotalRevenue` | |
| NP Margin | `endFinNetProfit / endFinTotalRevenue` | |
| Fixed Asset Turnover (FATO) | `endFinTotalRevenue / endFinNCA` | |
| Working Capital Turnover (WCTO) | `endFinTotalRevenue / (endFinCA - endFinCL)` | |
| Asset Turnover (ATO) | `endFinTotalRevenue / endFinTotalAssets` | |

### Working capital ratios
| KPI | Formula | Notes |
|---|---|---|
| Avg Debtor Days | `((endFinDebtors / endFinTotalRevenue) * 365) / 3` | **The `/3` matters** — treats each simulated period as one quarter of a year before annualising. If the app's periods aren't quarterly, this divisor needs to change accordingly. |
| Avg Creditor Days | `(((endFinAP + endFinAP2) / endFinTotalCOGS) * 365) / 3` | Same `/3` quarter convention. |

### Leverage & coverage ratios
| KPI | Formula |
|---|---|
| Debt/Equity | `endFinNCL / endFinEquity` |
| Debt/Total Capital | `endFinNCL / endFinTotalEquityLiabilities` |
| Interest Coverage | `IFERROR((endFinEbt + endFinInterest) / endFinInterest, 0)` — has a divide-by-zero guard, returns 0 if no interest |

### Returns
| KPI | Formula |
|---|---|
| RONA (Return on Net Assets) | `endFinNetProfit / (endFinNCA + (endFinCA - endFinCL))` |
| ROE (Return on Equity) | `endFinNetProfit / endFinEquity` |

### Balance sheet integrity
| Line | Formula |
|---|---|
| Total Assets | `endFinNCA + endFinInvestments + endFinCA` |
| Total Equity & Liabilities | `endFinEquity + endFinLiabilities` |
| Balance check (should always = 0) | `(endFinEquity + endFinLiabilities) - (endFinNCA + endFinDebtors + endFinInventory + endFinInvestments)` |

### Roll-forward dependencies (period sequencing — easy to get wrong)
| Line | Formula | Why it matters |
|---|---|---|
| Retained Earnings | `endFinEarnings = startFinNetProfit + startFinEarnings` | Pulls from the **prior period's** net profit and prior retained earnings, not a recalculation. If period order is wrong, retained earnings drifts permanently. |
| Opening Cash (this period) | `endFinCStart = startFinCashBal` | Must equal prior period's closing cash exactly. |
| Closing Cash | `endFinCashBal = SUM(endFinCashFlow, endFinCStart)`, where `endFinCashFlow = endFinCashOperations + endFinCashInvesting + endFinCashFinancing` | Standard indirect-method cash flow statement. |
| Change in Inventory (operating CF) | `(endFinInventory - startFinInventory) * -1` | |
| Change in Debtors (operating CF) | `(endFinDebtors - startFinDebtors) * -1` | |
| Change in Creditors (operating CF) | `(endFinAP - startFinAP) * -1` | |

**Prompt block for Antigravity:**

> Audit every financial KPI calculated in the app against the formulas below (extracted directly from `backEnd` in the attached Excel model). For each one, show me the exact formula currently implemented in code, with file/line references, then output a table: **KPI | code formula | Excel formula | match (yes/no) | notes**.
>
> [paste the tables above]
>
> Pay specific attention to:
> 1. Whether Avg Debtor Days and Avg Creditor Days divide by 3 (quarter-period annualisation) — and whether that divisor is even correct for how our app defines a "period."
> 2. Whether Retained Earnings is calculated as prior-period net profit + prior-period retained earnings (a roll-forward), rather than recalculated fresh each period.
> 3. Whether Opening Cash for period N exactly equals Closing Cash for period N−1 — any mismatch here means a transaction is being double counted or dropped.
> 4. Whether Interest Coverage has a divide-by-zero guard (Excel uses `IFERROR(..., 0)`).
> 5. Run the balance sheet integrity check — Equity + Liabilities − (NCA + Debtors + Inventory + Investments) — and confirm it nets to zero for every team, every period, in test data. If it doesn't, that's the single highest-priority bug to find, since it means something is being posted to the wrong account or double-counted somewhere upstream.
>
> Don't just report "verified correct" — show your working for each KPI so I can sanity-check it against the spreadsheet myself.

---

## 4. Underlying calculation chain (revenue, COGS, market mechanics) — for context, not immediate action

This section is here so you have the full picture if you want Antigravity to go deeper later; it's not required for the two requests above.

- **Units sold** (`calcProd1Units` etc., in `backCalculations`): in Participant mode, `MIN(decisionForecast * whatIfMultiplier, openingStock)`; in facilitator/auto mode, `MIN(marketShare * marketDemand, openingStock)`. Either way, units sold is capped by available stock.
- **Market share** (`backModel`): a multi-factor competitive model — each driver (price vs competition, advertising, features, CSAT, etc.) is standardised via `STDEVP` (population standard deviation) across all teams, then weighted by a driver rating pulled from a tools/config table (`tlsDriver1`), and summed to produce each product's market share. This is genuinely complex (z-score-style relative scoring across competing teams) and worth a dedicated audit pass on its own if you ever see market share numbers that look wrong — it's the part of the model most likely to behave unexpectedly because it's relative, not absolute.
- **Sales/COGS/Opex movement**: every period, transactions post to `backTxrs` tagged with a chart-of-accounts code (e.g. `40-0-01` = Sales: Product 1, `50-0-01` = COGS: Product 1), and `backChange` sums them per account via `SUMIF`. This is the journal-entry pattern referenced in Section 1 — if your app's revenue/COGS aren't built this way, that's worth understanding before trusting period-over-period KPI trends.

If you want, I can pull the full driver-weighting table and `tlsDriver1` ratings next so Antigravity can audit market share too — but that's a separate, meatier task from the reset + KPI work above.
