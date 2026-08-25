import { describe, expect, it } from "vitest";
import * as contract from "./index.js";

describe("@soroform/contract public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof contract.sorobanTypeToZod).toBe("function");
    expect(typeof contract.generateContractSchemas).toBe("function");
    expect(typeof contract.fetchContractSpec).toBe("function");
    expect(typeof contract.useContractRead).toBe("function");
    expect(typeof contract.useContractWrite).toBe("function");
    expect(typeof contract.useContractForm).toBe("function");
  });
});
