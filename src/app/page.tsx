"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { createEntity, deleteEntity } from "@/lib/repo";
import { ENTITY_TYPE_LABELS } from "@/lib/schema";
import { EntityType } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function Dashboard() {
  const router = useRouter();
  const entities = useLiveQuery(() => db.entities.orderBy("updatedAt").reverse().toArray(), [], []);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("partnership");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const entity = await createEntity(name.trim(), entityType);
      router.push(`/entities/${entity.id}/setup`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, entityName: string) {
    if (!confirm(`Delete "${entityName}" and all its data? This cannot be undone.`)) return;
    await deleteEntity(id);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Financial Statement Preparation Tool</h1>
        <p className="mt-1 text-sm text-slate-600">
          Prepare Balance Sheet, Profit &amp; Loss and Notes to Accounts for non-corporate entities as per the ICAI
          Guidance Note on Financial Statements of Non-Corporate Entities (Division I).
        </p>
      </header>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-800">Your Entities</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + New Entity
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Entity Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sharma & Associates"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as EntityType)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Create &amp; Continue
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {entities && entities.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          No entities yet. Click &ldquo;+ New Entity&rdquo; to prepare your first set of financial statements.
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {entities?.map((entity) => (
          <li key={entity.id} className="rounded-lg border border-slate-200 p-5 hover:border-slate-400">
            <Link href={`/entities/${entity.id}/trial-balance`} className="block">
              <div className="font-medium text-slate-900">{entity.name}</div>
              <div className="mt-1 text-xs text-slate-500">{ENTITY_TYPE_LABELS[entity.entityType]}</div>
              <div className="mt-1 text-xs text-slate-500">Year ended {formatDate(entity.fyEnd)}</div>
            </Link>
            <div className="mt-3 flex gap-3 text-xs">
              <Link href={`/entities/${entity.id}/setup`} className="text-slate-600 hover:underline">
                Basic Details
              </Link>
              <Link href={`/entities/${entity.id}/trial-balance`} className="text-slate-600 hover:underline">
                Trial Balance
              </Link>
              <Link href={`/entities/${entity.id}/balance-sheet`} className="text-slate-600 hover:underline">
                Statements
              </Link>
              <button onClick={() => handleDelete(entity.id, entity.name)} className="ml-auto text-red-600 hover:underline">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
