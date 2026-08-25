/**
 * Formats a raw integer amount (as Stellar/Soroban represent token
 * amounts: an integer count of the smallest unit) into a decimal string,
 * given the asset's decimal places.
 */
export function formatAmount(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();

  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = (abs % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  const sign = negative ? "-" : "";

  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}
