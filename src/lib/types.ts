export type EntityType = "proprietorship" | "partnership" | "llp";

export type RoundingUnit =
  | "actual"
  | "hundreds"
  | "thousands"
  | "lakhs"
  | "crores"
  | "millions";

export interface SignatoryBlock {
  name: string;
  designation: string;
  place: string;
  date: string; // ISO date
}

export interface PreparerBlock {
  firmName: string;
  membershipNo: string;
  frn: string;
  place: string;
  date: string; // ISO date
}

export interface Entity {
  id: string;
  name: string;
  entityType: EntityType;
  pan: string;
  llpin: string;
  address: string;
  natureOfBusiness: string;
  fyEnd: string; // ISO date, e.g. 2025-03-31
  pyEnd: string; // ISO date, e.g. 2024-03-31
  roundingUnit: RoundingUnit;
  showZeroLines: boolean;
  hasOwnTaxLiability: boolean; // LLP & Partnership Firm pay their own income-tax
  showPartnersRemuneration: boolean; // Partnership Firm remuneration/interest to partners adaptation
  cashFlowApplicable: boolean;
  signatory: SignatoryBlock;
  preparer: PreparerBlock;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerRow {
  id: string;
  entityId: string;
  glCode: string;
  name: string;
  groupKey: string | null;
  cyDebit: number;
  cyCredit: number;
  pyDebit: number;
  pyCredit: number;
  narration: string;
  order: number;
}

export interface PolicyNote {
  id: string;
  entityId: string;
  title: string;
  body: string;
  included: boolean;
  order: number;
}

export type Statement = "BS" | "PL";
export type NatureSide = "EquityLiability" | "Asset" | "Income" | "Expense";

export type Period = "CY" | "PY";
