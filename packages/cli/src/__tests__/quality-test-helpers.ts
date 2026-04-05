import type { BlueprintManifest } from "@ghostframe/core";

export function createManifest(keys: string[]): BlueprintManifest {
  const entries = Object.fromEntries(keys.map((key) => [key, createEntry(key)]));

  return {
    manifestVersion: 1,
    packageVersion: "0.1.0",
    build: {
      builtAt: 1,
      appVersion: "test",
    },
    defaults: {
      ttlMs: 60_000,
    },
    entries,
  };
}

export function createInvalidManifestWithEntry(): unknown {
  return {
    manifestVersion: 1,
    packageVersion: "0.1.0",
    build: {
      builtAt: 1,
      appVersion: "test",
    },
    defaults: {
      ttlMs: 60_000,
    },
    entries: {
      ProductCard: {
        key: "ProductCard",
        blueprint: {
          version: 1,
          rootWidth: 320,
          rootHeight: 120,
          nodes: [],
          generatedAt: 1,
          source: "dynamic",
        },
        structuralHash: "hash-1",
        generatedAt: 1,
        ttlMs: -1,
        quality: {
          confidence: 0.9,
          warnings: [],
        },
      },
    },
  };
}

function createEntry(key: string): BlueprintManifest["entries"][string] {
  return {
    key,
    blueprint: {
      version: 1,
      rootWidth: 320,
      rootHeight: 120,
      nodes: [],
      generatedAt: 1,
      source: "dynamic",
    },
    structuralHash: `hash-${key}` as never,
    generatedAt: 1,
    ttlMs: 60_000,
    quality: {
      confidence: 0.9,
      warnings: [],
    },
  };
}
