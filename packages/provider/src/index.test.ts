import { describe, expect, it } from "vitest";
import * as provider from "./index.js";

describe("@soroform/provider public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof provider.SoroformProvider).toBe("function");
    expect(typeof provider.useSoroformConfig).toBe("function");
  });
});
