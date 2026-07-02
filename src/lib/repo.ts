import { v4 as uuid } from "uuid";
import { db } from "./db";
import { Entity, EntityType, LedgerRow, PolicyNote } from "./types";
import { DEFAULT_POLICY_NOTES } from "./policies";

function todayIso(): string {
  return new Date().toISOString();
}

export function blankEntity(name: string, entityType: EntityType): Entity {
  const now = todayIso();
  const thisFyEnd = defaultFyEnd();
  const prevFyEnd = new Date(thisFyEnd);
  prevFyEnd.setFullYear(prevFyEnd.getFullYear() - 1);
  return {
    id: uuid(),
    name,
    entityType,
    pan: "",
    llpin: "",
    address: "",
    natureOfBusiness: "",
    fyEnd: thisFyEnd.toISOString().slice(0, 10),
    pyEnd: prevFyEnd.toISOString().slice(0, 10),
    roundingUnit: "actual",
    showZeroLines: false,
    hasOwnTaxLiability: entityType !== "proprietorship",
    showPartnersRemuneration: entityType === "partnership",
    cashFlowApplicable: true,
    signatory: { name: "", designation: entityType === "proprietorship" ? "Proprietor" : "Partner", place: "", date: "" },
    preparer: { firmName: "", membershipNo: "", frn: "", place: "", date: "" },
    createdAt: now,
    updatedAt: now,
  };
}

function defaultFyEnd(): Date {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(`${year}-03-31T00:00:00.000Z`);
}

export async function createEntity(name: string, entityType: EntityType): Promise<Entity> {
  const entity = blankEntity(name, entityType);
  await db.entities.add(entity);
  await Promise.all(
    DEFAULT_POLICY_NOTES.map((p, idx) =>
      db.policies.add({
        id: uuid(),
        entityId: entity.id,
        title: p.title,
        body: p.body,
        included: true,
        order: idx,
      })
    )
  );
  return entity;
}

export async function updateEntity(entity: Entity): Promise<void> {
  await db.entities.put({ ...entity, updatedAt: todayIso() });
}

export async function deleteEntity(entityId: string): Promise<void> {
  await db.transaction("rw", db.entities, db.ledgers, db.policies, async () => {
    await db.entities.delete(entityId);
    await db.ledgers.where("entityId").equals(entityId).delete();
    await db.policies.where("entityId").equals(entityId).delete();
  });
}

export function blankLedgerRow(entityId: string, order: number): LedgerRow {
  return {
    id: uuid(),
    entityId,
    glCode: "",
    name: "",
    groupKey: null,
    cyDebit: 0,
    cyCredit: 0,
    pyDebit: 0,
    pyCredit: 0,
    narration: "",
    order,
  };
}

export async function addLedgerRow(entityId: string, order: number): Promise<LedgerRow> {
  const row = blankLedgerRow(entityId, order);
  await db.ledgers.add(row);
  return row;
}

export async function updateLedgerRow(row: LedgerRow): Promise<void> {
  await db.ledgers.put(row);
}

export async function deleteLedgerRow(id: string): Promise<void> {
  await db.ledgers.delete(id);
}

export async function bulkAddLedgerRows(rows: LedgerRow[]): Promise<void> {
  await db.ledgers.bulkAdd(rows);
}

export async function updatePolicyNote(note: PolicyNote): Promise<void> {
  await db.policies.put(note);
}

export async function addPolicyNote(entityId: string, order: number): Promise<PolicyNote> {
  const note: PolicyNote = { id: uuid(), entityId, title: "New Policy", body: "", included: true, order };
  await db.policies.add(note);
  return note;
}

export async function deletePolicyNote(id: string): Promise<void> {
  await db.policies.delete(id);
}
