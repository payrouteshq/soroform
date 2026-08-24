import { describe, expect, it } from "vitest";
import { SOROFORM_PROVIDER_VERSION } from "./index.js";

describe("@soroform/provider placeholder", () => {
  it("exports a version string", () => {
    expect(typeof SOROFORM_PROVIDER_VERSION).toBe("string");
  });
});
