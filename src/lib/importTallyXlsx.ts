import ExcelJS from "exceljs";
import { suggestGroupKeyCombined } from "./classify";
import { ParsedTBRow } from "./importTB";

interface ColumnPair {
  debitCol: number;
  creditCol: number;
}

interface RawRow {
  name: string;
  indent: number;
  cyDebit: number;
  cyCredit: number;
  pyDebit: number;
  pyCredit: number;
}

export interface TallyImportResult {
  rows: ParsedTBRow[];
  warnings: string[];
}

function isLabel(value: unknown, label: string): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === label;
}

function toNumber(value: ExcelJS.CellValue): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    if ("result" in value && typeof (value as { result?: unknown }).result === "number") {
      return (value as { result: number }).result;
    }
    if ("text" in value) {
      const n = parseFloat(String((value as { text?: unknown }).text).replace(/,/g, ""));
      return Number.isFinite(n) ? n : 0;
    }
  }
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[,₹\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "richText" in value) {
    return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("").trim();
  }
  if (typeof value === "object" && "text" in value) {
    return String((value as { text?: unknown }).text ?? "").trim();
  }
  return String(value).trim();
}

/**
 * Parses a Tally Prime / Tally ERP "Trial Balance" export, which lists
 * Groups and Ledgers in a single indented column (Group subtotals are
 * rollups of the Ledgers nested beneath them, distinguished only by cell
 * indent level - there is no separate "type" column). Only the leaf rows
 * (rows with no further-indented rows beneath them) are real ledger
 * balances; group rows are skipped, but their name is kept as the "Tally
 * Group" hint for classifying their children.
 */
export async function parseTallyXlsxFile(file: File): Promise<TallyImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const warnings: string[] = [];

  if (!sheet) {
    return { rows: [], warnings: ["The uploaded file has no worksheets."] };
  }

  // Locate every Debit/Credit column pair by scanning the top of the sheet
  // (Tally repeats "Debit"/"Credit" once per period column for comparative
  // trial balances).
  const pairs: ColumnPair[] = [];
  let headerRow = 0;
  const scanLimit = Math.min(sheet.rowCount, 40);
  for (let r = 1; r <= scanLimit; r++) {
    const row = sheet.getRow(r);
    const lastCol = Math.max(row.cellCount, 20);
    for (let c = 1; c <= lastCol; c++) {
      if (isLabel(row.getCell(c).value, "debit") && isLabel(row.getCell(c + 1).value, "credit")) {
        pairs.push({ debitCol: c, creditCol: c + 1 });
        headerRow = Math.max(headerRow, r);
      }
    }
  }

  if (pairs.length === 0) {
    warnings.push('Could not find "Debit"/"Credit" column headers; assumed columns B and C.');
    pairs.push({ debitCol: 2, creditCol: 3 });
    headerRow = 1;
  }

  pairs.sort((a, b) => a.debitCol - b.debitCol);
  const cyPair = pairs[pairs.length - 1];
  const pyPair = pairs.length > 1 ? pairs[pairs.length - 2] : null;
  const nameCol = Math.max(1, cyPair.debitCol - 1);
  if (!pyPair) {
    warnings.push("Only one period of figures was found in this file; previous year columns were left blank.");
  }

  const rawRows: RawRow[] = [];
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const nameCell = row.getCell(nameCol);
    const name = cellText(nameCell.value);
    if (!name) continue;
    if (/^grand\s*total$/i.test(name)) break;

    rawRows.push({
      name,
      indent: nameCell.alignment?.indent ?? 0,
      cyDebit: toNumber(row.getCell(cyPair.debitCol).value),
      cyCredit: toNumber(row.getCell(cyPair.creditCol).value),
      pyDebit: pyPair ? toNumber(row.getCell(pyPair.debitCol).value) : 0,
      pyCredit: pyPair ? toNumber(row.getCell(pyPair.creditCol).value) : 0,
    });
  }

  if (rawRows.length === 0) {
    warnings.push("No data rows were found below the header row.");
    return { rows: [], warnings };
  }

  const rows = flattenTallyTree(rawRows).map((leaf) => ({
    glCode: "",
    name: leaf.name,
    cyDebit: leaf.cyDebit,
    cyCredit: leaf.cyCredit,
    pyDebit: leaf.pyDebit,
    pyCredit: leaf.pyCredit,
    tallyGroup: leaf.tallyGroup,
    narration: "",
    suggestedGroupKey: suggestGroupKeyCombined(leaf.name, leaf.tallyGroup),
  }));

  return { rows, warnings };
}

interface LeafRow extends RawRow {
  tallyGroup: string | undefined;
}

function approxEqual(a: number, b: number): boolean {
  const tolerance = Math.max(1, Math.abs(b) * 0.005);
  return Math.abs(a - b) <= tolerance;
}

/**
 * Flattens Tally's indented Group/Ledger tree into leaf ledger rows.
 *
 * Indent alone is not a reliable depth signal here: Tally's export gives
 * sibling ledgers under the very same group slightly different indents
 * (observed: 6, 7 and 8 for plain siblings with no real nesting), so a
 * naive "next row is more indented => I'm a group" check misfires and
 * silently orphans runs of ledgers from their real parent group.
 *
 * The one signal that actually holds is arithmetic: a genuine Group row's
 * amount always equals the sum of the ledgers nested beneath it. So a
 * candidate group is only treated as a real rollup (and excluded from the
 * output) if its children's debit/credit actually sum to its own stated
 * amount; otherwise it's re-classified as an ordinary leaf and its
 * "children" are reprocessed as siblings at the current level instead.
 */
function flattenTallyTree(rows: RawRow[]): LeafRow[] {
  function parseSiblings(start: number, indentFloor: number, parentName: string | undefined): [LeafRow[], number] {
    const result: LeafRow[] = [];
    let i = start;
    while (i < rows.length && rows[i].indent > indentFloor) {
      const node = rows[i];
      const hasDeeperNext = i + 1 < rows.length && rows[i + 1].indent > node.indent;

      if (hasDeeperNext) {
        const [children, nextIndex] = parseSiblings(i + 1, node.indent, node.name);
        const sumCyDebit = children.reduce((s, c) => s + c.cyDebit, 0);
        const sumCyCredit = children.reduce((s, c) => s + c.cyCredit, 0);
        const sumPyDebit = children.reduce((s, c) => s + c.pyDebit, 0);
        const sumPyCredit = children.reduce((s, c) => s + c.pyCredit, 0);
        const isConfirmedRollup =
          approxEqual(sumCyDebit, node.cyDebit) &&
          approxEqual(sumCyCredit, node.cyCredit) &&
          approxEqual(sumPyDebit, node.pyDebit) &&
          approxEqual(sumPyCredit, node.pyCredit);

        if (isConfirmedRollup) {
          result.push(...children);
          i = nextIndex;
          continue;
        }
        // Not a real rollup (indent noise, not a genuine group): keep this
        // row as its own leaf and let the "children" fall through to be
        // reprocessed as siblings at this same level on the next iteration.
      }

      result.push({ ...node, tallyGroup: parentName });
      i += 1;
    }
    return [result, i];
  }

  const [leaves] = parseSiblings(0, -1, undefined);
  return leaves;
}
