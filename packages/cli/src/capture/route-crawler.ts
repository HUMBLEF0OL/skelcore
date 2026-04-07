import type { BrowserContext } from "playwright";
import type { CaptureConfig, CapturedArtifact, ParityObservation } from "../types";
import { extractArtifact } from "./blueprint-extractor";
import { discoverTargets } from "./target-discovery";

export interface CrawlRoutesResult {
  artifacts: CapturedArtifact[];
  parityObservations: ParityObservation[];
}

export async function crawlRoutes(
  context: BrowserContext,
  config: CaptureConfig
): Promise<CrawlRoutesResult> {
  const emitted = new Map<string, CapturedArtifact>();
  const parityObservations: ParityObservation[] = [];

  for (const route of config.routes) {
    let keyedTargetsForRoute = 0;
    const page = await context.newPage();

    try {
      for (const breakpoint of config.breakpoints) {
        await page.setViewportSize({ width: breakpoint, height: config.viewportHeight });
        const targetUrl = `${config.baseUrl}${route}`;
        await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 15_000 });
        await page.waitForTimeout(config.waitForMs);

        const targets = await discoverTargets(page, config.selector);
        keyedTargetsForRoute += targets.length;
        const discoveredKeys = targets.map((target) => target.key).sort();
        const extractedKeys: string[] = [];
        let extractionFailures = 0;

        for (const target of targets) {
          const artifact = await extractArtifact(page, target);
          if (!artifact) {
            extractionFailures += 1;
            continue;
          }

          extractedKeys.push(artifact.key);
          emitted.set(artifact.key, artifact);
        }

        parityObservations.push({
          route,
          breakpoint,
          discoveredKeys,
          extractedKeys: extractedKeys.sort(),
          extractionFailures,
        });
      }
    } finally {
      await page.close();
    }

    if (keyedTargetsForRoute === 0) {
      throw new Error(`No keyed targets discovered for route: ${route}`);
    }
  }

  return {
    artifacts: Array.from(emitted.values()),
    parityObservations,
  };
}
