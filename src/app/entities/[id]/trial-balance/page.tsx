"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addLedgerRow, bulkAddLedgerRows, deleteLedgerRow, updateLedgerRow } from "@/lib/repo";
import { toLedgerRows } from "@/lib/importTB";
import { suggestGroupKey } from "@/lib/classify";
import GroupSelect from "@/components/GroupSelect";
import PasteImportModal from "@/components/PasteImportModal";
import { LedgerRow } from "@/lib/types";

const cellCls = "w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 rounded";
const numCellCls = cellCls + " text-right tabular-nums";

function fmt(n: number) {
  if (!n) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TrialBalancePage() {
  const params = useParams<{ id: string }>();
  const entityId = params.id;
  const entity = useLiveQuery(() => db.entities.get(entityId), [entityId]);
  const rows = useLiveQuery(() => db.ledgers.where("entityId").equals(entityId).sortBy("order"), [entityId], []);
  const [showImport, setShowImport] = useState(false);

  if (!entity || !rows) return <p className="text-sm text-slate-500">Loading…</p>;

  async function patch(row: LedgerRow, changes: Partial<LedgerRow>) {
    await updateLedgerRow({ ...row, ...changes });
  }

  async function handleAddRow() {
    await addLedgerRow(entityId, rows.length ? rows[rows.length - 1].order + 1 : 0);
  }

  async function handleAutoClassify() {
    const unclassified = rows.filter((r) => !r.groupKey && r.name.trim());
    await Promise.all(
      unclassified.map((r) => {
        const suggestion = suggestGroupKey(r.name);
        return suggestion ? updateLedgerRow({ ...r, groupKey: suggestion }) : Promise.resolve();
      })
    );
  }

  async function handleImport(parsed: Parameters<typeof toLedgerRows>[1]) {
    const startOrder = rows.length ? rows[rows.length - 1].order + 1 : 0;
    const newRows = toLedgerRows(entityId, parsed, startOrder);
    await bulkAddLedgerRows(newRows);
    setShowImport(false);
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.cyDebit += r.cyDebit;
      acc.cyCredit += r.cyCredit;
      acc.pyDebit += r.pyDebit;
      acc.pyCredit += r.pyCredit;
      return acc;
    },
    { cyDebit: 0, cyCredit: 0, pyDebit: 0, pyCredit: 0 }
  );
  const cyDiff = totals.cyDebit - totals.cyCredit;
  const pyDiff = totals.pyDebit - totals.pyCredit;
  const unclassifiedCount = rows.filter((r) => !r.groupKey && r.name.trim()).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 no-print">
        <button onClick={handleAddRow} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          + Add Row
        </button>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Paste / Import
        </button>
        <button
          onClick={handleAutoClassify}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Auto-classify {unclassifiedCount > 0 ? `(${unclassifiedCount} unclassified)` : ""}
        </button>
        <div className="ml-auto flex gap-4 text-xs">
          <span className={cyDiff === 0 ? "text-emerald-600" : "text-red-600"}>
            CY Dr-Cr Diff: {fmt(cyDiff)} {cyDiff === 0 ? "✓ Tallied" : ""}
          </span>
          <span className={pyDiff === 0 ? "text-emerald-600" : "text-red-600"}>
            PY Dr-Cr Diff: {fmt(pyDiff)} {pyDiff === 0 ? "✓ Tallied" : ""}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="p-2 text-left font-medium">GL Code</th>
              <th className="p-2 text-left font-medium">Ledger Name</th>
              <th className="p-2 text-left font-medium">Schedule Head</th>
              <th className="p-2 text-right font-medium">CY Debit</th>
              <th className="p-2 text-right font-medium">CY Credit</th>
              <th className="p-2 text-right font-medium">PY Debit</th>
              <th className="p-2 text-right font-medium">PY Credit</th>
              <th className="w-8 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="w-24">
                  <input className={cellCls} value={row.glCode} onChange={(e) => patch(row, { glCode: e.target.value })} />
                </td>
                <td className="min-w-[200px]">
                  <input
                    className={cellCls}
                    value={row.name}
                    onChange={(e) => patch(row, { name: e.target.value })}
                    onBlur={(e) => {
                      if (!row.groupKey && e.target.value.trim()) {
                        const suggestion = suggestGroupKey(e.target.value);
                        if (suggestion) patch(row, { groupKey: suggestion });
                      }
                    }}
                  />
                </td>
                <td className="min-w-[220px]">
                  <GroupSelect
                    entityType={entity.entityType}
                    value={row.groupKey}
                    onChange={(key) => patch(row, { groupKey: key })}
                    className={cellCls}
                  />
                </td>
                <td className="w-28">
                  <input
                    type="number"
                    step="0.01"
                    className={numCellCls}
                    value={row.cyDebit || ""}
                    onChange={(e) => patch(row, { cyDebit: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="w-28">
                  <input
                    type="number"
                    step="0.01"
                    className={numCellCls}
                    value={row.cyCredit || ""}
                    onChange={(e) => patch(row, { cyCredit: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="w-28">
                  <input
                    type="number"
                    step="0.01"
                    className={numCellCls}
                    value={row.pyDebit || ""}
                    onChange={(e) => patch(row, { pyDebit: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="w-28">
                  <input
                    type="number"
                    step="0.01"
                    className={numCellCls}
                    value={row.pyCredit || ""}
                    onChange={(e) => patch(row, { pyCredit: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="no-print text-center">
                  <button onClick={() => deleteLedgerRow(row.id)} className="text-slate-400 hover:text-red-600" title="Delete row">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-slate-400">
                  No ledgers yet. Click &ldquo;+ Add Row&rdquo; or &ldquo;Paste / Import&rdquo; to get started.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-slate-300 bg-slate-50 font-medium">
            <tr>
              <td colSpan={3} className="p-2 text-right">
                Total
              </td>
              <td className="p-2 text-right tabular-nums">{fmt(totals.cyDebit)}</td>
              <td className="p-2 text-right tabular-nums">{fmt(totals.cyCredit)}</td>
              <td className="p-2 text-right tabular-nums">{fmt(totals.pyDebit)}</td>
              <td className="p-2 text-right tabular-nums">{fmt(totals.pyCredit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showImport && <PasteImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
    </div>
  );
}
