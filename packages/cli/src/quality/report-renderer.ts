import type { ManifestDiffResult, ManifestQualityResult, QualityReport } from "../types";

export function buildQualityReport(input: {
  validate: ManifestQualityResult;
  diff?: ManifestDiffResult;
}): QualityReport {
  const overallPass =
    input.validate.gates.overall && (input.diff ? input.diff.gates.overall : true);

  return {
    generatedAt: new Date().toISOString(),
    overallPass,
    validate: input.validate,
    diff: input.diff,
  };
}

export function renderQualityTextReport(result: ManifestQualityResult): string {
  return [
    "Ghostframe Manifest Validation",
    `Overall: ${result.gates.overall ? "PASS" : "FAIL"}`,
    `Schema valid: ${result.gates.schemaValid}`,
    `Coverage ratio: ${result.summary.coverageRatio.toFixed(3)}`,
    `Required keys: ${result.summary.presentRequiredKeys}/${result.summary.totalRequiredKeys}`,
    `Invalid entries: ${result.summary.invalidEntries}`,
    `Artifact size (bytes): ${result.summary.artifactSizeBytes}`,
    result.errors.length === 0 ? "Errors: none" : `Errors: ${result.errors.join(" | ")}`,
    "",
  ].join("\n");
}

export function renderDiffTextReport(result: ManifestDiffResult): string {
  return [
    "Ghostframe Manifest Diff",
    `Overall: ${result.gates.overall ? "PASS" : "FAIL"}`,
    `Added keys: ${result.summary.added}`,
    `Removed keys: ${result.summary.removed}`,
    `Changed keys: ${result.summary.changed}`,
    `Changed key names: ${result.changedKeys.join(", ") || "none"}`,
    result.errors.length === 0 ? "Errors: none" : `Errors: ${result.errors.join(" | ")}`,
    "",
  ].join("\n");
}

export function renderQualityReportText(report: QualityReport): string {
  const lines = [
    "Ghostframe Quality Report",
    `Generated at: ${report.generatedAt}`,
    `Overall: ${report.overallPass ? "PASS" : "FAIL"}`,
    "",
    renderQualityTextReport(report.validate).trimEnd(),
  ];

  if (report.diff) {
    lines.push("", renderDiffTextReport(report.diff).trimEnd());
  }

  return `${lines.join("\n")}\n`;
}

export function renderQualityJsonReport(report: QualityReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
