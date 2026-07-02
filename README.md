# Financial Statement Preparation Tool

A web tool to prepare Balance Sheet, Statement of Profit &amp; Loss and Notes to Accounts
for **non-corporate entities** (Sole Proprietorship, Partnership Firm, LLP) in the format
prescribed by the ICAI **Guidance Note on Financial Statements of Non-Corporate Entities**
(Revised 2024) — Division I (entities to which Ind AS is not applicable).

Enter (or paste) a Trial Balance once, classify each ledger against the standard schedule of
heads, and the Balance Sheet, Profit &amp; Loss, and Notes to Accounts are generated and kept
in sync automatically, with an Excel export for filing/record purposes.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Data is stored locally in the browser (IndexedDB) — nothing is
sent to a server. Use the Excel export on any statement page to keep an external copy.

## How it works

1. **New Entity** — set up entity type (Proprietorship / Partnership / LLP), financial year,
   rounding, and signatory/preparer details.
2. **Trial Balance** — enter ledgers directly, or paste from Excel/Tally (a header row such as
   `Ledger Name, CY Debit, CY Credit, PY Debit, PY Credit` is recommended; a `Group`/`Tally
   Group` column improves auto-classification). Each ledger is assigned a schedule head —
   automatically suggested from the ledger name/Tally group, editable via dropdown.
3. **Balance Sheet / Profit & Loss** — generated automatically from the classified Trial
   Balance, with a running tie-out check.
4. **Notes to Accounts** — auto-generated schedules (ledger-level breakup) for every line item,
   plus editable Significant Accounting Policies text.
5. **Export to Excel** — a multi-sheet workbook (Trial Balance, Balance Sheet, Profit and Loss,
   Notes to Accounts, Basic Details).

## Scope of this version / roadmap

- Supports **non-corporate entities** only (Schedule III for companies is a natural extension
  of the same engine — see `src/lib/schema.ts` — but is not enabled yet).
- Trusts, Societies and AOP/BOI (Income & Expenditure Account format) are not yet supported.
- No Cash Flow Statement, fixed asset movement (additions/disposals) schedule, or trade
  receivables/payables ageing schedule yet.
- No adjustment/regrouping entries layer — adjustments should be reflected directly in the
  Trial Balance figures for now.
- PDF export uses the browser's Print dialog ("Print / PDF" button) rather than a dedicated
  PDF renderer.

## Project structure

- `src/lib/schema.ts` — the schedule of heads (Balance Sheet / P&L groups) per the ICAI
  Guidance Note, and which entity types each applies to.
- `src/lib/classify.ts` — keyword- and Tally-group-based auto-classification of ledger names.
- `src/lib/engine.ts` — aggregates classified Trial Balance rows into Balance Sheet, P&L and
  Notes structures.
- `src/lib/db.ts` / `src/lib/repo.ts` — local persistence (Dexie/IndexedDB) and CRUD helpers.
- `src/lib/exportXlsx.ts` — Excel workbook generation (ExcelJS).
- `src/app/entities/[id]/*` — the entity workspace (Basic Details, Trial Balance, Balance
  Sheet, Profit & Loss, Notes to Accounts).
