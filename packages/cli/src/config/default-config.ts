import type { CaptureConfig } from "../types";

export const DEFAULT_CAPTURE_CONFIG: Omit<CaptureConfig, "routes"> = {
  baseUrl: "http://localhost:3005",
  breakpoints: [375, 768, 1280],
  viewportHeight: 900,
  outputDir: "apps/demo/lib/ghostframes/generated",
  manifestFileName: "manifest.json",
  loaderFileName: "manifest-loader.ts",
  selector: "[data-skeleton-key]",
  waitForMs: 150,
  retries: 2,
  prettyPrintManifest: true,
  // Parity & determinism defaults
  enableParityCheck: true,
  parityThreshold: 0.95,
  maxSelectorMismatchCount: 0,
  enableDeterminismCheck: true,
  maxUnexpectedDiffRate: 0.01,
  pilotRoutes: ["/rtl", "/config-playground", "/reference", "/advanced"],
};
