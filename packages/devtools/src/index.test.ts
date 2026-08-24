import { describe, expect, it } from "vitest";
import { SOROFORM_DEVTOOLS_VERSION } from "./index.js";

describe("@soroform/devtools placeholder", () => {
  it("exports a version string", () => {
    expect(typeof SOROFORM_DEVTOOLS_VERSION).toBe("string");
  });
});
