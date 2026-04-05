import type { BlueprintManifest, ManifestEntry } from "@ghostframe/core";
import type { CapturedArtifact } from "../types";

export function buildManifestDocument(input: {
  packageVersion: string;
  appVersion: string;
  captureResults: CapturedArtifact[];
}): BlueprintManifest {
  const entries: Record<string, ManifestEntry> = {};

  for (const artifact of input.captureResults) {
    entries[artifact.key] = artifact.entry;
  }

  return {
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
}

export function renderManifestJson(
  manifest: BlueprintManifest,
  options: { prettyPrint?: boolean } = {}
): string {
  const spacing = options.prettyPrint === false ? 0 : 2;
  return `${JSON.stringify(manifest, null, spacing)}\n`;
}
