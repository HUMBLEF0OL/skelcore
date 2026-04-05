import { chromium } from "playwright";
import type { CaptureConfig, CaptureRunResult } from "../types";
import { crawlRoutes } from "./route-crawler";

export async function runBrowserCapture(config: CaptureConfig): Promise<CaptureRunResult> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const artifacts = await crawlRoutes(context, config);
    await context.close();
    return {
      ok: true,
      artifacts,
    };
  } catch (error) {
    return {
      ok: false,
      artifacts: [],
      fatalError: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser?.close();
  }
}
