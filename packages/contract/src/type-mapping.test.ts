import { describe, expect, it } from "vitest";
import { xdr } from "@stellar/stellar-sdk";
import { Spec } from "@stellar/stellar-sdk/contract";
import { sorobanTypeToZod } from "./type-mapping.js";

const T = xdr.ScSpecTypeDef;

/**
 * A fixture Spec covering every UDT shape sorobanTypeToZod needs to
 * resolve: a named-field struct, a tuple struct, a union with both a void
 * and a data-carrying case, and a plain (unit-variant) enum. Built via the
 * SDK's own xdr classes, not synthetic plain objects, so the fixture is
 * exactly what a real deployed contract's spec would contain.
 */
function buildFixtureSpec(): Spec {
  const point = new xdr.ScSpecUdtStructV0({
    doc: "",
    lib: "",
    name: "Point",
    fields: [
      new xdr.ScSpecUdtStructFieldV0({ doc: "", name: "x", type: T.scSpecTypeU32() }),
      new xdr.ScSpecUdtStructFieldV0({ doc: "", name: "y", type: T.scSpecTypeU32() }),
    ],
  });

  const pair = new xdr.ScSpecUdtStructV0({
    doc: "",
    lib: "",
    name: "Pair",
    fields: [
      new xdr.ScSpecUdtStructFieldV0({ doc: "", name: "0", type: T.scSpecTypeU32() }),
      new xdr.ScSpecUdtStructFieldV0({ doc: "", name: "1", type: T.scSpecTypeString() }),
    ],
  });

  const status = new xdr.ScSpecUdtEnumV0({
    doc: "",
    lib: "",
    name: "Status",
    cases: [
      new xdr.ScSpecUdtEnumCaseV0({ doc: "", name: "Active", value: 0 }),
      new xdr.ScSpecUdtEnumCaseV0({ doc: "", name: "Inactive", value: 1 }),
    ],
  });

  const message = new xdr.ScSpecUdtUnionV0({
    doc: "",
    lib: "",
    name: "Message",
    cases: [
      xdr.ScSpecUdtUnionCaseV0.scSpecUdtUnionCaseVoidV0(
        new xdr.ScSpecUdtUnionCaseVoidV0({ doc: "", name: "Quit" }),
      ),
      xdr.ScSpecUdtUnionCaseV0.scSpecUdtUnionCaseTupleV0(
        new xdr.ScSpecUdtUnionCaseTupleV0({
          doc: "",
          name: "Move",
          type: [T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Point" }))],
        }),
      ),
      xdr.ScSpecUdtUnionCaseV0.scSpecUdtUnionCaseTupleV0(
        new xdr.ScSpecUdtUnionCaseTupleV0({
          doc: "",
          name: "Write",
          type: [T.scSpecTypeString(), T.scSpecTypeU32()],
        }),
      ),
    ],
  });

  return new Spec([
    xdr.ScSpecEntry.scSpecEntryUdtStructV0(point),
    xdr.ScSpecEntry.scSpecEntryUdtStructV0(pair),
    xdr.ScSpecEntry.scSpecEntryUdtEnumV0(status),
    xdr.ScSpecEntry.scSpecEntryUdtUnionV0(message),
  ]);
}

const spec = buildFixtureSpec();

describe("sorobanTypeToZod: scalars", () => {
  it("maps u32/i32 to number", () => {
    expect(sorobanTypeToZod(T.scSpecTypeU32(), spec).parse(42)).toBe(42);
    expect(sorobanTypeToZod(T.scSpecTypeI32(), spec).parse(-1)).toBe(-1);
    expect(sorobanTypeToZod(T.scSpecTypeU32(), spec).safeParse(1.5).success).toBe(true);
    expect(sorobanTypeToZod(T.scSpecTypeU32(), spec).safeParse("42").success).toBe(false);
  });

  it("maps u64/i64/u128/i128/u256/i256 to bigint, rejecting plain numbers", () => {
    for (const type of [
      T.scSpecTypeU64(),
      T.scSpecTypeI64(),
      T.scSpecTypeU128(),
      T.scSpecTypeI128(),
      T.scSpecTypeU256(),
      T.scSpecTypeI256(),
    ]) {
      const schema = sorobanTypeToZod(type, spec);
      expect(schema.parse(10_000_000_000_000_000n)).toBe(10_000_000_000_000_000n);
      expect(schema.safeParse(10_000_000_000_000_000).success).toBe(false);
    }
  });

  it("maps timepoint/duration to bigint", () => {
    expect(sorobanTypeToZod(T.scSpecTypeTimepoint(), spec).parse(1n)).toBe(1n);
    expect(sorobanTypeToZod(T.scSpecTypeDuration(), spec).parse(1n)).toBe(1n);
  });

  it("maps bool to boolean", () => {
    const schema = sorobanTypeToZod(T.scSpecTypeBool(), spec);
    expect(schema.parse(true)).toBe(true);
    expect(schema.safeParse("true").success).toBe(false);
  });

  it("maps symbol and string to string", () => {
    expect(sorobanTypeToZod(T.scSpecTypeSymbol(), spec).parse("hello")).toBe("hello");
    expect(sorobanTypeToZod(T.scSpecTypeString(), spec).parse("hello")).toBe("hello");
  });

  it("maps bytes to Uint8Array with no length constraint", () => {
    const schema = sorobanTypeToZod(T.scSpecTypeBytes(), spec);
    expect(schema.safeParse(new Uint8Array([1, 2, 3])).success).toBe(true);
    expect(schema.safeParse(new Uint8Array(0)).success).toBe(true);
  });

  it("maps bytesN to Uint8Array with an exact length constraint", () => {
    const schema = sorobanTypeToZod(T.scSpecTypeBytesN(new xdr.ScSpecTypeBytesN({ n: 32 })), spec);
    expect(schema.safeParse(new Uint8Array(32)).success).toBe(true);
    expect(schema.safeParse(new Uint8Array(31)).success).toBe(false);
    expect(schema.safeParse(new Uint8Array(33)).success).toBe(false);
  });
});

describe("sorobanTypeToZod: address", () => {
  const schema = sorobanTypeToZod(T.scSpecTypeAddress(), spec);
  const validAccount = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
  const validContract = "CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5";

  it("accepts a valid account address", () => {
    expect(schema.safeParse(validAccount).success).toBe(true);
  });

  it("accepts a valid contract address", () => {
    expect(schema.safeParse(validContract).success).toBe(true);
  });

  it("rejects an invalid address", () => {
    expect(schema.safeParse("not-an-address").success).toBe(false);
    expect(schema.safeParse(validAccount.slice(0, -1)).success).toBe(false);
  });
});

describe("sorobanTypeToZod: compound types", () => {
  it("maps vec<T> to an array of T", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeVec(new xdr.ScSpecTypeVec({ elementType: T.scSpecTypeU32() })),
      spec,
    );
    expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3]);
    expect(schema.safeParse([1, "two"]).success).toBe(false);
  });

  it("maps map<K, V> to a Map", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeMap(
        new xdr.ScSpecTypeMap({ keyType: T.scSpecTypeString(), valueType: T.scSpecTypeU32() }),
      ),
      spec,
    );
    const value = new Map([["a", 1]]);
    expect(schema.parse(value)).toEqual(value);
    expect(schema.safeParse({ a: 1 }).success).toBe(false);
  });

  it("maps option<T> to accept T, null, or undefined", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeOption(new xdr.ScSpecTypeOption({ valueType: T.scSpecTypeU32() })),
      spec,
    );
    expect(schema.parse(5)).toBe(5);
    expect(schema.parse(null)).toBe(null);
    expect(schema.parse(undefined)).toBe(undefined);
    expect(schema.safeParse("5").success).toBe(false);
  });

  it("maps option<option<T>> (nested option)", () => {
    const inner = T.scSpecTypeOption(new xdr.ScSpecTypeOption({ valueType: T.scSpecTypeU32() }));
    const schema = sorobanTypeToZod(
      T.scSpecTypeOption(new xdr.ScSpecTypeOption({ valueType: inner })),
      spec,
    );
    expect(schema.parse(5)).toBe(5);
    expect(schema.parse(null)).toBe(null);
  });

  it("maps result<ok, error> to a tagged ok/error union", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeResult(
        new xdr.ScSpecTypeResult({ okType: T.scSpecTypeU32(), errorType: T.scSpecTypeString() }),
      ),
      spec,
    );
    expect(schema.safeParse({ ok: 1 }).success).toBe(true);
    expect(schema.safeParse({ error: "failed" }).success).toBe(true);
    expect(schema.safeParse({ ok: "wrong type" }).success).toBe(false);
  });

  it("maps tuple<T1, T2> to a fixed-length array", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeTuple(
        new xdr.ScSpecTypeTuple({ valueTypes: [T.scSpecTypeU32(), T.scSpecTypeString()] }),
      ),
      spec,
    );
    expect(schema.parse([1, "a"])).toEqual([1, "a"]);
    expect(schema.safeParse([1]).success).toBe(false);
    expect(schema.safeParse(["a", 1]).success).toBe(false);
  });

  it("maps an empty tuple", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeTuple(new xdr.ScSpecTypeTuple({ valueTypes: [] })),
      spec,
    );
    expect(schema.parse([])).toEqual([]);
  });
});

