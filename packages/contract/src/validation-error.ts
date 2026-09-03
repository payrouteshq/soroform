import { z } from "zod";
import type { SorokitError } from "@sorokit/core";

export function toValidationError(error: z.ZodError): SorokitError {
  return {
    kind: "VALIDATION_FAILED",
    message: z.prettifyError(error),
    cause: error,
  };
}
