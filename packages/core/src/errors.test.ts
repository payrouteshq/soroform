import { describe, expect, it } from "vitest";
import { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import { normalizeError, type SorokitErrorKind } from "./errors.js";

const { Errors } = AssembledTransaction;

const INSTANCEOF_CASES: ReadonlyArray<readonly [new () => Error, SorokitErrorKind]> = [
  [Errors.ExpiredState, "expired-state"],
  [Errors.RestorationFailure, "restore-failure"],
  [Errors.NeedsMoreSignatures, "needs-more-signatures"],
  [Errors.NoSignatureNeeded, "no-signature-needed"],
  [Errors.NoUnsignedNonInvokerAuthEntries, "no-unsigned-non-invoker-auth-entries"],
  [Errors.NoSigner, "no-signer"],
  [Errors.NotYetSimulated, "not-yet-simulated"],
  [Errors.FakeAccount, "fake-account"],
  [Errors.SimulationFailed, "simulation-failed"],
  [Errors.InternalWalletError, "internal-wallet-error"],
  [Errors.ExternalServiceError, "external-service-error"],
  [Errors.InvalidClientRequest, "invalid-client-request"],
  [Errors.UserRejected, "user-rejected"],
];

/**
 * SendFailedError, SendResultOnlyError, and TransactionStillPendingError are
 * not reachable from any exported surface of @stellar/stellar-sdk/contract
 * (see errors.ts), so normalizeError matches them by constructor name. These
 * locally-defined stand-ins, named identically to the real SDK classes,
 * exercise that same name-matching path.
 */
const NAME_MATCH_CASES: ReadonlyArray<readonly [new () => Error, SorokitErrorKind]> = [
  [class SendFailedError extends Error {}, "send-failed"],
  [class SendResultOnlyError extends Error {}, "send-result-only"],
  [class TransactionStillPendingError extends Error {}, "transaction-still-pending"],
];

describe("normalizeError", () => {
  it.each(INSTANCEOF_CASES)("maps %s to kind %s", (ErrorClass, expectedKind) => {
    const normalized = normalizeError(new ErrorClass());
    expect(normalized.kind).toBe(expectedKind);
    expect(typeof normalized.message).toBe("string");
    expect(normalized.message.length).toBeGreaterThan(0);
    expect(normalized.cause).toBeInstanceOf(ErrorClass);
  });

  it.each(NAME_MATCH_CASES)("maps %s to kind %s by name", (ErrorClass, expectedKind) => {
    const normalized = normalizeError(new ErrorClass());
    expect(normalized.kind).toBe(expectedKind);
    expect(normalized.message.length).toBeGreaterThan(0);
  });

  it("covers all 16 contract error classes", () => {
    expect(INSTANCEOF_CASES.length + NAME_MATCH_CASES.length).toBe(16);
  });

  it("maps a plain Error to kind unknown, preserving its message", () => {
    const normalized = normalizeError(new Error("boom"));
    expect(normalized.kind).toBe("unknown");
    expect(normalized.message).toBe("boom");
  });

  it("maps a non-Error thrown value to kind unknown", () => {
    const normalized = normalizeError("just a string");
    expect(normalized.kind).toBe("unknown");
    expect(normalized.message).toBe("just a string");
    expect(normalized.cause).toBe("just a string");
  });
});
