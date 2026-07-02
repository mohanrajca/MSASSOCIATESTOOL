"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { updateEntity } from "@/lib/repo";
import { Entity, EntityType, RoundingUnit } from "@/lib/types";
import { ENTITY_TYPE_LABELS } from "@/lib/schema";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const entity = useLiveQuery(() => db.entities.get(params.id), [params.id]);

  if (!entity) return <p className="text-sm text-slate-500">Loading…</p>;

  return <SetupForm key={entity.id} initialEntity={entity} />;
}

function SetupForm({ initialEntity }: { initialEntity: Entity }) {
  const [draft, setDraft] = useState<Entity>(initialEntity);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function set<K extends keyof Entity>(key: K, value: Entity[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateEntity(draft);
    setSavedAt(Date.now());
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 pb-16">
      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Entity Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Entity Name">
            <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Entity Type">
            <select
              className={inputCls}
              value={draft.entityType}
              onChange={(e) => {
                const t = e.target.value as EntityType;
                set("entityType", t);
                set("hasOwnTaxLiability", t !== "proprietorship");
                set("showPartnersRemuneration", t === "partnership");
              }}
            >
              {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="PAN">
            <input className={inputCls} value={draft.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} />
          </Field>
          {draft.entityType === "llp" && (
            <Field label="LLPIN">
              <input className={inputCls} value={draft.llpin} onChange={(e) => set("llpin", e.target.value.toUpperCase())} />
            </Field>
          )}
          <Field label="Nature of Business">
            <input className={inputCls} value={draft.natureOfBusiness} onChange={(e) => set("natureOfBusiness", e.target.value)} />
          </Field>
          <Field label="Registered Address">
            <input className={inputCls} value={draft.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Reporting</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Financial Year Ended (Current Year)">
            <input type="date" className={inputCls} value={draft.fyEnd} onChange={(e) => set("fyEnd", e.target.value)} />
          </Field>
          <Field label="Previous Year Ended">
            <input type="date" className={inputCls} value={draft.pyEnd} onChange={(e) => set("pyEnd", e.target.value)} />
          </Field>
          <Field label="Rounding">
            <select className={inputCls} value={draft.roundingUnit} onChange={(e) => set("roundingUnit", e.target.value as RoundingUnit)}>
              <option value="actual">Actual (₹)</option>
              <option value="hundreds">Hundreds</option>
              <option value="thousands">Thousands</option>
              <option value="lakhs">Lakhs</option>
              <option value="crores">Crores</option>
              <option value="millions">Millions</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={draft.showZeroLines} onChange={(e) => set("showZeroLines", e.target.checked)} />
            Show zero-balance line items on the Balance Sheet and P&amp;L
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={draft.hasOwnTaxLiability} onChange={(e) => set("hasOwnTaxLiability", e.target.checked)} />
            Entity has its own income-tax liability (show Tax Expense in P&amp;L) &mdash; typically applicable to
            Partnership Firms and LLPs
          </label>
          {draft.entityType === "partnership" && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.showPartnersRemuneration}
                onChange={(e) => set("showPartnersRemuneration", e.target.checked)}
              />
              Show &ldquo;Remuneration and Interest to Partners&rdquo; adjustment in P&amp;L
            </label>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Signatory</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Name">
            <input className={inputCls} value={draft.signatory.name} onChange={(e) => set("signatory", { ...draft.signatory, name: e.target.value })} />
          </Field>
          <Field label="Designation">
            <input
              className={inputCls}
              value={draft.signatory.designation}
              onChange={(e) => set("signatory", { ...draft.signatory, designation: e.target.value })}
            />
          </Field>
          <Field label="Place">
            <input className={inputCls} value={draft.signatory.place} onChange={(e) => set("signatory", { ...draft.signatory, place: e.target.value })} />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={inputCls}
              value={draft.signatory.date}
              onChange={(e) => set("signatory", { ...draft.signatory, date: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Preparer (Chartered Accountant)</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Firm Name">
            <input
              className={inputCls}
              value={draft.preparer.firmName}
              onChange={(e) => set("preparer", { ...draft.preparer, firmName: e.target.value })}
            />
          </Field>
          <Field label="FRN">
            <input className={inputCls} value={draft.preparer.frn} onChange={(e) => set("preparer", { ...draft.preparer, frn: e.target.value })} />
          </Field>
          <Field label="Membership No.">
            <input
              className={inputCls}
              value={draft.preparer.membershipNo}
              onChange={(e) => set("preparer", { ...draft.preparer, membershipNo: e.target.value })}
            />
          </Field>
          <Field label="Place">
            <input className={inputCls} value={draft.preparer.place} onChange={(e) => set("preparer", { ...draft.preparer, place: e.target.value })} />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Save Basic Details
        </button>
        {savedAt && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
