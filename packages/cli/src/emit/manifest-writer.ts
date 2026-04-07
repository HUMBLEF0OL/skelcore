import type { BlueprintManifest, ManifestEntry } from "@ghostframes/core";
import type { CapturedArtifact } from "../types";
import { normalizeManifest } from "../capture/normalization";
import { isQualityAcceptable } from "../capture/blueprint-quality-scorer";

/**
 * Build manifest document B3: emit quality metadata and apply quality filtering
 * Entries below quality threshold are excluded with explicit rejection reason
 */
export function buildManifestDocument(input: {
  packageVersion: string;
  appVersion: string;
  captureResults: CapturedArtifact[];
  qualityThreshold?: number;
}): BlueprintManifest {
  const qualityThreshold = input.qualityThreshold ?? 0.9;
  const entries: Record<string, ManifestEntry> = {};
  const rejectedEntries: Array<{ key: string; reason: string }> = [];

  for (const artifact of input.captureResults) {
    // B3: Evaluate quality and exclude low-quality blueprints
    const isAcceptable = isQualityAcceptable(artifact.entry, { threshold: qualityThreshold });

    if (!isAcceptable) {
      rejectedEntries.push({
        key: artifact.key,
        reason: `quality-below-threshold (${artifact.quality?.score ?? 0.5} < ${qualityThreshold})`,
      });
      continue;
    }

    entries[artifact.key] = artifact.entry;
  }

  const manifest: BlueprintManifest = {
    manifestVersion: 1,
    packageVersion: input.packageVersion,
    build: {
      builtAt: Date.now(),
      appVersion: input.appVersion,
    },
    defaults: {
      ttlMs: 86_400_000,
    },
    entries,
  };

  // Apply deterministic normalization for B2
  const normalized = normalizeManifest(manifest);

  // Emit quality metadata: store rejected entries count in build metadata
  if (rejectedEntries.length > 0) {
    (normalized.build as any).__quality_rejected_entries = rejectedEntries;
  }

  return normalized;
}

export function renderManifestJson(
  manifest: BlueprintManifest,
  options: { prettyPrint?: boolean } = {}
): string {
  const spacing = options.prettyPrint === false ? 0 : 2;
  return `${JSON.stringify(manifest, null, spacing)}\n`;
}
