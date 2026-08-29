import { z } from "zod";
import type { SorokitError } from "@sorokit/core";

/**
 * Converts a `ZodError` thrown while validating a contract call's args
 * into a {@link SorokitError} with `kind: "validation-failed"`. `message`
 * is `z.prettifyError(error)`, the same human-readable format Zod itself
 * produces, rather than `ZodError.prototype.message`'s raw JSON issue
 * dump. `cause` is the original `ZodError`, untouched, so `error.issues`,
 * `error.flatten()`, and every other Zod API a caller already knows still
 * work directly off it.
 */
export function toValidationError(error: z.ZodError): SorokitError {
  return {
    kind: "validation-failed",
    message: z.prettifyError(error),
    cause: error,
  };
}
