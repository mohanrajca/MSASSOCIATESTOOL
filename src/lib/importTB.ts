import { v4 as uuid } from "uuid";
import { LedgerRow } from "./types";
import { suggestGroupKey, suggestFromTallyGroup } from "./classify";

const HEADER_ALIASES: Record<string, string[]> = {
  glCode: ["gl code", "code", "ledger code", "a/c code"],
  name: ["ledger name", "gl name", "name", "particulars", "ledger", "account name"],
  cyDebit: ["cy debit", "current year debit", "debit", "current debit", "closing debit"],
  cyCredit: ["cy credit", "current year credit", "credit", "current credit", "closing credit"],
  pyDebit: ["py debit", "previous year debit", "prior year debit", "opening debit"],
  pyCredit: ["py credit", "previous year credit", "prior year credit", "opening credit"],
  tallyGroup: ["group", "tally group", "parent group", "under"],
  narration: ["narration", "remarks", "notes"],
};

function detectDelimiter(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(",")) return ",";
  return /\s{2,}/.test(line) ? /\s{2,}/.source : "\t";
}

function parseNumber(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[,₹\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export interface ParsedTBRow {
  glCode: string;
  name: string;
  cyDebit: number;
  cyCredit: number;
  pyDebit: number;
  pyCredit: number;
  tallyGroup?: string;
  narration: string;
  suggestedGroupKey: string | null;
}

export interface ParseResult {
  rows: ParsedTBRow[];
  hasHeader: boolean;
}

export function parsePastedTB(text: string): ParseResult {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) return { rows: [], hasHeader: false };

  const delim = detectDelimiter(rawLines[0]);
  const splitLine = (line: string) => (delim.length > 1 ? line.split(new RegExp(delim)) : line.split(delim)).map((c) => c.trim());

  const headerRow = splitLine(rawLines[0]).map((h) => h.toLowerCase());
  let colIndex: Record<string, number> = {};
  let hasHeader = false;

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = headerRow.findIndex((h) => aliases.includes(h));
    if (idx >= 0) {
      colIndex[field] = idx;
      hasHeader = true;
    }
  }

  const dataLines = hasHeader ? rawLines.slice(1) : rawLines;

  if (!hasHeader) {
    // No recognisable header: infer the column layout from how many columns
    // are present, since a GL Code column shifts everything by one.
    const colCount = splitLine(rawLines[0]).length;
    if (colCount >= 7) {
      // GL Code, Name, CY Debit, CY Credit, PY Debit, PY Credit, Narration
      colIndex = { glCode: 0, name: 1, cyDebit: 2, cyCredit: 3, pyDebit: 4, pyCredit: 5, narration: 6 };
    } else if (colCount === 6) {
      // GL Code, Name, CY Debit, CY Credit, PY Debit, PY Credit
      colIndex = { glCode: 0, name: 1, cyDebit: 2, cyCredit: 3, pyDebit: 4, pyCredit: 5 };
    } else {
      // Name, CY Debit, CY Credit, PY Debit, PY Credit
      colIndex = { name: 0, cyDebit: 1, cyCredit: 2, pyDebit: 3, pyCredit: 4 };
    }
  }

  const rows: ParsedTBRow[] = [];
  for (const line of dataLines) {
    const cells = splitLine(line);
    const name = colIndex.name !== undefined ? cells[colIndex.name] ?? "" : "";
    if (!name) continue;
    const glCode = colIndex.glCode !== undefined ? cells[colIndex.glCode] ?? "" : "";
    const cyDebit = parseNumber(colIndex.cyDebit !== undefined ? cells[colIndex.cyDebit] : undefined);
    const cyCredit = parseNumber(colIndex.cyCredit !== undefined ? cells[colIndex.cyCredit] : undefined);
    const pyDebit = parseNumber(colIndex.pyDebit !== undefined ? cells[colIndex.pyDebit] : undefined);
    const pyCredit = parseNumber(colIndex.pyCredit !== undefined ? cells[colIndex.pyCredit] : undefined);
    const tallyGroup = colIndex.tallyGroup !== undefined ? cells[colIndex.tallyGroup] : undefined;
    const narration = colIndex.narration !== undefined ? cells[colIndex.narration] ?? "" : "";

    const suggestedGroupKey = suggestFromTallyGroup(tallyGroup) ?? suggestGroupKey(name);

    rows.push({ glCode, name, cyDebit, cyCredit, pyDebit, pyCredit, tallyGroup, narration, suggestedGroupKey });
  }
  return { rows, hasHeader };
}

export function toLedgerRows(entityId: string, parsed: ParsedTBRow[], startOrder: number): LedgerRow[] {
  return parsed.map((p, i) => ({
    id: uuid(),
    entityId,
    glCode: p.glCode,
    name: p.name,
    groupKey: p.suggestedGroupKey,
    cyDebit: p.cyDebit,
    cyCredit: p.cyCredit,
    pyDebit: p.pyDebit,
    pyCredit: p.pyCredit,
    narration: p.narration,
    order: startOrder + i,
  }));
}
