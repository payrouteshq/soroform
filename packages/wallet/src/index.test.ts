import { describe, expect, it } from "vitest";
import { SOROFORM_WALLET_VERSION } from "./index.js";

describe("@soroform/wallet placeholder", () => {
  it("exports a version string", () => {
    expect(typeof SOROFORM_WALLET_VERSION).toBe("string");
  });
});
