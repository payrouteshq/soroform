import * as React from "react";
import { useForm, type FieldValues, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { resolveSoroformConfig, type SoroformNetwork } from "@soroform/core";
import { useSoroformConfig } from "@soroform/provider";
import { fetchContractSpec } from "./spec-cache.js";
import { generateContractSchemas } from "./generate-schemas.js";

export interface UseSorobanFormOptions {
  /** The deployed contract's address (`C...`). */
  contractId: string;
  /** The method whose args schema this form should validate against. */
  method: string;
  /** Overrides the network from the nearest `SoroformProvider`. */
  network?: SoroformNetwork;
}

/**
 * Wraps `react-hook-form`'s `useForm`, sourcing its `resolver` from the
 * Zod args schema generated for the given contract method. The schema
 * itself is resolved lazily and asynchronously (the contract's spec is
 * fetched, and its per-method schemas derived, the first time this form
 * validates), which `react-hook-form` supports natively via an async
 * resolver, so no separate loading state is needed before the form can be
 * used.
 *
 * `react-hook-form` and `@hookform/resolvers` are peer dependencies: this
 * package does not bundle its own copy, so the consuming app controls
 * their versions.
 *
 * @example
 * ```tsx
 * import { useSorobanForm } from "@soroform/contract";
 *
 * function TransferForm({ contractId }: { contractId: string }) {
 *   const { register, handleSubmit, formState } = useSorobanForm({
 *     contractId,
 *     method: "transfer",
 *   });
 *   return (
 *     <form onSubmit={handleSubmit((values) => console.log(values))}>
 *       <input {...register("to")} />
 *       {formState.errors.to && <p>{String(formState.errors.to.message)}</p>}
 *       <button type="submit">Transfer</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useSorobanForm<TFieldValues extends FieldValues = FieldValues>(
  options: UseSorobanFormOptions,
): UseFormReturn<TFieldValues> {
  const { contractId, method, network } = options;
  const contextConfig = useSoroformConfig();
  const config = network ? resolveSoroformConfig({ network }) : contextConfig;
  const queryClient = useQueryClient();

  const resolver = React.useMemo<Resolver<TFieldValues>>(
    () => async (values, context, resolverOptions) => {
      const spec = await fetchContractSpec(contractId, config, queryClient);
      const schema = generateContractSchemas(spec)[method];
      if (!schema) {
        throw new Error(`Soroform: contract has no method named "${method}".`);
      }
      // The schema's shape is only known at runtime (it is derived from
      // the contract's spec), so it cannot be threaded through
      // zodResolver's generics; this narrow cast is the boundary where
      // that dynamic-ness is acknowledged, not a blanket escape hatch.
      const zodValidate = zodResolver(schema.argsSchema as never) as unknown as Resolver<
        TFieldValues
      >;
      return zodValidate(values, context, resolverOptions);
    },
    [contractId, method, config.networkPassphrase, config.rpcUrl, queryClient],
  );

  return useForm<TFieldValues>({ resolver });
}
