import * as React from "react";
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { resolveSorokitConfig, type SorokitNetwork } from "@sorokit/core";
import { useSorokitConfig } from "@sorokit/provider";
import { fetchContractSpec } from "./spec-cache.js";
import { generateContractSchemas } from "./generate-schemas.js";

export interface UseSorobanFormOptions<TFieldValues extends FieldValues = FieldValues> extends Omit<
  UseFormProps<TFieldValues>,
  "resolver"
> {
  /**
   * The deployed contract's address (`C...`)
   */
  contractId: string;
  /**
   * The method whose args schema this form should validate against
   */
  method: string;
  /**
   * Overrides the network from the nearest `SorokitProvider`
   */
  network?: SorokitNetwork;
  /**
   * Contract args that aren't typed into the form
   */
  extraArgs?: Partial<TFieldValues>;
}

/**
 * @example
 * ```tsx
 * import { useSorobanForm } from "@sorokit/contract";
 * import { useWallet } from "@sorokit/wallet-adapter";
 *
 * function TransferForm({ contractId }: { contractId: string }) {
 *   const { address } = useWallet();
 *   const { register, handleSubmit, formState } = useSorobanForm({
 *     contractId,
 *     method: "transfer",
 *     extraArgs: { from: address },
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
  options: UseSorobanFormOptions<TFieldValues>,
): UseFormReturn<TFieldValues> {
  const { contractId, method, network, extraArgs, ...formOptions } = options;
  const contextConfig = useSorokitConfig();
  const config = network ? resolveSorokitConfig({ network }) : contextConfig;
  const queryClient = useQueryClient();

  const extraArgsRef = React.useRef(extraArgs);
  extraArgsRef.current = extraArgs;

  const resolver = React.useMemo<Resolver<TFieldValues>>(
    () => async (values, context, resolverOptions) => {
      const spec = await fetchContractSpec(contractId, config, queryClient);
      const schema = generateContractSchemas(spec)[method];
      if (!schema) {
        throw new Error(`Sorokit: contract has no method named "${method}".`);
      }
      const zodValidate = zodResolver(
        schema.argsSchema as never,
      ) as unknown as Resolver<TFieldValues>;
      return zodValidate({ ...extraArgsRef.current, ...values }, context, resolverOptions);
    },
    [contractId, method, config.networkPassphrase, config.rpcUrl, queryClient],
  );

  return useForm<TFieldValues>({ ...formOptions, resolver });
}
