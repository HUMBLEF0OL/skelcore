import type { BlueprintManifest, ManifestEntry } from "@ghostframes/core";

/**
 * Canonical normalization rules for deterministic manifest generation.
 * Removes entropy while preserving semantic content.
 */

export function normalizeManifestEntry(entry: ManifestEntry): ManifestEntry {
  return {
    ...entry,
    // Strip generatedAt timestamps for determinism
    generatedAt: 0,
    // Sort quality warnings alphabetically for consistency
    quality: {
      ...entry.quality,
      warnings: [...entry.quality.warnings].sort(),
    },
    // Normalize blueprint if present
    blueprint: normalizeBlueprint(entry.blueprint),
  };
}

export function normalizeBlueprint(blueprint: any): any {
  return {
    ...blueprint,
    // Strip generatedAt from blueprint
    generatedAt: 0,
    // Normalize nodes array - sort by stable key or index
    nodes: normalizeNodeArray(blueprint.nodes ?? []),
    // Canonicalize numeric fields to 3 decimal places
    rootWidth: canonicalizeNumber(blueprint.rootWidth),
    rootHeight: canonicalizeNumber(blueprint.rootHeight),
  };
}

export function normalizeNodeArray(nodes: any[]): any[] {
  if (!Array.isArray(nodes)) return [];
  
  return nodes
    .map((node) => normalizeNode(node))
    .sort((a, b) => {
      // Sort by key or id for stable ordering
      const keyA = a.key ?? a.id ?? "";
      const keyB = b.key ?? b.id ?? "";
      return String(keyA).localeCompare(String(keyB));
    });
}

export function normalizeNode(node: any): any {
  const normalized: any = {
    ...node,
  };

  // Recursively normalize numeric fields
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === "number") {
      normalized[key] = canonicalizeNumber(value);
    } else if (Array.isArray(value)) {
      normalized[key] = value.map((v) => (typeof v === "number" ? canonicalizeNumber(v) : v));
    } else if (typeof value === "object" && value !== null) {
      normalized[key] = normalizeNode(value);
    }
  }

  // Sort object keys for consistent serialization
  const sorted: any = {};
  for (const key of Object.keys(normalized).sort()) {
    sorted[key] = normalized[key];
  }

  return sorted;
}

export function canonicalizeNumber(value: number): number {
  if (typeof value !== "number" || !isFinite(value)) {
    return value;
  }
  // Round to 3 decimal places
  return Math.round(value * 1000) / 1000;
}

export function normalizeManifest(manifest: BlueprintManifest): BlueprintManifest {
  return {
    ...manifest,
    // Strip/normalize build metadata that contains entropy
    build: {
      ...manifest.build,
      // Set fixed timestamp for determinism
      builtAt: 0,
      // Preserve appVersion for validation
    },
    // Normalize all entries
    entries: Object.fromEntries(
      Object.entries(manifest.entries)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, entry]) => [key, normalizeManifestEntry(entry)])
    ),
  };
}

/**
 * Compare two manifests for structural changes.
 * Returns list of diffs that are expected vs unexpected.
 */
export function classifyManifestDiffs(
  old: BlueprintManifest,
  new_: BlueprintManifest,
  expectedChangedKeys: Set<string> = new Set()
): Array<{ key: string; field: string; classification: "expected" | "unexpected" }> {
  const diffs: Array<{ key: string; field: string; classification: "expected" | "unexpected" }> = [];

  const oldEntries = old.entries ?? {};
  const newEntries = new_.entries ?? {};

  // Check for added/removed/changed keys
  const allKeys = new Set([...Object.keys(oldEntries), ...Object.keys(newEntries)]);

  for (const key of allKeys) {
    const oldEntry = oldEntries[key];
    const newEntry = newEntries[key];

    if (!oldEntry && newEntry) {
      // Added key - generally unexpected unless in expected list
      diffs.push({
        key,
        field: "entry",
        classification: expectedChangedKeys.has(key) ? "expected" : "unexpected",
      });
    } else if (oldEntry && !newEntry) {
      // Removed key - generally unexpected
      diffs.push({
        key,
        field: "entry",
        classification: expectedChangedKeys.has(key) ? "expected" : "unexpected",
      });
    } else if (oldEntry && newEntry) {
      // Check for field changes
      const oldJson = JSON.stringify(oldEntry);
      const newJson = JSON.stringify(newEntry);

      if (oldJson !== newJson) {
        diffs.push({
          key,
          field: "content",
          classification: expectedChangedKeys.has(key) ? "expected" : "unexpected",
        });
      }
    }
  }

  return diffs;
}
