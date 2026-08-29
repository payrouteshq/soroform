import { describe, expect, it } from "vitest";
import * as devtools from "./index.js";

describe("@sorokit/devtools public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof devtools.SorokitDevtools).toBe("function");
    expect(typeof devtools.SendLogPanel).toBe("function");
  });
});
