import { describe, expect, it } from "vitest";
import * as wallet from "./index.js";

describe("@soroform/wallet public exports", () => {
  it("exports the documented public API", () => {
    expect(typeof wallet.WalletProvider).toBe("function");
    expect(typeof wallet.useWallet).toBe("function");
    expect(typeof wallet.ConnectWalletButton).toBe("function");
    expect(typeof wallet.createDefaultModules).toBe("function");
    expect(typeof wallet.toWalletKitNetwork).toBe("function");
  });
});
