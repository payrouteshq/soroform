import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys.js";

describe("queryKeys", () => {
  it("namespaces every key under sorokit", () => {
    expect(queryKeys.balance("G123", "native")[0]).toBe("sorokit");
    expect(queryKeys.transactionStatus("abc")[0]).toBe("sorokit");
    expect(queryKeys.networkStatus()[0]).toBe("sorokit");
    expect(queryKeys.contractSpec("passphrase", "C123")[0]).toBe("sorokit");
    expect(queryKeys.contractCall("passphrase", "C123", "method", {})[0]).toBe("sorokit");
  });

  it("makes contractCall keys extend the contractCallsByContract prefix", () => {
    const prefix = queryKeys.contractCallsByContract("passphrase", "C123");
    const full = queryKeys.contractCall("passphrase", "C123", "transfer", {
      to: "G456",
    });
    expect(full.slice(0, prefix.length)).toEqual(prefix);
  });

  it("distinguishes reads by method and args", () => {
    const a = queryKeys.contractCall("p", "C123", "balance", { id: "G1" });
    const b = queryKeys.contractCall("p", "C123", "balance", { id: "G2" });
    expect(a).not.toEqual(b);
  });

  it("produces a JSON-safe key when args contain a bigint", () => {
    const key = queryKeys.contractCall("p", "C123", "transfer", {
      amount: 10_000_000_000_000n,
    });
    expect(() => JSON.stringify(key)).not.toThrow();
  });

  it("produces a JSON-safe key when args contain a Uint8Array", () => {
    const key = queryKeys.contractCall("p", "C123", "store", {
      data: new Uint8Array([1, 2, 255]),
    });
    expect(() => JSON.stringify(key)).not.toThrow();
  });

  it("distinguishes reads that differ only by bigint amount", () => {
    const a = queryKeys.contractCall("p", "C123", "transfer", { amount: 1n });
    const b = queryKeys.contractCall("p", "C123", "transfer", { amount: 2n });
    expect(a).not.toEqual(b);
  });

  it("produces a JSON-safe key when args contain a Map", () => {
    const key = queryKeys.contractCall("p", "C123", "batch", {
      balances: new Map([["G1", 1n]]),
    });
    expect(() => JSON.stringify(key)).not.toThrow();
  });
});
