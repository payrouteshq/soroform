import { describe, expect, it } from "vitest";
import { xdr } from "@stellar/stellar-sdk";
import { Spec } from "@stellar/stellar-sdk/contract";
import { generateContractSchemas } from "./generate-schemas.js";

const T = xdr.ScSpecTypeDef;

function buildFixtureSpec(): Spec {
  const transfer = new xdr.ScSpecFunctionV0({
    doc: "",
    name: "transfer",
    inputs: [
      new xdr.ScSpecFunctionInputV0({ doc: "", name: "from", type: T.scSpecTypeAddress() }),
      new xdr.ScSpecFunctionInputV0({ doc: "", name: "to", type: T.scSpecTypeAddress() }),
      new xdr.ScSpecFunctionInputV0({ doc: "", name: "amount", type: T.scSpecTypeI128() }),
    ],
    outputs: [],
  });

  const balance = new xdr.ScSpecFunctionV0({
    doc: "",
    name: "balance",
    inputs: [new xdr.ScSpecFunctionInputV0({ doc: "", name: "id", type: T.scSpecTypeAddress() })],
    outputs: [T.scSpecTypeI128()],
  });

  const noArgs = new xdr.ScSpecFunctionV0({
    doc: "",
    name: "decimals",
    inputs: [],
    outputs: [T.scSpecTypeU32()],
  });

  return new Spec([
    xdr.ScSpecEntry.scSpecEntryFunctionV0(transfer),
    xdr.ScSpecEntry.scSpecEntryFunctionV0(balance),
    xdr.ScSpecEntry.scSpecEntryFunctionV0(noArgs),
  ]);
}

describe("generateContractSchemas", () => {
  it("generates one schema entry per contract method", () => {
    const schemas = generateContractSchemas(buildFixtureSpec());
    expect(Object.keys(schemas).sort()).toEqual(["balance", "decimals", "transfer"]);
  });

  it("builds an args schema matching each method's declared inputs", () => {
    const schemas = generateContractSchemas(buildFixtureSpec());
    const validAddress = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";

    expect(
      schemas.transfer?.argsSchema.safeParse({
        from: validAddress,
        to: validAddress,
        amount: 100n,
      }).success,
    ).toBe(true);
    expect(schemas.transfer?.argsSchema.safeParse({ from: validAddress }).success).toBe(false);

    expect(schemas.balance?.argsSchema.safeParse({ id: validAddress }).success).toBe(true);
  });

  it("builds an empty-object args schema for a method with no inputs", () => {
    const schemas = generateContractSchemas(buildFixtureSpec());
    expect(schemas.decimals?.argsSchema.safeParse({}).success).toBe(true);
  });

  it("notes resultType as undefined for a method with no return value", () => {
    const schemas = generateContractSchemas(buildFixtureSpec());
    expect(schemas.transfer?.resultType).toBeUndefined();
  });

  it("notes resultType for a method that returns a value", () => {
    const schemas = generateContractSchemas(buildFixtureSpec());
    expect(schemas.balance?.resultType?.type).toBe("scSpecTypeI128");
  });

  it("caches schemas per Spec instance", () => {
    const spec = buildFixtureSpec();
    expect(generateContractSchemas(spec)).toBe(generateContractSchemas(spec));
  });

  it("does not share schemas between different Spec instances", () => {
    const a = generateContractSchemas(buildFixtureSpec());
    const b = generateContractSchemas(buildFixtureSpec());
    expect(a).not.toBe(b);
  });
});