describe("sorobanTypeToZod: user-defined types", () => {
  it("maps a named-field struct to a keyed object", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Point" })),
      spec,
    );
    expect(schema.parse({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
    expect(schema.safeParse({ x: 1 }).success).toBe(false);
  });

  it("maps a tuple struct (numeric field names) to a positional array", () => {
    const schema = sorobanTypeToZod(T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Pair" })), spec);
    expect(schema.parse([1, "a"])).toEqual([1, "a"]);
    expect(schema.safeParse({ 0: 1, 1: "a" }).success).toBe(false);
  });

  it("maps a plain (unit-variant) enum to its numeric case values, not names", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Status" })),
      spec,
    );
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(2).success).toBe(false);
    expect(schema.safeParse("Active").success).toBe(false);
  });

  it("maps a union's void case to a bare tag object", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Message" })),
      spec,
    );
    expect(schema.safeParse({ tag: "Quit" }).success).toBe(true);
  });

  it("maps a union's single-value tuple case with values as a one-element array", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Message" })),
      spec,
    );
    expect(schema.safeParse({ tag: "Move", values: [{ x: 1, y: 2 }] }).success).toBe(true);
    expect(schema.safeParse({ tag: "Move", values: [{ x: 1, y: 2 }, "extra"] }).success).toBe(
      false,
    );
  });

  it("maps a union's multi-value tuple case", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Message" })),
      spec,
    );
    expect(schema.safeParse({ tag: "Write", values: ["hi", 5] }).success).toBe(true);
    expect(schema.safeParse({ tag: "Write", values: ["hi"] }).success).toBe(false);
  });

  it("rejects an unknown union tag", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Message" })),
      spec,
    );
    expect(schema.safeParse({ tag: "Nope" }).success).toBe(false);
  });

  it("maps nested option<struct>", () => {
    const schema = sorobanTypeToZod(
      T.scSpecTypeOption(
        new xdr.ScSpecTypeOption({
          valueType: T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Point" })),
        }),
      ),
      spec,
    );
    expect(schema.safeParse({ x: 1, y: 2 }).success).toBe(true);
    expect(schema.parse(null)).toBe(null);
  });

  it("throws for an unknown UDT name", () => {
    expect(() =>
      sorobanTypeToZod(T.scSpecTypeUdt(new xdr.ScSpecTypeUdt({ name: "Nope" })), spec),
    ).toThrow();
  });
});
