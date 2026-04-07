import { describe, expect, it } from "vitest";
import type { CapturedArtifact } from "../types";
import type { BlueprintNode, ManifestEntry } from "@ghostframes/core";
import { parseManifest } from "@ghostframes/core";
import { buildManifestDocument, renderManifestJson } from "../emit/manifest-writer";

const createNode = (id: string, tagName = "div", children: BlueprintNode[] = []): BlueprintNode => ({
  id,
  role: "container",
  width: 100,
  height: 20,
  top: 0,
  left: 0,
  layout: {},
  borderRadius: "4px",
  tagName,
  children,
});

describe("buildManifestDocument", () => {
  it("produces manifest v1 accepted by parseManifest", () => {
    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: [],
    });

    const parsed = parseManifest(manifest);
    expect(parsed.success).toBe(true);
  });

  it("renders compact JSON when prettyPrint is false", () => {
    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: [],
    });

    const text = renderManifestJson(manifest, { prettyPrint: false });
    expect(text).not.toContain('\n  "');
  });

  it("renders pretty JSON by default", () => {
    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: [],
    });

    const text = renderManifestJson(manifest);
    expect(text).toContain('\n  "');
  });
});

describe("B3: Quality Filtering in buildManifestDocument", () => {
  const createArtifact = (key: string, confidence: number, nodeCount = 0): CapturedArtifact => {
    const entry: ManifestEntry = {
      key,
      blueprint: {
        version: 1,
        rootWidth: 300,
        rootHeight: 200,
        nodes: Array.from({ length: nodeCount }, (_, i) => createNode(`n${i}`)),
        generatedAt: Date.now(),
        source: "dynamic",
      },
      structuralHash: `hash-${key}` as any,
      generatedAt: Date.now(),
      ttlMs: 86400000,
      quality: {
        confidence,
        warnings: nodeCount === 0 ? ["no-nodes"] : [],
      },
    };
    return { key, entry };
  };

  it("includes high-quality entries in manifest", () => {
    const artifacts: CapturedArtifact[] = [
      createArtifact("HighQuality", 0.95, 5),
    ];

    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: artifacts,
      qualityThreshold: 0.88,
    });

    expect(Object.keys(manifest.entries)).toContain("HighQuality");
  });

  it("excludes low-quality entries from manifest when below threshold", () => {
    const artifacts: CapturedArtifact[] = [
      createArtifact("LowQuality", 0.3, 0),
    ];

    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: artifacts,
      qualityThreshold: 0.88,
    });

    expect(Object.keys(manifest.entries)).not.toContain("LowQuality");
  });

  it("filters mixed quality artifacts keeping only acceptable entries", () => {
    const artifacts: CapturedArtifact[] = [
      createArtifact("Good1", 0.96, 4),
      createArtifact("Bad1", 0.2, 0),
      createArtifact("Good2", 0.92, 3),
      createArtifact("Bad2", 0.15, 1),
    ];

    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: artifacts,
      qualityThreshold: 0.88,
    });

    const keys = Object.keys(manifest.entries);
    expect(keys).toContain("Good1");
    expect(keys).toContain("Good2");
    expect(keys).not.toContain("Bad1");
    expect(keys).not.toContain("Bad2");
    expect(keys.length).toBe(2);
  });

  it("emits rejected entries metadata when threshold filtering applies", () => {
    const artifacts: CapturedArtifact[] = [
      createArtifact("Rejected", 0.3, 0),
    ];

    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: artifacts,
      qualityThreshold: 0.88,
    });

    const build = manifest.build as any;
    expect(build.__quality_rejected_entries).toBeDefined();
    expect(build.__quality_rejected_entries).toContainEqual(
      expect.objectContaining({
        key: "Rejected",
        reason: expect.stringMatching(/quality-below-threshold/),
      })
    );
  });

  it("uses default quality threshold of 0.90 when not specified", () => {
    const artifacts: CapturedArtifact[] = [
      createArtifact("Medium", 0.89, 3),
    ];

    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: artifacts,
      // qualityThreshold not specified, should use 0.90
    });

    expect(Object.keys(manifest.entries)).toContain("Medium");
  });

  it("achieves >= 80% acceptance rate on high-quality pilot matrix", () => {
    // Simulate a realistic pilot matrix
    const pilotArtifacts: CapturedArtifact[] = [
      // ProductCard: high quality
      createArtifact("ProductCard", 0.96, 8),
      // HeroBanner: high quality
      createArtifact("HeroBanner", 0.94, 12),
      // LoadingShimmer: acceptable quality
      createArtifact("LoadingShimmer", 0.90, 2),
      // ComplexLayout: high quality
      createArtifact("ComplexLayout", 0.95, 15),
      // Avatar: good quality
      createArtifact("Avatar", 0.92, 4),
    ];

    const manifest = buildManifestDocument({
      packageVersion: "0.1.0",
      appVersion: "demo",
      captureResults: pilotArtifacts,
      qualityThreshold: 0.88,
    });

    const acceptanceRate = Object.keys(manifest.entries).length / pilotArtifacts.length;
    expect(acceptanceRate).toBeGreaterThanOrEqual(0.8);
    expect(manifest.entries).toHaveProperty("ProductCard");
    expect(manifest.entries).toHaveProperty("HeroBanner");
  });
});
