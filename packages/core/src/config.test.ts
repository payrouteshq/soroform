import { describe, expect, it } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import { resolveSoroformConfig } from "./config.js";

describe("resolveSoroformConfig", () => {
  it("resolves testnet defaults", () => {
    const config = resolveSoroformConfig({ network: "testnet" });
    expect(config).toEqual({
      network: "testnet",
      rpcUrl: "https://soroban-testnet.stellar.org",
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: Networks.TESTNET,
    });
  });

  it("resolves futurenet defaults", () => {
    const config = resolveSoroformConfig({ network: "futurenet" });
    expect(config.rpcUrl).toBe("https://rpc-futurenet.stellar.org");
    expect(config.networkPassphrase).toBe(Networks.FUTURENET);
  });

  it("lets overrides win over testnet defaults", () => {
    const config = resolveSoroformConfig({
      network: "testnet",
      rpcUrl: "https://custom-rpc.example.com",
    });
    expect(config.rpcUrl).toBe("https://custom-rpc.example.com");
    expect(config.horizonUrl).toBe("https://horizon-testnet.stellar.org");
  });

  it("requires an explicit rpcUrl for mainnet", () => {
    expect(() => resolveSoroformConfig({ network: "mainnet" })).toThrow(
      /mainnet/,
    );
  });

  it("resolves mainnet when rpcUrl is provided", () => {
    const config = resolveSoroformConfig({
      network: "mainnet",
      rpcUrl: "https://mainnet-rpc.example.com",
    });
    expect(config.networkPassphrase).toBe(Networks.PUBLIC);
    expect(config.horizonUrl).toBe("https://horizon.stellar.org");
  });

  it("requires all three fields for a custom network", () => {
    expect(() =>
      resolveSoroformConfig({
        network: "custom",
        rpcUrl: "https://rpc.example.com",
      }),
    ).toThrow(/custom/);
  });

  it("resolves a fully specified custom network", () => {
    const config = resolveSoroformConfig({
      network: "custom",
      rpcUrl: "https://rpc.example.com",
      horizonUrl: "https://horizon.example.com",
      networkPassphrase: "Custom Network ; 2024",
    });
    expect(config).toEqual({
      network: "custom",
      rpcUrl: "https://rpc.example.com",
      horizonUrl: "https://horizon.example.com",
      networkPassphrase: "Custom Network ; 2024",
    });
  });
});
