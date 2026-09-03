import { describe, expect, it } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import { resolveSorokitConfig } from "./config.js";

describe("resolveSorokitConfig", () => {
  it("resolves testnet defaults", () => {
    const config = resolveSorokitConfig({ network: "TESTNET" });
    expect(config).toEqual({
      network: "TESTNET",
      rpcUrl: "https://soroban-testnet.stellar.org",
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: Networks.TESTNET,
    });
  });

  it("resolves futurenet defaults", () => {
    const config = resolveSorokitConfig({ network: "FUTURENET" });
    expect(config.rpcUrl).toBe("https://rpc-futurenet.stellar.org");
    expect(config.networkPassphrase).toBe(Networks.FUTURENET);
  });

  it("lets overrides win over testnet defaults", () => {
    const config = resolveSorokitConfig({
      network: "TESTNET",
      rpcUrl: "https://custom-rpc.example.com",
    });
    expect(config.rpcUrl).toBe("https://custom-rpc.example.com");
    expect(config.horizonUrl).toBe("https://horizon-testnet.stellar.org");
  });

  it("requires an explicit rpcUrl for mainnet", () => {
    expect(() => resolveSorokitConfig({ network: "PUBLIC" })).toThrow(/PUBLIC/);
  });

  it("resolves mainnet when rpcUrl is provided", () => {
    const config = resolveSorokitConfig({
      network: "PUBLIC",
      rpcUrl: "https://mainnet-rpc.example.com",
    });
    expect(config.networkPassphrase).toBe(Networks.PUBLIC);
    expect(config.horizonUrl).toBe("https://horizon.stellar.org");
  });

  it("requires all three fields for a custom network", () => {
    expect(() =>
      resolveSorokitConfig({
        network: "CUSTOM",
        rpcUrl: "https://rpc.example.com",
      }),
    ).toThrow(/CUSTOM/);
  });

  it("resolves a fully specified custom network", () => {
    const config = resolveSorokitConfig({
      network: "CUSTOM",
      rpcUrl: "https://rpc.example.com",
      horizonUrl: "https://horizon.example.com",
      networkPassphrase: "Custom Network ; 2024",
    });
    expect(config).toEqual({
      network: "CUSTOM",
      rpcUrl: "https://rpc.example.com",
      horizonUrl: "https://horizon.example.com",
      networkPassphrase: "Custom Network ; 2024",
    });
  });
});
