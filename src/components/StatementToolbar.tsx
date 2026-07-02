"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { exportEntityToXlsx, downloadBlob } from "@/lib/exportXlsx";

export default function StatementToolbar({ entityId }: { entityId: string }) {
  const [busy, setBusy] = useState(false);
  const entity = useLiveQuery(() => db.entities.get(entityId), [entityId]);
  const rows = useLiveQuery(() => db.ledgers.where("entityId").equals(entityId).sortBy("order"), [entityId]);
  const policies = useLiveQuery(() => db.policies.where("entityId").equals(entityId).sortBy("order"), [entityId]);

  async function handleExport() {
    if (!entity || !rows || !policies) return;
    setBusy(true);
    try {
      const blob = await exportEntityToXlsx(entity, rows, policies);
      downloadBlob(blob, `${entity.name.replace(/[^a-z0-9]+/gi, "_")}_Financial_Statements.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print mb-4 flex gap-3">
      <button
        onClick={handleExport}
        disabled={busy || !entity || !rows || !policies}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Export to Excel"}
      </button>
      <button
        onClick={() => window.print()}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Print / PDF
      </button>
    </div>
  );
}
