import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Render SLO dashboard from quality gate report.
 * Extracts coverage, invalid entry rate, and artifact size metrics.
 */

async function main() {
  const reportPath = path.resolve(__dirname, "../../.tmp/ghostframe/report.json");
  const reportRaw = await fs.readFile(reportPath, "utf8");
  const report = JSON.parse(reportRaw);

  const summary = report?.validate?.summary;
  if (!summary) {
    throw new Error("Invalid report payload: missing validate.summary");
  }

  const coverage = Number(summary.coverageRatio ?? 0);
  const invalidEntries = Number(summary.invalidEntries ?? 0);
  const entryCount = Number(summary.entryCount ?? 0);
  const invalidRate = entryCount > 0 ? invalidEntries / entryCount : 0;
  const artifactSizeBytes = Number(summary.artifactSizeBytes ?? 0);

  const dashboard = [
    "# Quality SLO Dashboard",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Coverage ratio: ${(coverage * 100).toFixed(2)}%`,
    `- Invalid entry rate: ${(invalidRate * 100).toFixed(2)}%`,
    `- Artifact size (bytes): ${artifactSizeBytes}`,
    "",
    "Source:",
    "- .tmp/ghostframe/report.json",
    "",
  ].join("\n");

  const outPath = path.resolve(__dirname, "../../docs/operations/quality-slo-dashboard.md");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, dashboard, "utf8");
  console.log(`Wrote quality SLO dashboard: ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
