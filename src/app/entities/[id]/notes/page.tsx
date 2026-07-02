"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildNotes } from "@/lib/engine";
import { formatAmount, formatDate } from "@/lib/format";
import { addPolicyNote, deletePolicyNote, updatePolicyNote } from "@/lib/repo";
import StatementToolbar from "@/components/StatementToolbar";

export default function NotesPage() {
  const params = useParams<{ id: string }>();
  const entityId = params.id;
  const entity = useLiveQuery(() => db.entities.get(entityId), [entityId]);
  const rows = useLiveQuery(() => db.ledgers.where("entityId").equals(entityId).sortBy("order"), [entityId], []);
  const policies = useLiveQuery(() => db.policies.where("entityId").equals(entityId).sortBy("order"), [entityId], []);

  if (!entity || !rows || !policies) return <p className="text-sm text-slate-500">Loading…</p>;

  const notes = buildNotes(entity, rows);

  return (
    <div>
      <StatementToolbar entityId={entityId} />

      <div className="print-sheet space-y-10 rounded-lg border border-slate-200 bg-white p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">{entity.name}</h2>
          <p className="text-sm text-slate-700">Notes forming part of the Financial Statements</p>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between no-print">
            <h3 className="text-base font-semibold text-slate-900">Significant Accounting Policies</h3>
            <button
              onClick={() => addPolicyNote(entityId, policies.length)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              + Add Policy
            </button>
          </div>
          <div className="space-y-5">
            {policies.map((p, idx) => (
              <div key={p.id} className="group">
                <div className="flex items-start gap-2">
                  <input
                    defaultValue={p.title}
                    onBlur={(e) => updatePolicyNote({ ...p, title: e.target.value })}
                    className="w-full border-0 bg-transparent text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                  />
                  <label className="no-print flex shrink-0 items-center gap-1 text-xs text-slate-500">
                    <input type="checkbox" defaultChecked={p.included} onChange={(e) => updatePolicyNote({ ...p, included: e.target.checked })} />
                    Include
                  </label>
                  <button
                    onClick={() => deletePolicyNote(p.id)}
                    className="no-print shrink-0 text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
                {p.included && (
                  <textarea
                    defaultValue={p.body}
                    onBlur={(e) => updatePolicyNote({ ...p, body: e.target.value })}
                    rows={3}
                    className="mt-1 w-full resize-y rounded border-0 bg-transparent p-1 text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                )}
                {idx < policies.length - 1 && <hr className="mt-3 border-slate-100" />}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Notes to Accounts</h3>
          <div className="space-y-6">
            {notes.map((note) => (
              <div key={note.groupKey}>
                <p className="text-sm font-semibold text-slate-900">
                  Note {note.noteNo}: {note.title}
                </p>
                <table className="mt-1 w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500">
                      <th className="p-1 text-left font-normal"></th>
                      <th className="p-1 text-right font-normal">As at {formatDate(entity.fyEnd)}</th>
                      <th className="p-1 text-right font-normal">As at {formatDate(entity.pyEnd)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.lines.map((line, i) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="p-1 pl-4">{line.name}</td>
                        <td className="p-1 text-right tabular-nums">{formatAmount(line.cy, entity)}</td>
                        <td className="p-1 text-right tabular-nums">{formatAmount(line.py, entity)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-300 font-medium">
                      <td className="p-1">Total</td>
                      <td className="p-1 text-right tabular-nums">{formatAmount(note.totalCy, entity)}</td>
                      <td className="p-1 text-right tabular-nums">{formatAmount(note.totalPy, entity)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
            {notes.length === 0 && <p className="text-sm text-slate-400">No classified ledgers yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
