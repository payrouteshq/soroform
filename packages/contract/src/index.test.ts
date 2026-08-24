import { describe, expect, it } from "vitest";
import { SOROFORM_CONTRACT_VERSION } from "./index.js";

describe("@soroform/contract placeholder", () => {
  it("exports a version string", () => {
    expect(typeof SOROFORM_CONTRACT_VERSION).toBe("string");
  });
});
