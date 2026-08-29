import { describe, expect, it } from "vitest";
import * as core from "./index.js";

describe("@sorokit/core public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof core.resolveSorokitConfig).toBe("function");
    expect(typeof core.normalizeError).toBe("function");
    expect(typeof core.createRpcServer).toBe("function");
    expect(typeof core.createHorizonServer).toBe("function");
    expect(typeof core.resumePendingTransactions).toBe("function");
    expect(core.queryKeys).toBeDefined();
    expect(core.Horizon).toBeDefined();
    expect(core.transactionSequencer).toBeDefined();
    expect(core.pendingTransactions).toBeDefined();
    expect(core.devtoolsSendLog).toBeDefined();
  });
});
