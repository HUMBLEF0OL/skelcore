import { describe, expect, it } from "vitest";
import { evaluateManifestQuality } from "../quality/manifest-quality";
import { createInvalidManifestWithEntry, createManifest } from "./quality-test-helpers";

describe("evaluateManifestQuality", () => {
  it("passes for a valid manifest with required keys", () => {
    const manifest = createManifest(["ProductCard", "HeroBanner"]);

    const result = evaluateManifestQuality({
      manifestData: manifest,
      artifactSizeBytes: 250,
      thresholds: {
        requiredKeys: ["HeroBanner", "ProductCard"],
        minCoverage: 1,
        maxInvalidEntries: 0,
        maxArtifactSizeBytes: 1_024,
      },
    });

    expect(result.gates.overall).toBe(true);
    expect(result.summary.coverageRatio).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when required key coverage is below threshold", () => {
    const manifest = createManifest(["ProductCard"]);

    const result = evaluateManifestQuality({
      manifestData: manifest,
      artifactSizeBytes: 250,
      thresholds: {
        requiredKeys: ["ProductCard", "HeroBanner"],
        minCoverage: 1,
        maxInvalidEntries: 0,
      },
    });

    expect(result.gates.coverage).toBe(false);
    expect(result.missingRequiredKeys).toEqual(["HeroBanner"]);
    expect(result.gates.overall).toBe(false);
  });

  it("fails when invalid entries exceed threshold", () => {
    const result = evaluateManifestQuality({
      manifestData: createInvalidManifestWithEntry(),
      artifactSizeBytes: 250,
      thresholds: {
        requiredKeys: [],
        minCoverage: 1,
        maxInvalidEntries: 0,
      },
    });

    expect(result.summary.invalidEntries).toBe(1);
    expect(result.gates.invalidEntries).toBe(false);
    expect(result.gates.schemaValid).toBe(false);
  });

  it("fails when artifact size exceeds budget", () => {
    const manifest = createManifest(["ProductCard"]);

    const result = evaluateManifestQuality({
      manifestData: manifest,
      artifactSizeBytes: 2_048,
      thresholds: {
        requiredKeys: ["ProductCard"],
        minCoverage: 1,
        maxInvalidEntries: 0,
        maxArtifactSizeBytes: 1_024,
      },
    });

    expect(result.gates.artifactSize).toBe(false);
    expect(result.gates.overall).toBe(false);
  });
});
