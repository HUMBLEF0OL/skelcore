import { asStructuralHash, type ManifestEntry } from "@ghostframe/core";
import type { Page } from "playwright";
import type { CapturedArtifact } from "../types";
import type { CaptureTarget } from "./target-discovery";

interface ElementBox {
  width: number;
  height: number;
}

export async function extractArtifact(
  page: Page,
  target: CaptureTarget
): Promise<CapturedArtifact | null> {
  const box = await page
    .$eval(target.selector, (element): ElementBox | null => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return null;
      }

      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .catch(() => null);

  if (!box) {
    return null;
  }

  const now = Date.now();
  const entry: ManifestEntry = {
    key: target.key,
    blueprint: {
      version: 1,
      rootWidth: box.width,
      rootHeight: box.height,
      nodes: [],
      generatedAt: now,
      source: "dynamic",
    },
    structuralHash: asStructuralHash(`${target.key}:${box.width}x${box.height}`),
    generatedAt: now,
    ttlMs: 86_400_000,
    quality: {
      confidence: 0.5,
      warnings: ["mvp-dom-box-extraction"],
    },
  };

  return {
    key: target.key,
    entry,
  };
}
