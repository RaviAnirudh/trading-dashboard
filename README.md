# Trading Dashboard — System Architecture

## Overview

A fully client-side React + TypeScript single-page application. No backend, no server — all data lives in the browser's IndexedDB. CSV files are parsed locally, normalized into a unified trade schema, and rendered across five analytical tabs.

---

## Tech Stack

| Layer | Library | Purpose |
|-------|---------|---------|
| UI Framework | React 18 + TypeScript | Component tree, state |
| Build Tool | Vite + `@tailwindcss/vite` | Dev server, bundling, Tailwind v4 |
| Styling | TailwindCSS v4 | Dark-themed utility classes |
| Charts | Recharts | All data visualizations |
| CSV Parsing | PapaParse | Header detection + row streaming |
| Storage | Dexie.js (IndexedDB) | Persistent trade storage, deduplication |
| ID Generation | uuid v4 | Trade IDs, group IDs |

---

## Directory Structure

```
src/
├── parsers/
│   ├── types.ts          # NormalizedTrade, RawRow, ParseResult interfaces
│   ├── index.ts          # Entry point: platform detection → routes to correct parser
│   ├── topstep.ts        # Topstep CSV parser
│   └── lucid.ts          # Lucid/Tradovate CSV parser
│
├── matching/
│   └── fifo.ts           # FIFO partial fill matching engine
│
├── utils/
│   ├── commissions.ts    # Per-platform, per-symbol commission schedule
│   ├── tickValues.ts     # Tick size/value table for Topstep P&L calculation
│   ├── formatters.ts     # Currency, date, duration formatters + session day logic
│   └── stats.ts          # KPI and chart data computation from trade array
│
├── store/
│   └── tradeStore.ts     # Dexie IndexedDB wrapper (CRUD + deduplication)
│
├── components/
│   ├── KPICards.tsx       # 10 KPI metric cards
│   ├── EquityCurve.tsx    # Cumulative P&L area chart
│   ├── OverviewTab.tsx    # KPIs + equity curve + symbol/platform breakdowns
│   ├── DailyTab.tsx       # Daily P&L bar chart + session table with notes
│   ├── TradeTable.tsx     # Sortable/filterable trade table (individual + grouped)
│   ├── TimeAnalysisTab.tsx# P&L by hour, by day-of-week, duration scatter
│   └── UploadTab.tsx      # Drag-and-drop CSV upload + history + clear
│
├── App.tsx               # Root: tab navigation, global state, day drill-down
├── index.css             # Tailwind import + dark theme base + scrollbar styles
└── main.tsx              # React DOM render entry
```

---

## Data Flow

```
CSV File (user drag-drops)
        │
        ▼
  parseCSVFile()                          [src/parsers/index.ts]
        │
        ├── detectPlatform(headers)       Looks for Topstep or Lucid signature columns
        │
        ├── parseTopstep(rows)            [src/parsers/topstep.ts]
        │       │
        │       ├── Groups rows by Account + Symbol + TradeDay
        │       ├── Detects Long/Short from first Side (Bid=Long, Ask=Short)
        │       └── fifoMatch(openings, closings) → NormalizedTrade[]
        │               │
        │               └── calcCommission('Topstep', symbol, qty)
        │
        └── parseLucid(rows)              [src/parsers/lucid.ts]
                │
                ├── Each row is already a matched buy+sell pair
                ├── Side = Long if boughtAt ≤ soldAt, else Short
                ├── Links partial fills via shared buyFillId / sellFillId
                ├── parsePnl() handles $X, $(X), -$X formats
                └── calcCommission('Lucid', symbol, qty)
                        │
                        ▼
                  NormalizedTrade[]
                        │
                        ▼
              addTrades(trades, seenIds)   [src/store/tradeStore.ts]
                        │
                        ├── Deduplicates by "platform|fillId" in seenIds table
                        └── Inserts new trades into IndexedDB
                                │
                                ▼
                      getAllTrades() on next render
                                │
                                ▼
                        computeKPIs / stats    [src/utils/stats.ts]
                                │
                                ▼
                        React components render
```

---

## Core Data Schema

