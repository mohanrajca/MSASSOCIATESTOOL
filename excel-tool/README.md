# ICAI Financial Statement Tool (Excel version)

A formula-only Excel workbook that prepares Balance Sheet, Profit & Loss and
Notes to Accounts for non-corporate entities (Sole Proprietorship,
Partnership Firm, LLP) as per the ICAI Guidance Note on Financial Statements
of Non-Corporate Entities (Division I) — with an optional VBA add-on for
one-click Tally import.

## Quick start

1. Open **`ICAI_Financial_Statement_Tool.xlsx`**.
2. Go to the **Home** sheet and fill in entity details (name, type, PAN,
   financial year, rounding, etc).
3. Go to the **TB** (Trial Balance) sheet. Paste or type your ledgers:
   `Ledger Name`, `CY Debit`, `CY Credit`, `PY Debit`, `PY Credit`. A `Group`
   is auto-suggested for each row from the ledger name (and an optional
   `Tally Group` hint column); review/override it via the dropdown. Rows
   highlighted amber have no Group yet.
4. **BS**, **PL** and **Notes** sheets update automatically. Check the
   tie-out row at the bottom of BS — a non-zero value means something is
   still unclassified or a genuine data issue (e.g. a Suspense ledger) that
   needs your judgement.

No macros are required for any of this — it's plain formulas, so there's no
"Enable Content" security prompt.

## Optional: one-click Tally import (VBA)

Tally's own Trial Balance export is a Group/Ledger *tree* (subtotals and
ledgers mixed in one indented column), not a flat list, so it needs a bit of
logic to flatten correctly. `Module1.bas` adds a macro that does this for
you directly from the .xlsx Tally exports.

**To install:**
1. Open the workbook, press `Alt+F11` to open the VBA editor.
2. `File → Import File…` and select `Module1.bas`.
3. Save the workbook as a macro-enabled workbook (`.xlsm`).
4. *(Optional)* `Developer` tab → `Insert` → `Button (Form Control)`, draw it
   on the Home sheet, and assign it to `ImportTallyTrialBalance`.

**To use:** run `ImportTallyTrialBalance` (`Alt+F8`), pick the `.xlsx` file
exported from Tally's Trial Balance report, and it fills the TB sheet for
you (clearing existing rows first). `ExportStatementsToPDF` exports the BS,
PL and Notes sheets to a single PDF.

## Important: what's verified vs. what isn't

This was built and tested in a Linux environment with **no Microsoft Excel
available**, so:

- **The formula-only workbook (TB/BS/PL/Notes) is fully verified.** All
  formulas were checked with a formula-evaluation engine against a known
  dataset (confirms the Balance Sheet ties out to the rupee) and against a
  real, messy 350+ ledger Tally export (confirms ~99% auto-classification
  accuracy on real data). This is the part that matters most and it works.
- **`Module1.bas` (the VBA) could not be compiled or run here** — there is
  no way to produce or test a real VBA project without Excel itself. The
  VBA logic is a careful line-by-line translation of the *same* algorithm
  already proven correct in the formula-based version (and in a companion
  web app built in the same session), which gives good confidence, but
  please treat your first Tally import as a test: check a handful of rows
  against the source file before relying on it.
- There's no true custom Ribbon (that also requires Excel/XML tooling this
  environment doesn't have) — navigation is via hyperlink-style text on the
  Home sheet, and VBA actions run from `Alt+F8` or an optional Form Control
  button.

## Known limitations

- Notes show group-level totals only (not itemized ledger-by-ledger
  breakdown) — filter the TB sheet's `Group` column for the itemized detail
  behind any note.
- No Cash Flow Statement, fixed-asset movement schedule, or MSME/non-MSME
  ageing schedule.
- Micro/Small Enterprise (MSME) status for trade payables can't be
  auto-detected from a ledger name — reclassify those specific creditors
  from "...other than micro enterprises..." to "...micro enterprises..."
  manually via the Group dropdown.
- `build_workbook.py` (+ `groups.py`) is the generator script that produced
  the .xlsx — re-run it if you want to regenerate/customise the template
  (e.g. add more keyword rules).
