"use client";

import { useState } from "react";
import { parsePastedTB, ParsedTBRow } from "@/lib/importTB";
import { getGroup } from "@/lib/schema";

interface Preview {
  rows: ParsedTBRow[];
  hasHeader: boolean;
}

export default function PasteImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (rows: ParsedTBRow[]) => void;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  function handlePreview() {
    setPreview(parsePastedTB(text));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">Paste Trial Balance</h3>
        <p className="mt-1 text-xs text-slate-500">
          Paste from Excel/Tally. Include a header row for best results, with columns such as{" "}
          <code>Ledger Name, CY Debit, CY Credit, PY Debit, PY Credit</code> (a <code>Group</code>/<code>Tally Group</code>{" "}
          column improves auto-classification). Without a header, columns are assumed to be Name, CY Debit, CY
          Credit, PY Debit, PY Credit in that order.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="mt-3 w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
          placeholder={"Ledger Name\tCY Debit\tCY Credit\tPY Debit\tPY Credit\nCash in Hand\t15000\t\t9000\t"}
        />
        <div className="mt-3 flex gap-3">
          <button onClick={handlePreview} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
            Preview
          </button>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Cancel
          </button>
        </div>

        {preview && (
          <div className="mt-4">
            <p className="text-xs text-slate-500">{preview.rows.length} row(s) detected.</p>
            {!preview.hasHeader && preview.rows.length > 0 && (
              <p className="mt-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                No header row was recognised, so columns were assumed to be in the order shown below. Please check
                that &ldquo;Ledger&rdquo; and the amount columns line up correctly &mdash; if not, add a header row
                (e.g. <code>Ledger Name, CY Debit, CY Credit, PY Debit, PY Credit</code>) and try again.
              </p>
            )}
            <div className="mt-2 max-h-64 overflow-auto rounded border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left">Ledger</th>
                    <th className="p-2 text-right">CY Dr</th>
                    <th className="p-2 text-right">CY Cr</th>
                    <th className="p-2 text-right">PY Dr</th>
                    <th className="p-2 text-right">PY Cr</th>
                    <th className="p-2 text-left">Suggested Head</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-right">{r.cyDebit || ""}</td>
                      <td className="p-2 text-right">{r.cyCredit || ""}</td>
                      <td className="p-2 text-right">{r.pyDebit || ""}</td>
                      <td className="p-2 text-right">{r.pyCredit || ""}</td>
                      <td className="p-2 text-slate-500">{getGroup(r.suggestedGroupKey ?? undefined)?.label ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => onImport(preview.rows)}
              className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Import {preview.rows.length} row(s)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