### `NormalizedTrade`
Every trade from every platform is stored as this single type:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID, primary key |
| `tradeGroupId` | string | UUID linking partial fills of the same position |
| `platform` | string | `'Topstep'` or `'Lucid'` |
| `accountName` | string | Account identifier |
| `symbol` | string | e.g. `MNQ`, `ES`, `MGC` |
| `side` | `'Long'` \| `'Short'` | Direction |
| `qty` | number | Contracts matched in this partial fill |
| `entryPrice` | number | Fill price at open |
| `exitPrice` | number | Fill price at close |
| `pnl` | number | **Net** P&L after commission |
| `entryTime` | Date | Timestamp of entry fill |
| `exitTime` | Date | Timestamp of exit fill |
| `duration` | string | Human-readable hold time (e.g. `4m 32s`) |
| `tradeDay` | string | Session day (`YYYY-MM-DD`) after 6 PM cutoff |
| `orderType` | string | e.g. `Market`, `Limit` |
| `exitReason` | string | e.g. `Manual`, `Stop` |

---

## Key Business Logic

### 1. FIFO Partial Fill Matching (Topstep)
Topstep exports raw order fills, not matched trades. The FIFO engine in `src/matching/fifo.ts` reconstructs trades:

- Maintains a **queue of open units** (price + qty remaining)
- Each closing fill consumes from the front of the queue
- Handles **scale-in** (multiple entries, one exit) and **scale-out** (one entry, multiple exits)
- Each matched slice becomes one `NormalizedTrade` row

### 2. Session Day (6 PM Cutoff)
Futures markets trade nearly 24 hours. A trade at 18:30 on June 11 belongs to the **June 12 session**, not June 11.

```
toSessionDay(date):
  if date.hours >= 18 → assign to date + 1 day
  format as YYYY-MM-DD
```

Applied to `exitTime` in Topstep (FIFO engine) and `entryTime` in Lucid.

### 3. Commission Schedule
Defined in `src/utils/commissions.ts`. Rates are **per contract per side** — multiplied by 2 for round-trip:

| Platform | Micro (MNQ/MES/MYM/MGC\*) | Full (NQ/ES/YM) |
|----------|--------------------------|-----------------|
| Lucid | $0.50/side ($0.80 MGC) | $1.75/side |
| Topstep | $0.25/side ($0.50 MGC) | $0.50/side |

\* MGC = Micro Gold. To update rates, edit `COMMISSION_SCHEDULE` — no other file changes.

### 4. P&L Calculation (Topstep)
Topstep doesn't provide P&L in the CSV — it's computed from prices:

```
ticks = priceDiff / tickSize
pnl   = ticks × tickValue × qty
net   = pnl − commission
```

Tick specs live in `src/utils/tickValues.ts`.

### 5. Deduplication
Re-uploading the same CSV doesn't create duplicate trades. Each fill gets a composite key `"platform|fillId"` stored in the `seenIds` IndexedDB table. On upload, new fill IDs are checked against existing ones and skipped if already present.

---

## IndexedDB Schema (Dexie)

Database name: `TradingDashboard`

| Table | Primary Key | Indexes | Purpose |
|-------|-------------|---------|---------|
| `trades` | `id` | `tradeGroupId, platform, symbol, tradeDay, side, pnl` | All normalized trades |
| `seenIds` | `id` | — | Deduplication registry (`"platform\|fillId"`) |
| `sessionNotes` | `tradeDay` | — | Per-day journal notes (editable in Daily tab) |

---

## Dashboard Tabs

| Tab | Component | Content |
|-----|-----------|---------|
| Overview | `OverviewTab` | 10 KPI cards, equity curve, symbol & platform breakdown tables |
| Daily | `DailyTab` | P&L bar chart (click → drill to Trades), session table with inline notes |
| Trades | `TradeTable` | Full trade list — sortable, filterable, individual or grouped view |
| Time Analysis | `TimeAnalysisTab` | P&L by hour, trade count by hour, P&L by day-of-week, duration scatter |
| Upload | `UploadTab` | Drag-and-drop CSV, upload history, clear-all data |

---

## Adding a New Platform

1. Create `src/parsers/yourplatform.ts` — export `parseYourPlatform(rows)` returning `{ trades, seenIds }`
2. Add its signature headers to `detectPlatform()` in `src/parsers/index.ts`
3. Add commission rates to `COMMISSION_SCHEDULE` in `src/utils/commissions.ts`
4. If it uses raw fills (not pre-matched), use `fifoMatch()` from `src/matching/fifo.ts`
