import { describe, expect, it } from "vitest";
import { SOROFORM_CORE_VERSION } from "./index.js";

describe("@soroform/core placeholder", () => {
  it("exports a version string", () => {
    expect(typeof SOROFORM_CORE_VERSION).toBe("string");
  });
});
