import { asStructuralHash, type ManifestEntry } from "@ghostframes/core";
import type { Page } from "playwright";
import type { CapturedArtifact } from "../types";
import type { CaptureTarget } from "./target-discovery";
import { scoreBlueprint, isQualityAcceptable } from "./blueprint-quality-scorer";

interface ElementBox {
  width: number;
  height: number;
}

/**
 * Extract blueprint artifact with quality evaluation.
 * Returns null if extraction fails or quality falls below minimum threshold.
 * Includes quality metadata in the entry for manifest emission.
 */
export async function extractArtifact(
  page: Page,
  target: CaptureTarget,
  options: { qualityThreshold?: number } = {}
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

  // Evaluate quality with B3 quality scorer
  const score = scoreBlueprint(entry);
  const qualityThreshold = options.qualityThreshold ?? 0.7; // MVP threshold; B3 hardens to 0.88+

  if (score < qualityThreshold) {
    return null; // Reject low-quality blueprints
  }

  return {
    key: target.key,
    entry,
    quality: {
      score,
      accepted: isQualityAcceptable(entry, { threshold: qualityThreshold }),
    },
  };
}
