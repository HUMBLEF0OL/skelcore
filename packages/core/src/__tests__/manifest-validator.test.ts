import { describe, it, expect } from "vitest";
import type {
  BlueprintManifest,
  ManifestEntry,
  ManifestQuality,
  StructuralHash,
} from "../manifest-types.js";
import { parseManifest, parseEntry } from "../manifest-validator.js";

describe("manifest-types", () => {
  it("defines manifest v1 with required top-level fields", () => {
    // This test validates TypeScript compilation of the types
    const manifest: BlueprintManifest = {
      manifestVersion: 1,
      packageVersion: "0.1.0",
      build: {
        commitSha: "abc123",
        builtAt: Date.now(),
        appVersion: "1.0.0",
      },
      entries: {},
      defaults: {
        ttlMs: 86400000,
      },
    };
    expect(manifest.manifestVersion).toBe(1);
  });

  it("defines manifest entry with optional variants", () => {
    const entry: ManifestEntry = {
      key: "ProductCard",
      blueprint: {
        version: 1,
        rootWidth: 300,
        rootHeight: 200,
        nodes: [],
        generatedAt: Date.now(),
        source: "dynamic",
      },
      structuralHash: "hash123" as unknown as StructuralHash,
      generatedAt: Date.now(),
      ttlMs: 86400000,
      quality: {
        confidence: 0.95,
        warnings: [],
      },
    };
    expect(entry.key).toBe("ProductCard");
  });

  it("quality object tracks confidence and warnings", () => {
    const quality: ManifestQuality = {
      confidence: 0.85,
      warnings: ["font-not-loaded", "responsive-breakpoint-detected"],
    };
    expect(quality.warnings.length).toBe(2);
  });
});

describe("manifest validator", () => {
  describe("parseManifest", () => {
    it("rejects null/undefined input", () => {
      expect(parseManifest(null).success).toBe(false);
      expect(parseManifest(undefined).success).toBe(false);
      expect(parseManifest({}).success).toBe(false);
    });

    it("rejects missing required top-level fields", () => {
      const incomplete = {
        manifestVersion: 1,
        packageVersion: "0.1.0",
        // missing build, defaults, entries
      };
      const result = parseManifest(incomplete);
      expect(result.success).toBe(false);
      expect(result.error).toContain("build");
    });

    it("accepts valid manifest with all fields", () => {
      const valid = {
        manifestVersion: 1,
        packageVersion: "0.1.0",
        build: { builtAt: Date.now(), appVersion: "1.0.0" },
        defaults: { ttlMs: 86400000 },
        entries: {},
      };
      const result = parseManifest(valid);
      expect(result.success).toBe(true);
      expect(result.manifest?.manifestVersion).toBe(1);
    });

    it("rejects unsupported manifest version", () => {
      const future = {
        manifestVersion: 99,
        packageVersion: "0.1.0",
        build: { builtAt: Date.now(), appVersion: "1.0.0" },
        defaults: { ttlMs: 86400000 },
        entries: {},
      };
      const result = parseManifest(future);
      expect(result.success).toBe(false);
      expect(result.error).toContain("version");
    });

    it("validates entry structure", () => {
      const withEntry = {
        manifestVersion: 1,
        packageVersion: "0.1.0",
        build: { builtAt: Date.now(), appVersion: "1.0.0" },
        defaults: { ttlMs: 86400000 },
        entries: {
          BadEntry: {
            key: "BadEntry",
            // missing blueprint, structuralHash
          },
        },
      };
      const result = parseManifest(withEntry);
      expect(result.success).toBe(false);
      expect(result.error).toContain("BadEntry");
    });

    it("coerces buildMetadata optional fields", () => {
      const minimal = {
        manifestVersion: 1,
        packageVersion: "0.1.0",
        build: { builtAt: Date.now(), appVersion: "1.0.0" },
        defaults: { ttlMs: 86400000 },
        entries: {},
      };
      const result = parseManifest(minimal);
      expect(result.success).toBe(true);
      expect(result.manifest?.build.commitSha).toBeUndefined();
    });
  });

  describe("parseEntry", () => {
    it("rejects entry without blueprint", () => {
      const bad = { key: "test", structuralHash: "hash" };
      const result = parseEntry(bad);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("blueprint");
    });

    it("accepts entry with all required fields", () => {
      const good = {
        key: "Card",
        blueprint: {
          version: 1,
          rootWidth: 200,
          rootHeight: 100,
          nodes: [],
          generatedAt: Date.now(),
          source: "dynamic",
        },
        structuralHash: "hash123",
        generatedAt: Date.now(),
        ttlMs: 86400000,
        quality: { confidence: 0.9, warnings: [] },
      };
      const result = parseEntry(good);
      expect(result.valid).toBe(true);
      expect(result.entry?.key).toBe("Card");
    });
  });
});
