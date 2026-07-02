"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildProfitLoss } from "@/lib/engine";
import { formatAmount, formatDate, roundingSuffix } from "@/lib/format";
import StatementToolbar from "@/components/StatementToolbar";

export default function ProfitLossPage() {
  const params = useParams<{ id: string }>();
  const entityId = params.id;
  const entity = useLiveQuery(() => db.entities.get(entityId), [entityId]);
  const rows = useLiveQuery(() => db.ledgers.where("entityId").equals(entityId).sortBy("order"), [entityId], []);

  if (!entity || !rows) return <p className="text-sm text-slate-500">Loading…</p>;

  const pl = buildProfitLoss(entity, rows);
  const beforeLabel = entity.showPartnersRemuneration ? "Profit before partners' remuneration and tax" : "Profit before tax";

  return (
    <div>
      <StatementToolbar entityId={entityId} />

      <div className="print-sheet rounded-lg border border-slate-200 bg-white p-8">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">{entity.name}</h2>
          <p className="text-sm text-slate-700">
            Statement of Profit and Loss for the year ended {formatDate(entity.fyEnd)}
          </p>
          <p className="text-xs text-slate-500">(₹ {roundingSuffix(entity)})</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs text-slate-600">
              <th className="p-2 text-left">Particulars</th>
              <th className="p-2 text-center">Note</th>
              <th className="p-2 text-right">Year ended {formatDate(entity.fyEnd)}</th>
              <th className="p-2 text-right">Year ended {formatDate(entity.pyEnd)}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="pt-2 pb-1 font-semibold text-slate-900">
                INCOME
              </td>
            </tr>
            {pl.incomeLines.map((line) => (
              <tr key={line.key} className="border-t border-slate-50">
                <td className="p-1 pl-6">{line.label}</td>
                <td className="p-1 text-center text-slate-500">{line.noteNo ?? ""}</td>
                <td className="p-1 text-right tabular-nums">{formatAmount(line.cy, entity)}</td>
                <td className="p-1 text-right tabular-nums">{formatAmount(line.py, entity)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-300 font-medium">
              <td className="p-1" colSpan={2}>
                Total Income
              </td>
              <td className="p-1 text-right tabular-nums">{formatAmount(pl.totalIncomeCy, entity)}</td>
              <td className="p-1 text-right tabular-nums">{formatAmount(pl.totalIncomePy, entity)}</td>
            </tr>

            <tr>
              <td colSpan={4} className="pt-6 pb-1 font-semibold text-slate-900">
                EXPENSES
              </td>
            </tr>
            {pl.expenseLines.map((line) => (
              <tr key={line.key} className="border-t border-slate-50">
                <td className="p-1 pl-6">{line.label}</td>
                <td className="p-1 text-center text-slate-500">{line.noteNo ?? ""}</td>
                <td className="p-1 text-right tabular-nums">{formatAmount(line.cy, entity)}</td>
                <td className="p-1 text-right tabular-nums">{formatAmount(line.py, entity)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-300 font-medium">
              <td className="p-1" colSpan={2}>
                Total Expenses
              </td>
              <td className="p-1 text-right tabular-nums">{formatAmount(pl.totalExpenseCy, entity)}</td>
              <td className="p-1 text-right tabular-nums">{formatAmount(pl.totalExpensePy, entity)}</td>
            </tr>

            <tr className="border-t border-slate-300 font-semibold">
              <td className="p-2" colSpan={2}>
                {beforeLabel}
              </td>
              <td className="p-2 text-right tabular-nums">{formatAmount(pl.profitBeforeRemunerationTaxCy, entity)}</td>
              <td className="p-2 text-right tabular-nums">{formatAmount(pl.profitBeforeRemunerationTaxPy, entity)}</td>
            </tr>

            {entity.showPartnersRemuneration && (
              <>
                <tr>
                  <td className="p-1 pl-2">Less: Remuneration and interest to partners</td>
                  <td></td>
                  <td className="p-1 text-right tabular-nums">{formatAmount(pl.remunerationCy, entity)}</td>
                  <td className="p-1 text-right tabular-nums">{formatAmount(pl.remunerationPy, entity)}</td>
                </tr>
                <tr className="border-t border-slate-300 font-semibold">
                  <td className="p-2" colSpan={2}>
                    Profit before tax
                  </td>
                  <td className="p-2 text-right tabular-nums">{formatAmount(pl.profitBeforeTaxCy, entity)}</td>
                  <td className="p-2 text-right tabular-nums">{formatAmount(pl.profitBeforeTaxPy, entity)}</td>
                </tr>
              </>
            )}

            {entity.hasOwnTaxLiability && (
              <>
                <tr>
                  <td colSpan={4} className="pt-4 pb-1 font-semibold text-slate-900">
                    TAX EXPENSE
                  </td>
                </tr>
                <tr>
                  <td className="p-1 pl-6">Current tax</td>
                  <td></td>
                  <td className="p-1 text-right tabular-nums">{formatAmount(pl.currentTaxCy, entity)}</td>
                  <td className="p-1 text-right tabular-nums">{formatAmount(pl.currentTaxPy, entity)}</td>
                </tr>
                <tr>
                  <td className="p-1 pl-6">Deferred tax</td>
                  <td></td>
                  <td className="p-1 text-right tabular-nums">{formatAmount(pl.deferredTaxCy, entity)}</td>
                  <td className="p-1 text-right tabular-nums">{formatAmount(pl.deferredTaxPy, entity)}</td>
                </tr>
              </>
            )}

            <tr className="border-t-2 border-slate-400 font-semibold">
              <td className="p-2" colSpan={2}>
                PROFIT FOR THE YEAR
              </td>
              <td className="p-2 text-right tabular-nums">{formatAmount(pl.profitForYearCy, entity)}</td>
              <td className="p-2 text-right tabular-nums">{formatAmount(pl.profitForYearPy, entity)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-6 text-xs text-slate-500">The accompanying notes are an integral part of the financial statements.</p>
      </div>
    </div>
  );
}
