"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const TABS = [
  { href: "setup", label: "Basic Details" },
  { href: "trial-balance", label: "Trial Balance" },
  { href: "balance-sheet", label: "Balance Sheet" },
  { href: "profit-loss", label: "Profit & Loss" },
  { href: "notes", label: "Notes to Accounts" },
];

export default function EntityLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const pathname = usePathname();
  const entity = useLiveQuery(() => db.entities.get(id), [id]);

  return (
    <div className="min-h-full flex flex-col">
      <div className="no-print border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:underline">
              &larr; All Entities
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">{entity?.name ?? "Loading…"}</h1>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-6 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const href = `/entities/${id}/${tab.href}`;
            const active = pathname === href;
            return (
              <Link
                key={tab.href}
                href={href}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 mx-auto w-full max-w-6xl px-6 py-6">{children}</div>
    </div>
  );
}
