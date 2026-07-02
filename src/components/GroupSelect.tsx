"use client";

import { EntityType } from "@/lib/types";
import { groupsForEntity } from "@/lib/schema";

export default function GroupSelect({
  entityType,
  value,
  onChange,
  className,
}: {
  entityType: EntityType;
  value: string | null;
  onChange: (key: string | null) => void;
  className?: string;
}) {
  const groups = groupsForEntity(entityType);
  const bySection = new Map<string, typeof groups>();
  for (const g of groups) {
    const list = bySection.get(g.section) ?? [];
    list.push(g);
    bySection.set(g.section, list);
  }

  return (
    <select
      className={className}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">(unclassified)</option>
      {Array.from(bySection.entries()).map(([section, items]) => (
        <optgroup key={section} label={section}>
          {items.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
