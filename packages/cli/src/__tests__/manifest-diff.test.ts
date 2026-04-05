import { describe, expect, it } from "vitest";
import { evaluateManifestDiff } from "../quality/manifest-diff";
import { createManifest } from "./quality-test-helpers";

describe("evaluateManifestDiff", () => {
  it("returns zero changes for identical manifests", () => {
    const manifest = createManifest(["ProductCard"]);

    const result = evaluateManifestDiff({
      baseManifest: manifest,
      candidateManifest: manifest,
      thresholds: {},
    });

    expect(result.gates.overall).toBe(true);
    expect(result.summary).toEqual({ added: 0, removed: 0, changed: 0 });
  });

  it("detects added, removed, and changed keys", () => {
    const base = createManifest(["A", "B"]);
    const candidate = createManifest(["B", "C"]);
    candidate.entries.B.structuralHash = "different" as never;

    const result = evaluateManifestDiff({
      baseManifest: base,
      candidateManifest: candidate,
      thresholds: {},
    });

    expect(result.addedKeys).toEqual(["C"]);
    expect(result.removedKeys).toEqual(["A"]);
    expect(result.changedKeys).toEqual(["B"]);
  });

  it("fails changed threshold when max is exceeded", () => {
    const base = createManifest(["A"]);
    const candidate = createManifest(["A"]);
    candidate.entries.A.structuralHash = "changed" as never;

    const result = evaluateManifestDiff({
      baseManifest: base,
      candidateManifest: candidate,
      thresholds: {
        maxChangedKeys: 0,
      },
    });

    expect(result.gates.changeBudget).toBe(false);
    expect(result.gates.overall).toBe(false);
  });
});
