import {
  lookupAndAcceptEntry,
  type BlueprintManifest,
  type ManifestAcceptanceResult,
  type StructuralHash,
} from "@ghostframe/core";

/**
 * Resolve a manifest entry for a skeleton component.
 * Safe wrapper around manifest lookup and validation.
 */
export function resolveManifestEntry(
  manifest: BlueprintManifest | undefined,
  skeletonKey: string | undefined,
  {
    structuralHash,
    now,
    strictStyleDrift = false,
    styleDriftThreshold = 0,
  }: {
    structuralHash?: string;
    now?: number;
    strictStyleDrift?: boolean;
    styleDriftThreshold?: number;
  } = {}
): ManifestAcceptanceResult {
  if (!manifest) {
    return {
      accepted: false,
      reason: "no-manifest-provided",
    };
  }

  if (!skeletonKey) {
    return {
      accepted: false,
      reason: "no-skeleton-key-provided",
    };
  }

  if (
    manifest.index?.byKey &&
    !manifest.index.byKey[skeletonKey] &&
    !manifest.entries[skeletonKey]
  ) {
    return {
      accepted: false,
      reason: "manifest-index-miss",
    };
  }

  return lookupAndAcceptEntry(manifest, skeletonKey, {
    manifestVersion: manifest.manifestVersion,
    actualStructuralHash: structuralHash as StructuralHash | undefined,
    now,
    strictStyleDrift,
    styleDriftThreshold,
  });
}

/**
 * Check if a manifest entry matches the current document structure.
 * Returns true if the entry is a candidate for use.
 */
export function isManifestEntryCandidate(
  manifest: BlueprintManifest,
  skeletonKey: string,
  { structuralHash, now }: { structuralHash?: string; now?: number }
): boolean {
  const result = resolveManifestEntry(manifest, skeletonKey, {
    structuralHash,
    now,
  });
  return result.accepted;
}
