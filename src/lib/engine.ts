import { Entity, LedgerRow, Period } from "./types";
import { ScheduleGroup, SECTIONS, getGroup, groupsForEntity } from "./schema";

export function netAmount(row: LedgerRow, period: Period): number {
  return period === "CY" ? row.cyDebit - row.cyCredit : row.pyDebit - row.pyCredit;
}

/** Positive value = the "natural" balance the statement should display. */
export function isCreditNature(side: ScheduleGroup["side"]): boolean {
  return side === "EquityLiability" || side === "Income";
}

export function displayAmount(row: LedgerRow, period: Period, side: ScheduleGroup["side"]): number {
  const net = netAmount(row, period);
  return isCreditNature(side) ? -net : net;
}

export function groupRows(rows: LedgerRow[], groupKey: string): LedgerRow[] {
  return rows.filter((r) => r.groupKey === groupKey);
}

export function groupTotal(rows: LedgerRow[], groupKey: string, period: Period): number {
  const group = getGroup(groupKey);
  if (!group) return 0;
  return groupRows(rows, groupKey).reduce((sum, r) => sum + displayAmount(r, period, group.side), 0);
}

export interface StatementLine {
  key: string;
  label: string;
  noteNo: number | null;
  cy: number;
  py: number;
}

export interface StatementSection {
  title: string;
  lines: StatementLine[];
  subtotalCy: number;
  subtotalPy: number;
}

export interface NoteSchedule {
  noteNo: number;
  groupKey: string;
  title: string;
  statement: "BS" | "PL";
  lines: Array<{ name: string; glCode: string; cy: number; py: number }>;
  totalCy: number;
  totalPy: number;
}

/** Assigns sequential note numbers to groups that have data, in face-order (BS then PL). */
export function assignNoteNumbers(entity: Entity, rows: LedgerRow[]): Map<string, number> {
  const groups = groupsForEntity(entity.entityType)
    .filter((g) => g.hasNote)
    .slice()
    .sort((a, b) => a.order - b.order);
  const map = new Map<string, number>();
  let n = 1;
  for (const g of groups) {
    const used = groupRows(rows, g.key).length > 0;
    if (used || entity.showZeroLines) {
      map.set(g.key, n);
      n += 1;
    }
  }
  return map;
}

function buildLine(
  entity: Entity,
  rows: LedgerRow[],
  group: ScheduleGroup,
  noteNumbers: Map<string, number>
): StatementLine | null {
  const cy = groupTotal(rows, group.key, "CY");
  const py = groupTotal(rows, group.key, "PY");
  const used = groupRows(rows, group.key).length > 0;
  if (!used && !entity.showZeroLines) return null;
  return {
    key: group.key,
    label: group.label,
    noteNo: noteNumbers.get(group.key) ?? null,
    cy,
    py,
  };
}

function sumLines(lines: StatementLine[]) {
  return {
    subtotalCy: lines.reduce((s, l) => s + l.cy, 0),
    subtotalPy: lines.reduce((s, l) => s + l.py, 0),
  };
}

export interface BalanceSheetResult {
  equityLiabSections: StatementSection[];
  totalEquityLiabCy: number;
  totalEquityLiabPy: number;
  assetSections: StatementSection[];
  totalAssetsCy: number;
  totalAssetsPy: number;
  mismatchCy: number;
  mismatchPy: number;
}

export function buildBalanceSheet(entity: Entity, rows: LedgerRow[]): BalanceSheetResult {
  const noteNumbers = assignNoteNumbers(entity, rows);
  const groups = groupsForEntity(entity.entityType).filter((g) => g.statement === "BS");

  function sectionFor(sectionTitle: string): StatementSection {
    const lines = groups
      .filter((g) => g.section === sectionTitle)
      .sort((a, b) => a.order - b.order)
      .map((g) => buildLine(entity, rows, g, noteNumbers))
      .filter((l): l is StatementLine => l !== null);
    const { subtotalCy, subtotalPy } = sumLines(lines);
    return { title: sectionTitle, lines, subtotalCy, subtotalPy };
  }

  const equityLiabSections = [
    sectionFor(SECTIONS.OWNERS_FUND),
    sectionFor(SECTIONS.NON_CURRENT_LIAB),
    sectionFor(SECTIONS.CURRENT_LIAB),
  ];
  const assetSections = [sectionFor(SECTIONS.NON_CURRENT_ASSETS), sectionFor(SECTIONS.CURRENT_ASSETS)];

  const totalEquityLiabCy = equityLiabSections.reduce((s, sec) => s + sec.subtotalCy, 0);
  const totalEquityLiabPy = equityLiabSections.reduce((s, sec) => s + sec.subtotalPy, 0);
  const totalAssetsCy = assetSections.reduce((s, sec) => s + sec.subtotalCy, 0);
  const totalAssetsPy = assetSections.reduce((s, sec) => s + sec.subtotalPy, 0);

  return {
    equityLiabSections,
    totalEquityLiabCy,
    totalEquityLiabPy,
    assetSections,
    totalAssetsCy,
    totalAssetsPy,
    mismatchCy: totalEquityLiabCy - totalAssetsCy,
    mismatchPy: totalEquityLiabPy - totalAssetsPy,
  };
}

