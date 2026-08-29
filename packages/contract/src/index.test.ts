import { describe, expect, it } from "vitest";
import * as contract from "./index.js";

describe("@sorokit/contract public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof contract.sorobanTypeToZod).toBe("function");
    expect(typeof contract.generateContractSchemas).toBe("function");
    expect(typeof contract.fetchContractSpec).toBe("function");
    expect(typeof contract.toValidationError).toBe("function");
    expect(typeof contract.useContractCall).toBe("function");
    expect(typeof contract.useContractSend).toBe("function");
    expect(typeof contract.useSorobanForm).toBe("function");
  });
});
