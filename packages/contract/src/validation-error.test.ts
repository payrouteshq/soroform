import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toValidationError } from "./validation-error.js";

describe("toValidationError", () => {
  it("sets kind to validation-failed", () => {
    const schema = z.object({ amount: z.bigint() });
    const result = schema.safeParse({ amount: "not-a-bigint" });
    if (result.success) throw new Error("expected validation to fail");

    const error = toValidationError(result.error);
    expect(error.kind).toBe("validation-failed");
  });

  it("formats message with z.prettifyError, not the raw JSON issue dump", () => {
    const schema = z.object({ amount: z.bigint() });
    const result = schema.safeParse({ amount: "not-a-bigint" });
    if (result.success) throw new Error("expected validation to fail");

    const error = toValidationError(result.error);
    expect(error.message).toBe(z.prettifyError(result.error));
    expect(error.message).not.toContain('"code"');
    expect(error.message).not.toBe(result.error.message);
  });

  it("keeps the original ZodError as cause, untouched", () => {
    const schema = z.object({ to: z.string(), amount: z.bigint() });
    const result = schema.safeParse({ to: 5, amount: "not-a-bigint" });
    if (result.success) throw new Error("expected validation to fail");

    const error = toValidationError(result.error);
    expect(error.cause).toBe(result.error);
    expect((error.cause as z.ZodError).issues).toHaveLength(2);
    expect((error.cause as z.ZodError).flatten().fieldErrors).toHaveProperty("to");
    expect((error.cause as z.ZodError).flatten().fieldErrors).toHaveProperty("amount");
  });
});
