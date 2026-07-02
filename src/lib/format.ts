import { Entity } from "./types";
import { ROUNDING_FACTORS } from "./schema";

export function roundedValue(amount: number, entity: Entity): number {
  const factor = ROUNDING_FACTORS[entity.roundingUnit] ?? 1;
  return amount / factor;
}

export function formatAmount(amount: number, entity: Entity): string {
  const value = roundedValue(amount, entity);
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return "-";
  const abs = Math.abs(rounded);
  const formatted = abs.toLocaleString("en-IN", {
    minimumFractionDigits: entity.roundingUnit === "actual" ? 2 : 2,
    maximumFractionDigits: 2,
  });
  return rounded < 0 ? `(${formatted})` : formatted;
}

export function roundingSuffix(entity: Entity): string {
  switch (entity.roundingUnit) {
    case "hundreds":
      return "in Hundreds";
    case "thousands":
      return "in Thousands";
    case "lakhs":
      return "in Lakhs";
    case "crores":
      return "in Crores";
    case "millions":
      return "in Millions";
    default:
      return "in Rupees";
  }
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}
