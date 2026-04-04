import type { BlueprintManifest } from '@skelcore/skelcore/runtime';
export const generatedManifest: BlueprintManifest = {
  "manifestVersion": 1,
  "packageVersion": "0.1.0",
  "build": {
    "builtAt": 1775306155735,
    "appVersion": "demo"
  },
  "defaults": {
    "ttlMs": 86400000
  },
  "entries": {
    "ProductCard": {
      "key": "ProductCard",
      "blueprint": {
        "version": 1,
        "rootWidth": 661,
        "rootHeight": 200,
        "nodes": [],
        "generatedAt": 1775306155637,
        "source": "dynamic"
      },
      "structuralHash": "ProductCard:661x200",
      "generatedAt": 1775306155637,
      "ttlMs": 86400000,
      "quality": {
        "confidence": 0.5,
        "warnings": [
          "mvp-dom-box-extraction"
        ]
      }
    }
  }
} as unknown as BlueprintManifest;
export default generatedManifest;
