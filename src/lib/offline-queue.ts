// Phase 13: a localStorage-backed queue for the three mobile field flows
// that can be created while offline (Sales Order, Cash Receipt, Bank
// Receipt - spec section 46). Namespaced by user id so a shared device
// logged in as different users doesn't mix up queues. Safe to import from
// server code - every function no-ops (or returns []) outside the browser.

export type QueueItemType = "sales_order" | "receipt" | "payment";
export type QueueItemStatus = "pending" | "uploading" | "synced" | "failed";

export type QueueItem = {
  localId: string;
  type: QueueItemType;
  payload: unknown;
  status: QueueItemStatus;
  createdAt: string;
  error?: string;
};

function storageKey(userId: string) {
  return `skye-erp-offline-queue:${userId}`;
}

function readAll(userId: string): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(userId: string, items: QueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(items));
}

export function enqueue(userId: string, type: QueueItemType, payload: unknown): QueueItem {
  const item: QueueItem = {
    localId: crypto.randomUUID(),
    type,
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const items = readAll(userId);
  items.push(item);
  writeAll(userId, items);
  return item;
}

export function list(userId: string): QueueItem[] {
  return readAll(userId);
}

export function updateStatus(userId: string, localId: string, status: QueueItemStatus, error?: string) {
  const items = readAll(userId);
  const idx = items.findIndex((i) => i.localId === localId);
  if (idx === -1) return;
  items[idx] = { ...items[idx], status, error };
  writeAll(userId, items);
}

export function pendingCount(userId: string): number {
  return readAll(userId).filter((i) => i.status === "pending" || i.status === "failed").length;
}
