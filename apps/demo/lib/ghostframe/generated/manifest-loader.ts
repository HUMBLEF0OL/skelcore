import type { BlueprintManifest } from '@ghostframe/ghostframe/runtime';
export const generatedManifest: BlueprintManifest = {
  "manifestVersion": 1,
  "packageVersion": "0.1.0",
  "build": {
    "builtAt": 1775376789764,
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
        "rootWidth": 1054,
        "rootHeight": 208,
        "nodes": [],
        "generatedAt": 1775376789687,
        "source": "dynamic"
      },
      "structuralHash": "ProductCard:1054x208",
      "generatedAt": 1775376789687,
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
