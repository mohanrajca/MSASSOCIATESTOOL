import ExcelJS from "exceljs";
import { Entity, LedgerRow, PolicyNote } from "./types";
import { buildBalanceSheet, buildProfitLoss, buildNotes } from "./engine";
import { getGroup } from "./schema";
import { formatDate, roundedValue, roundingSuffix } from "./format";
import { ENTITY_TYPE_LABELS } from "./schema";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
}

export async function exportEntityToXlsx(entity: Entity, rows: LedgerRow[], policies: PolicyNote[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ICAI Financial Statement Preparation Tool";
  wb.created = new Date();

  // ---- Trial Balance ----
  const tbSheet = wb.addWorksheet("Trial Balance");
  tbSheet.columns = [
    { header: "GL Code", key: "glCode", width: 12 },
    { header: "Ledger Name", key: "name", width: 35 },
    { header: "Schedule Head", key: "group", width: 40 },
    { header: "CY Debit", key: "cyDebit", width: 15 },
    { header: "CY Credit", key: "cyCredit", width: 15 },
    { header: "PY Debit", key: "pyDebit", width: 15 },
    { header: "PY Credit", key: "pyCredit", width: 15 },
  ];
  styleHeader(tbSheet.getRow(1));
  rows
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((r) => {
      tbSheet.addRow({
        glCode: r.glCode,
        name: r.name,
        group: getGroup(r.groupKey ?? undefined)?.label ?? "(unclassified)",
        cyDebit: r.cyDebit || null,
        cyCredit: r.cyCredit || null,
        pyDebit: r.pyDebit || null,
        pyCredit: r.pyCredit || null,
      });
    });
  const tbTotalRow = tbSheet.addRow({
    name: "TOTAL",
    cyDebit: { formula: `SUM(D2:D${rows.length + 1})` },
    cyCredit: { formula: `SUM(E2:E${rows.length + 1})` },
    pyDebit: { formula: `SUM(F2:F${rows.length + 1})` },
    pyCredit: { formula: `SUM(G2:G${rows.length + 1})` },
  });
  tbTotalRow.font = { bold: true };

  // ---- Balance Sheet ----
  const bs = buildBalanceSheet(entity, rows);
  const bsSheet = wb.addWorksheet("Balance Sheet");
  bsSheet.columns = [
    { header: "", key: "label", width: 55 },
    { header: "Note", key: "note", width: 8 },
    { header: `As at ${formatDate(entity.fyEnd)}`, key: "cy", width: 18 },
    { header: `As at ${formatDate(entity.pyEnd)}`, key: "py", width: 18 },
  ];
  bsSheet.addRow({ label: entity.name });
  bsSheet.addRow({ label: "Balance Sheet" });
  bsSheet.addRow({ label: `(₹ ${roundingSuffix(entity)})` });
  bsSheet.addRow({});
  styleHeader(bsSheet.addRow({ label: "Particulars", note: "Note", cy: "Current Year", py: "Previous Year" }));
  bsSheet.addRow({ label: "I. EQUITY AND LIABILITIES" }).font = { bold: true };
  for (const section of bs.equityLiabSections) {
    if (section.lines.length === 0) continue;
    bsSheet.addRow({ label: section.title }).font = { italic: true };
    for (const line of section.lines) {
      bsSheet.addRow({
        label: `  ${line.label}`,
        note: line.noteNo ?? "",
        cy: roundedValue(line.cy, entity),
        py: roundedValue(line.py, entity),
      });
    }
    const subtotal = bsSheet.addRow({
      label: `Total ${section.title}`,
      cy: roundedValue(section.subtotalCy, entity),
      py: roundedValue(section.subtotalPy, entity),
    });
    subtotal.font = { bold: true };
  }
  const totalEL = bsSheet.addRow({
    label: "TOTAL EQUITY AND LIABILITIES",
    cy: roundedValue(bs.totalEquityLiabCy, entity),
    py: roundedValue(bs.totalEquityLiabPy, entity),
  });
  totalEL.font = { bold: true };
  bsSheet.addRow({});
  bsSheet.addRow({ label: "II. ASSETS" }).font = { bold: true };
  for (const section of bs.assetSections) {
    if (section.lines.length === 0) continue;
    bsSheet.addRow({ label: section.title }).font = { italic: true };
    for (const line of section.lines) {
      bsSheet.addRow({
        label: `  ${line.label}`,
        note: line.noteNo ?? "",
        cy: roundedValue(line.cy, entity),
        py: roundedValue(line.py, entity),
      });
    }
    const subtotal = bsSheet.addRow({
      label: `Total ${section.title}`,
      cy: roundedValue(section.subtotalCy, entity),
      py: roundedValue(section.subtotalPy, entity),
    });
    subtotal.font = { bold: true };
  }
  const totalAssets = bsSheet.addRow({
    label: "TOTAL ASSETS",
    cy: roundedValue(bs.totalAssetsCy, entity),
    py: roundedValue(bs.totalAssetsPy, entity),
  });
  totalAssets.font = { bold: true };

  // ---- Profit & Loss ----
  const pl = buildProfitLoss(entity, rows);
  const plSheet = wb.addWorksheet("Profit and Loss");
  plSheet.columns = [
    { header: "", key: "label", width: 55 },
    { header: "Note", key: "note", width: 8 },
    { header: `Year ended ${formatDate(entity.fyEnd)}`, key: "cy", width: 18 },
    { header: `Year ended ${formatDate(entity.pyEnd)}`, key: "py", width: 18 },
  ];
  plSheet.addRow({ label: entity.name });
  plSheet.addRow({ label: "Statement of Profit and Loss" });
  plSheet.addRow({ label: `(₹ ${roundingSuffix(entity)})` });
  plSheet.addRow({});
  styleHeader(plSheet.addRow({ label: "Particulars", note: "Note", cy: "Current Year", py: "Previous Year" }));
  plSheet.addRow({ label: "INCOME" }).font = { bold: true };
  for (const line of pl.incomeLines) {
    plSheet.addRow({ label: `  ${line.label}`, note: line.noteNo ?? "", cy: roundedValue(line.cy, entity), py: roundedValue(line.py, entity) });
  }
  plSheet.addRow({ label: "Total Income", cy: roundedValue(pl.totalIncomeCy, entity), py: roundedValue(pl.totalIncomePy, entity) }).font = { bold: true };
  plSheet.addRow({});
  plSheet.addRow({ label: "EXPENSES" }).font = { bold: true };
  for (const line of pl.expenseLines) {
    plSheet.addRow({ label: `  ${line.label}`, note: line.noteNo ?? "", cy: roundedValue(line.cy, entity), py: roundedValue(line.py, entity) });
  }
  plSheet.addRow({ label: "Total Expenses", cy: roundedValue(pl.totalExpenseCy, entity), py: roundedValue(pl.totalExpensePy, entity) }).font = { bold: true };
  plSheet.addRow({});
  const beforeLabel = entity.showPartnersRemuneration ? "Profit before partners' remuneration and tax" : "Profit before tax";
  plSheet.addRow({ label: beforeLabel, cy: roundedValue(pl.profitBeforeRemunerationTaxCy, entity), py: roundedValue(pl.profitBeforeRemunerationTaxPy, entity) }).font = { bold: true };
  if (entity.showPartnersRemuneration) {
    plSheet.addRow({ label: "Less: Remuneration and interest to partners", cy: roundedValue(pl.remunerationCy, entity), py: roundedValue(pl.remunerationPy, entity) });
    plSheet.addRow({ label: "Profit before tax", cy: roundedValue(pl.profitBeforeTaxCy, entity), py: roundedValue(pl.profitBeforeTaxPy, entity) }).font = { bold: true };
  }
  if (entity.hasOwnTaxLiability) {
    plSheet.addRow({});
    plSheet.addRow({ label: "TAX EXPENSE" }).font = { bold: true };
    plSheet.addRow({ label: "  Current tax", cy: roundedValue(pl.currentTaxCy, entity), py: roundedValue(pl.currentTaxPy, entity) });
    plSheet.addRow({ label: "  Deferred tax", cy: roundedValue(pl.deferredTaxCy, entity), py: roundedValue(pl.deferredTaxPy, entity) });
  }
  plSheet.addRow({});
  plSheet.addRow({ label: "PROFIT FOR THE YEAR", cy: roundedValue(pl.profitForYearCy, entity), py: roundedValue(pl.profitForYearPy, entity) }).font = { bold: true };

  // ---- Notes to Accounts ----
  const notes = buildNotes(entity, rows);
  const notesSheet = wb.addWorksheet("Notes to Accounts");
  notesSheet.columns = [
    { header: "", key: "label", width: 55 },
    { header: "", key: "cy", width: 18 },
    { header: "", key: "py", width: 18 },
  ];

  let noteIdx = 1;
  for (const p of policies.filter((p) => p.included)) {
    notesSheet.addRow({ label: `Note ${noteIdx}: ${p.title}` }).font = { bold: true };
    notesSheet.addRow({ label: p.body });
    notesSheet.addRow({});
    noteIdx += 1;
  }
  for (const note of notes) {
    notesSheet.addRow({ label: `Note ${note.noteNo}: ${note.title}`, cy: `As at ${formatDate(entity.fyEnd)}`, py: `As at ${formatDate(entity.pyEnd)}` }).font = { bold: true };
    for (const line of note.lines) {
      notesSheet.addRow({ label: `  ${line.name}`, cy: roundedValue(line.cy, entity), py: roundedValue(line.py, entity) });
    }
    notesSheet.addRow({ label: "Total", cy: roundedValue(note.totalCy, entity), py: roundedValue(note.totalPy, entity) }).font = { bold: true };
    notesSheet.addRow({});
  }

  // ---- Cover / Basic details ----
  const coverSheet = wb.addWorksheet("Basic Details", { views: [{ showGridLines: false }] });
  coverSheet.columns = [{ key: "k", width: 30 }, { key: "v", width: 50 }];
  const details: Array<[string, string]> = [
    ["Entity Name", entity.name],
    ["Entity Type", ENTITY_TYPE_LABELS[entity.entityType]],
    ["PAN", entity.pan],
    ["Address", entity.address],
    ["Nature of Business", entity.natureOfBusiness],
    ["Financial Year Ended", formatDate(entity.fyEnd)],
    ["Previous Year Ended", formatDate(entity.pyEnd)],
    ["Rounding", roundingSuffix(entity)],
  ];
  details.forEach(([k, v]) => coverSheet.addRow({ k, v }));

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
