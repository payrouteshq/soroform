import { describe, expect, it } from "vitest";
import * as hooks from "./index.js";

describe("@sorokit/hooks public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof hooks.useBalance).toBe("function");
    expect(typeof hooks.useTransactionStatus).toBe("function");
    expect(typeof hooks.useNetworkStatus).toBe("function");
    expect(typeof hooks.useEffectStream).toBe("function");
    expect(typeof hooks.formatAmount).toBe("function");
  });
});
