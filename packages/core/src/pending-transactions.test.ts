import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingTransactionStore, type PendingTransaction } from "./pending-transactions.js";

const STORAGE_KEY = "soroform.pending-transactions.v1";

function createStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  } satisfies Storage;
}

function entry(overrides: Partial<PendingTransaction> = {}): PendingTransaction {
  return {
    id: "send:1",
    hash: "abc123",
    address: "GABC",
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CABC",
    method: "transfer",
    submittedAt: Date.now(),
    ...overrides,
  };
}

function useStorage(storage: Storage | undefined): void {
  vi.stubGlobal("localStorage", storage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PendingTransactionStore", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createStorage();
    useStorage(storage);
  });

  it("records and lists entries oldest first", () => {
    const store = new PendingTransactionStore();
    store.add(entry({ id: "b", submittedAt: 2 }));
    store.add(entry({ id: "a", submittedAt: 1 }));
    expect(store.getAll().map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("persists to storage and rehydrates a fresh store from it", () => {
    const store = new PendingTransactionStore();
    store.add(entry({ id: "a" }));
    expect(storage.getItem(STORAGE_KEY)).toContain("abc123");

    expect(new PendingTransactionStore().getAll().map((e) => e.id)).toEqual(["a"]);
  });

  it("clears the storage key once the queue empties", () => {
    const store = new PendingTransactionStore();
    store.add(entry({ id: "a" }));
    store.remove("a");
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("drops entries too old to still be includable in a ledger", () => {
    useStorage(
      createStorage({
        [STORAGE_KEY]: JSON.stringify([
          entry({ id: "fresh", submittedAt: Date.now() }),
          entry({ id: "stale", submittedAt: Date.now() - 60 * 60 * 1000 }),
        ]),
      }),
    );
    expect(new PendingTransactionStore().getAll().map((e) => e.id)).toEqual(["fresh"]);
  });

  it("ignores a corrupt or foreign value stored under its key", () => {
    useStorage(createStorage({ [STORAGE_KEY]: "not json" }));
    expect(new PendingTransactionStore().getAll()).toEqual([]);

    useStorage(createStorage({ [STORAGE_KEY]: JSON.stringify([{ nope: true }]) }));
    expect(new PendingTransactionStore().getAll()).toEqual([]);
  });

  it("works with no storage available, as during server rendering", () => {
    useStorage(undefined);
    const store = new PendingTransactionStore();
    store.add(entry({ id: "a" }));
    expect(store.getAll().map((e) => e.id)).toEqual(["a"]);
  });

  it("keeps working when a storage write throws", () => {
    const full = createStorage();
    full.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    useStorage(full);

    const store = new PendingTransactionStore();
    store.add(entry({ id: "a" }));
    expect(store.getAll().map((e) => e.id)).toEqual(["a"]);
  });

  it("notifies subscribers on add, remove, and clear", () => {
    const store = new PendingTransactionStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.add(entry({ id: "a" }));
    expect(listener).toHaveBeenCalledTimes(1);
    store.remove("missing");
    expect(listener).toHaveBeenCalledTimes(1);
    store.remove("a");
    expect(listener).toHaveBeenCalledTimes(2);
    store.clear();
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.add(entry({ id: "b" }));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("returns a stable getAll() reference until something changes", () => {
    const store = new PendingTransactionStore();
    store.add(entry({ id: "a" }));
    const snapshot = store.getAll();
    expect(store.getAll()).toBe(snapshot);
    store.add(entry({ id: "b" }));
    expect(store.getAll()).not.toBe(snapshot);
  });
});
