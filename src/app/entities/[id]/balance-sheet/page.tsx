"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildBalanceSheet, StatementSection } from "@/lib/engine";
import { formatAmount, formatDate, roundingSuffix } from "@/lib/format";
import StatementToolbar from "@/components/StatementToolbar";
import { Entity } from "@/lib/types";

export default function BalanceSheetPage() {
  const params = useParams<{ id: string }>();
  const entityId = params.id;
  const entity = useLiveQuery(() => db.entities.get(entityId), [entityId]);
  const rows = useLiveQuery(() => db.ledgers.where("entityId").equals(entityId).sortBy("order"), [entityId], []);

  if (!entity || !rows) return <p className="text-sm text-slate-500">Loading…</p>;

  const bs = buildBalanceSheet(entity, rows);
  const tallied = Math.abs(bs.mismatchCy) < 0.01 && Math.abs(bs.mismatchPy) < 0.01;

  return (
    <div>
      <StatementToolbar entityId={entityId} />

      {!tallied && (
        <div className="no-print mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Balance Sheet does not tally. Equity &amp; Liabilities vs Assets differ by{" "}
          <strong>{formatAmount(bs.mismatchCy, entity)}</strong> (current year) and{" "}
          <strong>{formatAmount(bs.mismatchPy, entity)}</strong> (previous year). Check unclassified ledgers on the
          Trial Balance tab.
        </div>
      )}

      <div className="print-sheet rounded-lg border border-slate-200 bg-white p-8">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">{entity.name}</h2>
          <p className="text-sm text-slate-700">Balance Sheet as at {formatDate(entity.fyEnd)}</p>
          <p className="text-xs text-slate-500">(₹ {roundingSuffix(entity)})</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs text-slate-600">
              <th className="p-2 text-left">Particulars</th>
              <th className="p-2 text-center">Note</th>
              <th className="p-2 text-right">As at {formatDate(entity.fyEnd)}</th>
              <th className="p-2 text-right">As at {formatDate(entity.pyEnd)}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="pt-4 pb-1 font-semibold text-slate-900">
                I. EQUITY AND LIABILITIES
              </td>
            </tr>
            {bs.equityLiabSections.map(
              (section) =>
                section.lines.length > 0 && (
                  <SectionRows key={section.title} section={section} entity={entity} />
                )
            )}
            <tr className="border-t border-slate-300 font-semibold">
              <td className="p-2" colSpan={2}>
                TOTAL EQUITY AND LIABILITIES
              </td>
              <td className="p-2 text-right tabular-nums">{formatAmount(bs.totalEquityLiabCy, entity)}</td>
              <td className="p-2 text-right tabular-nums">{formatAmount(bs.totalEquityLiabPy, entity)}</td>
            </tr>

            <tr>
              <td colSpan={4} className="pt-6 pb-1 font-semibold text-slate-900">
                II. ASSETS
              </td>
            </tr>
            {bs.assetSections.map(
              (section) =>
                section.lines.length > 0 && <SectionRows key={section.title} section={section} entity={entity} />
            )}
            <tr className="border-t border-slate-300 font-semibold">
              <td className="p-2" colSpan={2}>
                TOTAL ASSETS
              </td>
              <td className="p-2 text-right tabular-nums">{formatAmount(bs.totalAssetsCy, entity)}</td>
              <td className="p-2 text-right tabular-nums">{formatAmount(bs.totalAssetsPy, entity)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-6 text-xs text-slate-500">The accompanying notes are an integral part of the financial statements.</p>
      </div>
    </div>
  );
}

function SectionRows({ section, entity }: { section: StatementSection; entity: Entity }) {
  return (
    <>
      <tr>
        <td className="p-1 pl-2 italic text-slate-600" colSpan={4}>
          {section.title}
        </td>
      </tr>
      {section.lines.map((line) => (
        <tr key={line.key} className="border-t border-slate-50">
          <td className="p-1 pl-6">{line.label}</td>
          <td className="p-1 text-center text-slate-500">{line.noteNo ?? ""}</td>
          <td className="p-1 text-right tabular-nums">{formatAmount(line.cy, entity)}</td>
          <td className="p-1 text-right tabular-nums">{formatAmount(line.py, entity)}</td>
        </tr>
      ))}
      <tr className="font-medium">
        <td className="p-1 pl-2" colSpan={2}>
          Total {section.title}
        </td>
        <td className="p-1 text-right tabular-nums">{formatAmount(section.subtotalCy, entity)}</td>
        <td className="p-1 text-right tabular-nums">{formatAmount(section.subtotalPy, entity)}</td>
      </tr>
    </>
  );
}
