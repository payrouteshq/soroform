import { describe, expect, it } from "vitest";
import * as core from "./index.js";

describe("@soroform/core public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof core.resolveSoroformConfig).toBe("function");
    expect(typeof core.normalizeError).toBe("function");
    expect(typeof core.createRpcServer).toBe("function");
    expect(typeof core.createHorizonServer).toBe("function");
    expect(core.queryKeys).toBeDefined();
    expect(core.Horizon).toBeDefined();
  });
});