export interface ProfitLossResult {
  incomeLines: StatementLine[];
  totalIncomeCy: number;
  totalIncomePy: number;
  expenseLines: StatementLine[];
  totalExpenseCy: number;
  totalExpensePy: number;
  profitBeforeRemunerationTaxCy: number;
  profitBeforeRemunerationTaxPy: number;
  remunerationCy: number;
  remunerationPy: number;
  profitBeforeTaxCy: number;
  profitBeforeTaxPy: number;
  currentTaxCy: number;
  currentTaxPy: number;
  deferredTaxCy: number;
  deferredTaxPy: number;
  profitForYearCy: number;
  profitForYearPy: number;
}

export function buildProfitLoss(entity: Entity, rows: LedgerRow[]): ProfitLossResult {
  const noteNumbers = assignNoteNumbers(entity, rows);
  const groups = groupsForEntity(entity.entityType).filter((g) => g.statement === "PL");

  const incomeLines = groups
    .filter((g) => g.section === SECTIONS.INCOME)
    .sort((a, b) => a.order - b.order)
    .map((g) => buildLine(entity, rows, g, noteNumbers))
    .filter((l): l is StatementLine => l !== null);

  const expenseLines = groups
    .filter((g) => g.section === SECTIONS.EXPENSES)
    .sort((a, b) => a.order - b.order)
    .map((g) => buildLine(entity, rows, g, noteNumbers))
    .filter((l): l is StatementLine => l !== null);

  const { subtotalCy: totalIncomeCy, subtotalPy: totalIncomePy } = sumLines(incomeLines);
  const { subtotalCy: totalExpenseCy, subtotalPy: totalExpensePy } = sumLines(expenseLines);

  const profitBeforeRemunerationTaxCy = totalIncomeCy - totalExpenseCy;
  const profitBeforeRemunerationTaxPy = totalIncomePy - totalExpensePy;

  const remunerationCy = entity.showPartnersRemuneration ? groupTotal(rows, "partners_remuneration", "CY") : 0;
  const remunerationPy = entity.showPartnersRemuneration ? groupTotal(rows, "partners_remuneration", "PY") : 0;

  const profitBeforeTaxCy = profitBeforeRemunerationTaxCy - remunerationCy;
  const profitBeforeTaxPy = profitBeforeRemunerationTaxPy - remunerationPy;

  const currentTaxCy = entity.hasOwnTaxLiability ? groupTotal(rows, "current_tax", "CY") : 0;
  const currentTaxPy = entity.hasOwnTaxLiability ? groupTotal(rows, "current_tax", "PY") : 0;
  const deferredTaxCy = entity.hasOwnTaxLiability ? groupTotal(rows, "deferred_tax_pl", "CY") : 0;
  const deferredTaxPy = entity.hasOwnTaxLiability ? groupTotal(rows, "deferred_tax_pl", "PY") : 0;

  const profitForYearCy = profitBeforeTaxCy - currentTaxCy - deferredTaxCy;
  const profitForYearPy = profitBeforeTaxPy - currentTaxPy - deferredTaxPy;

  return {
    incomeLines,
    totalIncomeCy,
    totalIncomePy,
    expenseLines,
    totalExpenseCy,
    totalExpensePy,
    profitBeforeRemunerationTaxCy,
    profitBeforeRemunerationTaxPy,
    remunerationCy,
    remunerationPy,
    profitBeforeTaxCy,
    profitBeforeTaxPy,
    currentTaxCy,
    currentTaxPy,
    deferredTaxCy,
    deferredTaxPy,
    profitForYearCy,
    profitForYearPy,
  };
}

export function buildNotes(entity: Entity, rows: LedgerRow[]): NoteSchedule[] {
  const noteNumbers = assignNoteNumbers(entity, rows);
  const groups = groupsForEntity(entity.entityType).filter((g) => g.hasNote && noteNumbers.has(g.key));

  return groups
    .sort((a, b) => (noteNumbers.get(a.key) ?? 0) - (noteNumbers.get(b.key) ?? 0))
    .map((g) => {
      const glRows = groupRows(rows, g.key).slice().sort((a, b) => a.order - b.order);
      const lines = glRows.map((r) => ({
        name: r.name,
        glCode: r.glCode,
        cy: displayAmount(r, "CY", g.side),
        py: displayAmount(r, "PY", g.side),
      }));
      return {
        noteNo: noteNumbers.get(g.key) as number,
        groupKey: g.key,
        title: g.label,
        statement: g.statement,
        lines,
        totalCy: lines.reduce((s, l) => s + l.cy, 0),
        totalPy: lines.reduce((s, l) => s + l.py, 0),
      };
    });
}
