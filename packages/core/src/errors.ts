import { AssembledTransaction } from "@stellar/stellar-sdk/contract";

export type SorokitErrorKind =
  | "EXPIRED_STATE"
  | "RESTORE_FAILURE"
  | "NEEDS_MORE_SIGNATURES"
  | "NO_SIGNATURE_NEEDED"
  | "NO_UNSIGNED_NON_INVOKER_AUTH_ENTRIES"
  | "NO_SIGNER"
  | "NOT_YET_SIMULATED"
  | "FAKE_ACCOUNT"
  | "SIMULATION_FAILED"
  | "INTERNAL_WALLET_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "INVALID_CLIENT_REQUEST"
  | "USER_REJECTED"
  | "SEND_FAILED"
  | "SEND_RESULT_ONLY"
  | "TRANSACTION_STILL_PENDING"
  | "VALIDATION_FAILED"
  | "UNKNOWN";

export interface SorokitError {
  /**
   * The kind of error
   */
  kind: SorokitErrorKind;
  /**
   * The message of the error
   */
  message: string;
  /**
   * The cause of the error
   */
  cause: unknown;
}

const { Errors } = AssembledTransaction;

const KIND_BY_ERROR_CLASS: ReadonlyArray<
  readonly [new (...args: never[]) => Error, SorokitErrorKind, string]
> = [
  [
    Errors.ExpiredState,
    "EXPIRED_STATE",
    "The contract call touched ledger entries that have expired and need to be restored before this transaction can succeed.",
  ],
  [
    Errors.RestorationFailure,
    "RESTORE_FAILURE",
    "Restoring the expired ledger entries required for this call failed.",
  ],
  [
    Errors.NeedsMoreSignatures,
    "NEEDS_MORE_SIGNATURES",
    "This transaction needs signatures from other accounts before it can be sent.",
  ],
  [
    Errors.NoSignatureNeeded,
    "NO_SIGNATURE_NEEDED",
    "This is a read-only call and does not need to be signed or sent.",
  ],
  [
    Errors.NoUnsignedNonInvokerAuthEntries,
    "NO_UNSIGNED_NON_INVOKER_AUTH_ENTRIES",
    "There are no remaining authorization entries from other accounts left to sign.",
  ],
  [
    Errors.NoSigner,
    "NO_SIGNER",
    "No signing function was provided, so this transaction cannot be signed.",
  ],
  [Errors.NotYetSimulated, "NOT_YET_SIMULATED", "This transaction has not been simulated yet."],
  [
    Errors.FakeAccount,
    "FAKE_ACCOUNT",
    "The source account used to simulate this call does not exist on the network.",
  ],
  [Errors.SimulationFailed, "SIMULATION_FAILED", "Simulating this contract call failed."],
  [
    Errors.InternalWalletError,
    "INTERNAL_WALLET_ERROR",
    "The connected wallet encountered an internal error.",
  ],
  [
    Errors.ExternalServiceError,
    "EXTERNAL_SERVICE_ERROR",
    "A service the wallet depends on failed to respond.",
  ],
  [
    Errors.InvalidClientRequest,
    "INVALID_CLIENT_REQUEST",
    "The request sent to the wallet was invalid.",
  ],
  [Errors.UserRejected, "USER_REJECTED", "The request was rejected in the connected wallet."],
];

const KIND_BY_ERROR_NAME: ReadonlyArray<readonly [string, SorokitErrorKind, string]> = [
  ["SendFailedError", "SEND_FAILED", "Sending this transaction to the network failed."],
  [
    "SendResultOnlyError",
    "SEND_RESULT_ONLY",
    "The transaction was sent, but its final on-chain result is not yet available.",
  ],
  [
    "TransactionStillPendingError",
    "TRANSACTION_STILL_PENDING",
    "The transaction is still pending; its final status is not yet known.",
  ],
];

export function normalizeError(error: unknown): SorokitError {
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
    return { kind: "UNKNOWN", message: error.message, cause: error };
  }

  return { kind: "UNKNOWN", message: String(error), cause: error };
}
