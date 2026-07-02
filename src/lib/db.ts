import Dexie, { Table } from "dexie";
import { Entity, LedgerRow, PolicyNote } from "./types";

export class AppDB extends Dexie {
  entities!: Table<Entity, string>;
  ledgers!: Table<LedgerRow, string>;
  policies!: Table<PolicyNote, string>;

  constructor() {
    super("icai_fs_tool");
    this.version(1).stores({
      entities: "id, name, updatedAt",
      ledgers: "id, entityId, groupKey, order",
      policies: "id, entityId, order",
    });
  }
}

// Dexie lazily opens the underlying IndexedDB connection, so it's safe to
// construct at module scope even when this module is evaluated during SSR
// (the `window`/`indexedDB` check only matters once a query actually runs).
export const db = typeof window !== "undefined" ? new AppDB() : (null as unknown as AppDB);
