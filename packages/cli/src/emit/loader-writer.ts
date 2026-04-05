import type { BlueprintManifest } from "@ghostframe/core";

export function renderManifestLoader(manifest: BlueprintManifest): string {
  const serialized = JSON.stringify(manifest, null, 2);
  return [
    "import type { BlueprintManifest } from '@ghostframe/ghostframe/runtime';",
    `export const generatedManifest: BlueprintManifest = ${serialized} as unknown as BlueprintManifest;`,
    "export default generatedManifest;",
    "",
  ].join("\n");
}
