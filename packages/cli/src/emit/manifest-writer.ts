import type { BlueprintManifest, ManifestEntry } from "@ghostframes/core";
import type { CapturedArtifact } from "../types";
import { normalizeManifest } from "../capture/normalization";

export function buildManifestDocument(input: {
  packageVersion: string;
  appVersion: string;
  captureResults: CapturedArtifact[];
}): BlueprintManifest {
  const entries: Record<string, ManifestEntry> = {};

  for (const artifact of input.captureResults) {
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
  return normalizeManifest(manifest);
}

export function renderManifestJson(
  manifest: BlueprintManifest,
  options: { prettyPrint?: boolean } = {}
): string {
  const spacing = options.prettyPrint === false ? 0 : 2;
  return `${JSON.stringify(manifest, null, spacing)}\n`;
}
