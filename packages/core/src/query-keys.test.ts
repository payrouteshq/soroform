import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys.js";

describe("queryKeys", () => {
  it("namespaces every key under soroform", () => {
    expect(queryKeys.account("G123")[0]).toBe("soroform");
    expect(queryKeys.balance("G123", "native")[0]).toBe("soroform");
    expect(queryKeys.transactionStatus("abc")[0]).toBe("soroform");
    expect(queryKeys.networkStatus()[0]).toBe("soroform");
    expect(queryKeys.contractSpec("passphrase", "C123")[0]).toBe("soroform");
    expect(queryKeys.contractRead("passphrase", "C123", "method", {})[0]).toBe(
      "soroform",
    );
  });

  it("makes contractRead keys extend the contractReadsByContract prefix", () => {
    const prefix = queryKeys.contractReadsByContract("passphrase", "C123");
    const full = queryKeys.contractRead("passphrase", "C123", "transfer", {
      to: "G456",
    });
    expect(full.slice(0, prefix.length)).toEqual(prefix);
  });

  it("distinguishes reads by method and args", () => {
    const a = queryKeys.contractRead("p", "C123", "balance", { id: "G1" });
    const b = queryKeys.contractRead("p", "C123", "balance", { id: "G2" });
    expect(a).not.toEqual(b);
  });

  it("produces a JSON-safe key when args contain a bigint", () => {
    const key = queryKeys.contractRead("p", "C123", "transfer", {
      amount: 10_000_000_000_000n,
    });
    expect(() => JSON.stringify(key)).not.toThrow();
  });

  it("produces a JSON-safe key when args contain a Uint8Array", () => {
    const key = queryKeys.contractRead("p", "C123", "store", {
      data: new Uint8Array([1, 2, 255]),
    });
    expect(() => JSON.stringify(key)).not.toThrow();
  });

  it("distinguishes reads that differ only by bigint amount", () => {
    const a = queryKeys.contractRead("p", "C123", "transfer", { amount: 1n });
    const b = queryKeys.contractRead("p", "C123", "transfer", { amount: 2n });
    expect(a).not.toEqual(b);
  });

  it("produces a JSON-safe key when args contain a Map", () => {
    const key = queryKeys.contractRead("p", "C123", "batch", {
      balances: new Map([["G1", 1n]]),
    });
    expect(() => JSON.stringify(key)).not.toThrow();
  });
});
