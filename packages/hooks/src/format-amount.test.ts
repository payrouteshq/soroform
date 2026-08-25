import { describe, expect, it } from "vitest";
import { formatAmount } from "./format-amount.js";

describe("formatAmount", () => {
  it("formats a whole number with no fractional part", () => {
    expect(formatAmount(1_000_0000000n, 7)).toBe("1000");
  });

  it("formats a fractional amount, trimming trailing zeros", () => {
    expect(formatAmount(15_000_000n, 7)).toBe("1.5");
  });

  it("keeps significant fractional digits", () => {
    expect(formatAmount(1_2345678n, 7)).toBe("1.2345678");
  });

  it("handles zero", () => {
    expect(formatAmount(0n, 7)).toBe("0");
  });

  it("handles negative amounts", () => {
    expect(formatAmount(-15_000_000n, 7)).toBe("-1.5");
  });

  it("handles zero decimals as a plain integer", () => {
    expect(formatAmount(42n, 0)).toBe("42");
  });

  it("pads small fractional amounts with leading zeros", () => {
    expect(formatAmount(1n, 7)).toBe("0.0000001");
  });
});
