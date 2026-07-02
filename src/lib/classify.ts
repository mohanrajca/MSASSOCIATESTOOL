import { SCHEDULE_GROUPS } from "./schema";

/**
 * Suggest a schedule group key for a ledger name using keyword rules.
 * Returns null if no rule matches confidently.
 */
export function suggestGroupKey(ledgerName: string): string | null {
  const name = ledgerName.trim();
  if (!name) return null;
  for (const group of SCHEDULE_GROUPS) {
    for (const pattern of group.keywords) {
      if (pattern.test(name)) return group.key;
    }
  }
  return null;
}

/**
 * Common Tally ERP primary/sub group names mapped to our schedule group keys.
 * Used as a first-pass hint when a "Tally Group" column is supplied on import,
 * refined afterwards by keyword matching on the ledger name itself.
 */
export const TALLY_GROUP_MAP: Record<string, string> = {
  "capital account": "owners_capital",
  "reserves & surplus": "reserves_surplus",
  "reserves and surplus": "reserves_surplus",
  "secured loans": "lt_borrowings",
  "unsecured loans": "lt_borrowings",
  "loans (liability)": "lt_borrowings",
  "bank od a/c": "st_borrowings",
  "bank occ a/c": "st_borrowings",
  "sundry creditors": "trade_payables_others",
  "duties & taxes": "other_current_liabilities",
  "provisions": "st_provisions",
  "other current liabilities": "other_current_liabilities",
  "fixed assets": "ppe",
  "investments": "nc_investments",
  "sundry debtors": "trade_receivables",
  "cash-in-hand": "cash_and_bank",
  "bank accounts": "cash_and_bank",
  "deposits (asset)": "lt_loans_advances",
  "stock-in-hand": "inventories",
  "loans & advances (asset)": "st_loans_advances",
  "loans and advances (asset)": "st_loans_advances",
  "sales accounts": "revenue_from_operations",
  "purchase accounts": "purchases_stock_in_trade",
  "direct incomes": "revenue_from_operations",
  "indirect incomes": "other_income",
  "direct expenses": "cost_of_materials",
  "indirect expenses": "other_expenses",
};

export function suggestFromTallyGroup(tallyGroup: string | undefined): string | null {
  if (!tallyGroup) return null;
  const key = tallyGroup.trim().toLowerCase();
  return TALLY_GROUP_MAP[key] ?? null;
}

/**
 * Combined suggestion used by every import path. The ledger name is checked
 * first since a specific keyword match (e.g. a ledger literally named
 * "Reserves and Surplus") is more reliable than the coarse Tally group it
 * happens to sit under; the Tally group is the fallback for ledgers whose
 * name gives no hint at all (e.g. a customer/vendor name under "Sundry
 * Creditors").
 */
export function suggestGroupKeyCombined(name: string, tallyGroup: string | undefined): string | null {
  // A group can end up with no ledgers under it (e.g. "Cash-in-hand" with no
  // sub-accounts created), in which case Tally reports its own balance as if
  // it were a leaf - so also try matching the ledger's own name as a Tally
  // group name before giving up.
  return suggestGroupKey(name) ?? suggestFromTallyGroup(tallyGroup) ?? suggestFromTallyGroup(name);
}
