"use client";

import { useRef, useState } from "react";
import { parsePastedTB, ParsedTBRow } from "@/lib/importTB";
import { parseTallyXlsxFile } from "@/lib/importTallyXlsx";
import { getGroup } from "@/lib/schema";

interface Preview {
  rows: ParsedTBRow[];
  hasHeader: boolean;
  warnings?: string[];
}

type Mode = "paste" | "upload";

export default function PasteImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (rows: ParsedTBRow[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePreviewPaste() {
    setError(null);
    setPreview(parsePastedTB(text));
  }

  async function handleFileSelected(file: File) {
    setError(null);
    setBusy(true);
    setPreview(null);
    try {
      const { rows, warnings } = await parseTallyXlsxFile(file);
      if (rows.length === 0) {
        setError("No ledger rows could be found in this file. " + (warnings[0] ?? ""));
      } else {
        setPreview({ rows, hasHeader: true, warnings });
      }
    } catch (e) {
      setError(e instanceof Error ? `Could not read this file: ${e.message}` : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  const tabCls = (m: Mode) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${mode === m ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">Import Trial Balance</h3>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setMode("upload");
              setPreview(null);
              setError(null);
            }}
            className={tabCls("upload")}
          >
            Upload Excel File (Tally Export)
          </button>
          <button
            onClick={() => {
              setMode("paste");
              setPreview(null);
              setError(null);
            }}
            className={tabCls("paste")}
          >
            Paste Text
          </button>
        </div>

        {mode === "upload" ? (
          <div className="mt-4">
            <p className="text-xs text-slate-500">
              Upload the <code>.xlsx</code> file exported from Tally&apos;s Trial Balance report (Gateway of Tally
              &rarr; Display &rarr; Trial Balance &rarr; Export). Group subtotals are detected automatically from
              indentation and only the underlying ledgers are imported, with each ledger&apos;s Tally group used to
              help suggest its Schedule head.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="mt-3 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            {busy && <p className="mt-2 text-xs text-slate-500">Reading file…</p>}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs text-slate-500">
              Paste a flat list from Excel/Tally. Include a header row for best results, with columns such as{" "}
              <code>Ledger Name, CY Debit, CY Credit, PY Debit, PY Credit</code> (a <code>Group</code>/
              <code>Tally Group</code> column improves auto-classification). This mode expects one row per ledger
              &mdash; if you copied Tally&apos;s grouped Trial Balance report, use &ldquo;Upload Excel File&rdquo;
              instead so group subtotals aren&apos;t imported as extra rows.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="mt-3 w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
              placeholder={"Ledger Name\tCY Debit\tCY Credit\tPY Debit\tPY Credit\nCash in Hand\t15000\t\t9000\t"}
            />
            <div className="mt-3 flex gap-3">
              <button onClick={handlePreviewPaste} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
                Preview
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">{error}</p>}

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
            {preview.warnings?.map((w, i) => (
              <p key={i} className="mt-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                {w}
              </p>
            ))}
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
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => onImport(preview.rows)}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Import {preview.rows.length} row(s)
              </button>
              <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        {!preview && (
          <div className="mt-4">
            <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
