import { z } from "zod";
import type { xdr } from "@stellar/stellar-sdk";
import type { Spec } from "@stellar/stellar-sdk/contract";
import { sorobanTypeToZod } from "./type-mapping.js";

/**
 * The generated schema and result type for one contract method.
 */
export interface ContractMethodSchema {
  /** Validates a named-args object for this method against its spec. */
  argsSchema: z.ZodTypeAny;
  /**
   * The method's declared return type, for decoding via
   * `spec.funcResToNative`. `undefined` for a method with no return value.
   */
  resultType: xdr.ScSpecTypeDef | undefined;
}

/** A contract's generated schemas, keyed by method name. */
export type ContractSchemas = Record<string, ContractMethodSchema>;

const schemasBySpec = new WeakMap<Spec, ContractSchemas>();

/**
 * Builds a Zod args schema (and notes the result type) for every method
 * in a contract's spec, by iterating `spec.funcs()`. The result is cached
 * per `Spec` instance (via a `WeakMap`), so calling this repeatedly for
 * the same spec, as `useContractCall`/`useContractSend`/`useSorobanForm`
 * do on every render, does not rebuild the schemas each time.
 *
 * @example
 * ```ts
 * import { generateContractSchemas } from "@soroform/contract";
 *
 * const schemas = generateContractSchemas(spec);
 * const { argsSchema } = schemas.transfer;
 * argsSchema.parse({ to: "G...", amount: 100n });
 * ```
 */
export function generateContractSchemas(spec: Spec): ContractSchemas {
  const cached = schemasBySpec.get(spec);
  if (cached) return cached;

  const schemas: ContractSchemas = {};
  for (const func of spec.funcs()) {
    const methodName = func.name.toString();
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const input of func.inputs) {
      shape[input.name.toString()] = sorobanTypeToZod(input.type, spec);
    }
    schemas[methodName] = {
      argsSchema: z.object(shape),
      resultType: func.outputs[0],
    };
  }

  schemasBySpec.set(spec, schemas);
  return schemas;
}
