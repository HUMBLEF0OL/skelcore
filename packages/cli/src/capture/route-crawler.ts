import type { BrowserContext } from "playwright";
import type { CaptureConfig, CapturedArtifact } from "../types";
import { extractArtifact } from "./blueprint-extractor";
import { discoverTargets } from "./target-discovery";

export async function crawlRoutes(
  context: BrowserContext,
  config: CaptureConfig
): Promise<CapturedArtifact[]> {
  const emitted = new Map<string, CapturedArtifact>();

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
        for (const target of targets) {
          const artifact = await extractArtifact(page, target);
          if (!artifact) {
            continue;
          }
          emitted.set(artifact.key, artifact);
        }
      }
    } finally {
      await page.close();
    }

    if (keyedTargetsForRoute === 0) {
      throw new Error(`No keyed targets discovered for route: ${route}`);
    }
  }

  return Array.from(emitted.values());
}
