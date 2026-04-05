import { describe, it, expect } from "vitest";
import { resolveManifestEntry } from "../manifest-resolver.js";
import { asStructuralHash, type BlueprintManifest } from "@ghostframe/core";

describe("manifest-resolver", () => {
  const mockManifest: BlueprintManifest = {
    manifestVersion: 1,
    packageVersion: "0.1.0",
    build: { builtAt: Date.now(), appVersion: "1.0.0" },
    defaults: { ttlMs: 86400000 },
    entries: {
      ProductCard: {
        key: "ProductCard",
        blueprint: {
          version: 1,
          rootWidth: 300,
          rootHeight: 200,
          nodes: [],
          generatedAt: Date.now(),
          source: "dynamic",
        },
        structuralHash: asStructuralHash("hash123"),
        generatedAt: Date.now(),
        ttlMs: 86400000,
        quality: { confidence: 0.95, warnings: [] },
      },
    },
  };

  it("returns manifest entry if key exists and validates", () => {
    const result = resolveManifestEntry(mockManifest, "ProductCard", {});
    expect(result.accepted).toBe(true);
    expect(result.entry?.key).toBe("ProductCard");
  });

  it("rejects entry if key does not exist", () => {
    const result = resolveManifestEntry(mockManifest, "NonExistent", {});
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("rejects entry if TTL is expired", () => {
    const staleInstance: BlueprintManifest = {
      ...mockManifest,
      entries: {
        StaleCard: {
          ...mockManifest.entries.ProductCard,
          key: "StaleCard",
          generatedAt: Date.now() - 200000000, // very old
          ttlMs: 1000, // 1 second TTL
        },
      },
    };
    const result = resolveManifestEntry(staleInstance, "StaleCard", {});
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("stale");
  });

  it("rejects entry if structural hash does not match", () => {
    const result = resolveManifestEntry(mockManifest, "ProductCard", {
      structuralHash: "different_hash",
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("hash");
  });

  it("accepts entry if structural hash matches", () => {
    const result = resolveManifestEntry(mockManifest, "ProductCard", {
      structuralHash: "hash123",
    });
    expect(result.accepted).toBe(true);
  });

  it("returns no-index-match for manifest index misses", () => {
    const manifestWithIndex: BlueprintManifest = {
      ...mockManifest,
      index: { byKey: { ProductCard: ["default"] } },
    };

    const result = resolveManifestEntry(manifestWithIndex, "HeroBanner", {});
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("manifest-index-miss");
  });
});
