import type { BlueprintManifest } from "@ghostframes/core";

export function renderManifestLoader(manifest: BlueprintManifest): string {
  const serialized = JSON.stringify(manifest, null, 2);
  return [
    "import type { BlueprintManifest } from '@ghostframes/runtime';",
    `export const generatedManifest: BlueprintManifest = ${serialized} as unknown as BlueprintManifest;`,
    "export default generatedManifest;",
    "",
  ].join("\n");
}
