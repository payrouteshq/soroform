import { AssembledTransaction } from "@stellar/stellar-sdk/contract";

/**
 * Every distinct kind of error Soroform can normalize an underlying error
 * into. `"validation-failed"` is raised by `@soroform/contract` when a
 * contract call's args fail their generated Zod schema, before any network
 * call is made; its `cause` is the original `ZodError`, so `issues`,
 * `flatten()`, and every other Zod API a caller already knows are still
 * available, not just the normalized message. `"unknown"` covers anything
 * else that is not one of the 16 `@stellar/stellar-sdk/contract` error
 * classes, including plain network failures and application errors thrown
 * from consuming code.
 */
export type SoroformErrorKind =
  | "expired-state"
  | "restore-failure"
  | "needs-more-signatures"
  | "no-signature-needed"
  | "no-unsigned-non-invoker-auth-entries"
  | "no-signer"
  | "not-yet-simulated"
  | "fake-account"
  | "simulation-failed"
  | "internal-wallet-error"
  | "external-service-error"
  | "invalid-client-request"
  | "user-rejected"
  | "send-failed"
  | "send-result-only"
  | "transaction-still-pending"
  | "validation-failed"
  | "unknown";

/**
 * A normalized Soroform error. `kind` is a discriminated union member
 * suitable for an exhaustive `switch`, so a UI can render distinct
 * messaging per failure mode without re-deriving it from the raw error.
 * `message` is a plain-language default suitable for displaying directly;
 * a consuming app is free to override it per `kind`. `cause` retains the
 * original thrown value for logging or deeper inspection.
 */
export interface SoroformError {
  kind: SoroformErrorKind;
  message: string;
  cause: unknown;
}

/**
 * `@stellar/stellar-sdk/contract` defines 16 error classes (in
 * `contract/errors.ts`) but its public barrel only re-exports 13 of them,
 * indirectly, as `AssembledTransaction.Errors`. `SendFailedError`,
 * `SendResultOnlyError`, and `TransactionStillPendingError` are not
 * reachable from the package's public API surface at all, so those three
 * are matched by constructor name below instead of `instanceof`.
 */
const { Errors } = AssembledTransaction;

const KIND_BY_ERROR_CLASS: ReadonlyArray<
  readonly [new (...args: never[]) => Error, SoroformErrorKind, string]
> = [
  [
    Errors.ExpiredState,
    "expired-state",
    "The contract call touched ledger entries that have expired and need to be restored before this transaction can succeed.",
  ],
  [
    Errors.RestorationFailure,
    "restore-failure",
    "Restoring the expired ledger entries required for this call failed.",
  ],
  [
    Errors.NeedsMoreSignatures,
    "needs-more-signatures",
    "This transaction needs signatures from other accounts before it can be sent.",
  ],
  [
    Errors.NoSignatureNeeded,
    "no-signature-needed",
    "This is a read-only call and does not need to be signed or sent.",
  ],
  [
    Errors.NoUnsignedNonInvokerAuthEntries,
    "no-unsigned-non-invoker-auth-entries",
    "There are no remaining authorization entries from other accounts left to sign.",
  ],
  [
    Errors.NoSigner,
    "no-signer",
    "No signing function was provided, so this transaction cannot be signed.",
  ],
  [
    Errors.NotYetSimulated,
    "not-yet-simulated",
    "This transaction has not been simulated yet.",
  ],
  [
    Errors.FakeAccount,
    "fake-account",
    "The source account used to simulate this call does not exist on the network.",
  ],
  [
    Errors.SimulationFailed,
    "simulation-failed",
    "Simulating this contract call failed.",
  ],
  [
    Errors.InternalWalletError,
    "internal-wallet-error",
    "The connected wallet encountered an internal error.",
  ],
  [
    Errors.ExternalServiceError,
    "external-service-error",
    "A service the wallet depends on failed to respond.",
  ],
  [
    Errors.InvalidClientRequest,
    "invalid-client-request",
    "The request sent to the wallet was invalid.",
  ],
  [
    Errors.UserRejected,
    "user-rejected",
    "The request was rejected in the connected wallet.",
  ],
];

const KIND_BY_ERROR_NAME: ReadonlyArray<
  readonly [string, SoroformErrorKind, string]
> = [
  [
    "SendFailedError",
    "send-failed",
    "Sending this transaction to the network failed.",
  ],
  [
    "SendResultOnlyError",
    "send-result-only",
    "The transaction was sent, but its final on-chain result is not yet available.",
  ],
  [
    "TransactionStillPendingError",
    "transaction-still-pending",
    "The transaction is still pending; its final status is not yet known.",
  ],
];

/**
 * Normalizes any error thrown by `@stellar/stellar-sdk` (including all 16
 * `contract` error classes) or by application code into a
 * {@link SoroformError}. This is the single place error-to-message mapping
 * lives in Soroform; hooks should not each reimplement it.
 *
 * @param error - the thrown value, of any shape
 * @returns a {@link SoroformError} with a `kind` suitable for an
 * exhaustive `switch`, and a plain-language default `message`
 *
 * @example
 * ```ts
 * import { normalizeError } from "@soroform/core";
 *
 * try {
 *   await doSomethingWithTheSdk();
 * } catch (error) {
 *   const normalized = normalizeError(error);
 *   console.log(normalized.kind, normalized.message);
 * }
 * ```
 */
export function normalizeError(error: unknown): SoroformError {
  for (const [ErrorClass, kind, message] of KIND_BY_ERROR_CLASS) {
    if (error instanceof ErrorClass) {
      return { kind, message, cause: error };
    }
  }

  if (error instanceof Error) {
    for (const [name, kind, message] of KIND_BY_ERROR_NAME) {
      if (error.constructor.name === name) {
        return { kind, message, cause: error };
      }
    }
    return { kind: "unknown", message: error.message, cause: error };
  }

  return { kind: "unknown", message: String(error), cause: error };
}
