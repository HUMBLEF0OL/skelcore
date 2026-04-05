import fs from "node:fs/promises";
import path from "node:path";
import {
  buildQualityReport,
  renderQualityJsonReport,
  renderQualityReportText,
} from "../quality/report-renderer";
import type { CliIo, GateMode, ManifestDiffResult, ManifestQualityResult } from "../types";

interface ReportArgs {
  validateJsonPath?: string;
  diffJsonPath?: string;
  format: "text" | "json";
  outPath?: string;
  mode: GateMode;
}

export async function runReportCommand(argv: string[], io: CliIo): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (!args.validateJsonPath) {
      io.error("Missing required flag: --validate-json <path>");
      return 1;
    }

    const validateJsonPath = path.resolve(process.cwd(), args.validateJsonPath);
    const validateRaw = await fs.readFile(validateJsonPath, "utf8");
    const validateParsed = JSON.parse(validateRaw) as { validate?: ManifestQualityResult };

    if (!validateParsed.validate) {
      io.error("Validate JSON is missing 'validate' payload");
      return 1;
    }

    let diffResult: ManifestDiffResult | undefined;

    if (args.diffJsonPath) {
      const diffJsonPath = path.resolve(process.cwd(), args.diffJsonPath);
      const diffRaw = await fs.readFile(diffJsonPath, "utf8");
      const diffParsed = JSON.parse(diffRaw) as { diff?: ManifestDiffResult };
      diffResult = diffParsed.diff;
    }

    const report = buildQualityReport({
      validate: validateParsed.validate,
      diff: diffResult,
    });

    const output =
      args.format === "json" ? renderQualityJsonReport(report) : renderQualityReportText(report);

    if (args.outPath) {
      const outPath = path.resolve(process.cwd(), args.outPath);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, output, "utf8");
      io.log(`Wrote report: ${outPath}`);
    }

    io.log(output.trimEnd());

    if (!report.overallPass && args.mode === "strict") {
      return 1;
    }

    return 0;
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): ReportArgs {
  const parsed: ReportArgs = {
    format: "text",
    mode: "strict",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--validate-json") {
      parsed.validateJsonPath = next;
      i += 1;
      continue;
    }

    if (arg === "--diff-json") {
      parsed.diffJsonPath = next;
      i += 1;
      continue;
    }

    if (arg === "--format") {
      parsed.format = next === "json" ? "json" : "text";
      i += 1;
      continue;
    }

    if (arg === "--out") {
      parsed.outPath = next;
      i += 1;
      continue;
    }

    if (arg === "--mode") {
      parsed.mode = next === "warn" ? "warn" : "strict";
      i += 1;
      continue;
    }
  }

  return parsed;
}
