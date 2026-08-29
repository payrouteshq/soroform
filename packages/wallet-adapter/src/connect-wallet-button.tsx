import * as React from "react";
import { useWallet } from "./context.js";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const baseStyle: React.CSSProperties = {
  fontFamily: "var(--sorokit-button-font-family, inherit)",
  fontSize: "var(--sorokit-button-font-size, 0.875rem)",
  fontWeight: "var(--sorokit-button-font-weight, 600)" as React.CSSProperties["fontWeight"],
  padding: "var(--sorokit-button-padding, 0.5rem 1rem)",
  borderRadius: "var(--sorokit-button-radius, 0.5rem)",
  border: "var(--sorokit-button-border, 1px solid transparent)",
  background: "var(--sorokit-button-bg, #000000)",
  color: "var(--sorokit-button-fg, #ffffff)",
  cursor: "pointer",
};

export interface ConnectWalletButtonProps {
  className?: string;
  /** Label shown when no wallet is connected. Defaults to "Connect Wallet". */
  connectLabel?: string;
}

/**
 * A minimally styled button that opens the wallet picker modal when no
 * wallet is connected, and shows the connected address (disconnecting on
 * click) once one is. Styled entirely through CSS custom properties
 * (`--sorokit-button-*`) so a consuming app can restyle it without
 * overriding classes; the defaults are intentionally plain, since most
 * apps will want their own look.
 *
 * @example
 * ```tsx
 * import { ConnectWalletButton } from "@sorokit/wallet-adapter";
 *
 * function Header() {
 *   return <ConnectWalletButton />;
 * }
 * ```
 */
export function ConnectWalletButton(props: ConnectWalletButtonProps) {
  const { className, connectLabel = "Connect Wallet" } = props;
  const { address, isConnected, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <button
        type="button"
        className={className}
        style={baseStyle}
        onClick={() => {
          void disconnect();
        }}
      >
        {truncateAddress(address)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={baseStyle}
      onClick={() => {
        void connect();
      }}
    >
      {connectLabel}
    </button>
  );
}
