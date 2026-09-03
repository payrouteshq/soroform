import { describe, expect, it } from "vitest";
import { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import { normalizeError, type SorokitErrorKind } from "./errors.js";

const { Errors } = AssembledTransaction;

const INSTANCEOF_CASES: ReadonlyArray<readonly [new () => Error, SorokitErrorKind]> = [
  [Errors.ExpiredState, "EXPIRED_STATE"],
  [Errors.RestorationFailure, "RESTORE_FAILURE"],
  [Errors.NeedsMoreSignatures, "NEEDS_MORE_SIGNATURES"],
  [Errors.NoSignatureNeeded, "NO_SIGNATURE_NEEDED"],
  [Errors.NoUnsignedNonInvokerAuthEntries, "NO_UNSIGNED_NON_INVOKER_AUTH_ENTRIES"],
  [Errors.NoSigner, "NO_SIGNER"],
  [Errors.NotYetSimulated, "NOT_YET_SIMULATED"],
  [Errors.FakeAccount, "FAKE_ACCOUNT"],
  [Errors.SimulationFailed, "SIMULATION_FAILED"],
  [Errors.InternalWalletError, "INTERNAL_WALLET_ERROR"],
  [Errors.ExternalServiceError, "EXTERNAL_SERVICE_ERROR"],
  [Errors.InvalidClientRequest, "INVALID_CLIENT_REQUEST"],
  [Errors.UserRejected, "USER_REJECTED"],
];

const NAME_MATCH_CASES: ReadonlyArray<readonly [new () => Error, SorokitErrorKind]> = [
  [class SendFailedError extends Error {}, "SEND_FAILED"],
  [class SendResultOnlyError extends Error {}, "SEND_RESULT_ONLY"],
  [class TransactionStillPendingError extends Error {}, "TRANSACTION_STILL_PENDING"],
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
    expect(normalized.kind).toBe("UNKNOWN");
    expect(normalized.message).toBe("boom");
  });

  it("maps a non-Error thrown value to kind unknown", () => {
    const normalized = normalizeError("just a string");
    expect(normalized.kind).toBe("UNKNOWN");
    expect(normalized.message).toBe("just a string");
    expect(normalized.cause).toBe("just a string");
  });
});
