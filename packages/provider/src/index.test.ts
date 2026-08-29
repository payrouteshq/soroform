import { describe, expect, it } from "vitest";
import * as provider from "./index.js";

describe("@sorokit/provider public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof provider.SorokitProvider).toBe("function");
    expect(typeof provider.useSorokitConfig).toBe("function");
  });
});
