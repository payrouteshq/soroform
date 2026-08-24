import { describe, expect, it } from "vitest";
import { SOROFORM_HOOKS_VERSION } from "./index.js";

describe("@soroform/hooks placeholder", () => {
  it("exports a version string", () => {
    expect(typeof SOROFORM_HOOKS_VERSION).toBe("string");
  });
});
