import { describe, expect, it } from "vitest";
import * as devtools from "./index.js";

describe("@soroform/devtools public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof devtools.SoroformDevtools).toBe("function");
    expect(typeof devtools.WriteLogPanel).toBe("function");
  });
});
