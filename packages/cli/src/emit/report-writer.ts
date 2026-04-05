import type { CaptureConfig, CaptureReport, CapturedArtifact } from "../types";

export function buildCaptureReport(
  config: CaptureConfig,
  artifacts: CapturedArtifact[],
  metrics: { manifestBytes?: number } = {}
): CaptureReport {
  return {
    routesVisited: config.routes.length,
    breakpoints: config.breakpoints,
    targetsDiscovered: artifacts.length,
    artifactsEmitted: artifacts.length,
    manifestBytes: metrics.manifestBytes,
  };
}

export function renderCaptureReport(report: CaptureReport): string {
  const lines = [
    "Ghostframe Capture Report",
    `Routes visited: ${report.routesVisited}`,
    `Breakpoints: ${report.breakpoints.join(", ")}`,
    `Targets discovered: ${report.targetsDiscovered}`,
    `Artifacts emitted: ${report.artifactsEmitted}`,
  ];

  if (typeof report.manifestBytes === "number") {
    lines.push(`Manifest size (bytes): ${report.manifestBytes}`);
  }

  lines.push("");
  return lines.join("\n");
}
