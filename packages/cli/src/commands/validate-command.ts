import fs from "node:fs/promises";
import path from "node:path";
import { evaluateManifestQuality } from "../quality/manifest-quality";
import { renderQualityJsonReport, renderQualityTextReport } from "../quality/report-renderer";
import type { CliIo, GateMode, ManifestQualityThresholds, QualityReport } from "../types";

interface ValidateArgs {
  manifestPath?: string;
  requiredKeys: string[];
  minCoverage: number;
  maxInvalidEntries: number;
  maxArtifactSizeKb?: number;
  jsonOutPath?: string;
  textOutPath?: string;
  mode: GateMode;
}

export async function runValidateCommand(argv: string[], io: CliIo): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (!args.manifestPath) {
      io.error("Missing required flag: --manifest <path>");
      return 1;
    }

    const manifestPath = path.resolve(process.cwd(), args.manifestPath);
    const manifestRaw = await fs.readFile(manifestPath, "utf8");

    let manifestData: unknown;
    try {
      manifestData = JSON.parse(manifestRaw);
    } catch {
      io.error(`Manifest is not valid JSON: ${manifestPath}`);
      return 1;
    }

    const thresholds: ManifestQualityThresholds = {
      requiredKeys: args.requiredKeys,
      minCoverage: args.minCoverage,
      maxInvalidEntries: args.maxInvalidEntries,
      maxArtifactSizeBytes:
        args.maxArtifactSizeKb === undefined
          ? undefined
          : Math.floor(args.maxArtifactSizeKb * 1024),
    };

    const quality = evaluateManifestQuality({
      manifestData,
      artifactSizeBytes: Buffer.byteLength(manifestRaw, "utf8"),
      thresholds,
    });

    const report: QualityReport = {
      generatedAt: new Date().toISOString(),
      overallPass: quality.gates.overall,
      validate: quality,
    };

    const textOutput = renderQualityTextReport(quality);

    if (args.textOutPath) {
      const outPath = path.resolve(process.cwd(), args.textOutPath);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, textOutput, "utf8");
      io.log(`Wrote text report: ${outPath}`);
    }

    if (args.jsonOutPath) {
      const outPath = path.resolve(process.cwd(), args.jsonOutPath);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, renderQualityJsonReport(report), "utf8");
      io.log(`Wrote JSON report: ${outPath}`);
    }

    io.log(textOutput.trimEnd());

    if (!quality.gates.overall && args.mode === "strict") {
      for (const error of quality.errors) {
        io.error(error);
      }
      return 1;
    }

    return 0;
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): ValidateArgs {
  const parsed: ValidateArgs = {
    requiredKeys: [],
    minCoverage: 1,
    maxInvalidEntries: 0,
    mode: "strict",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--manifest") {
      parsed.manifestPath = next;
      i += 1;
      continue;
    }

    if (arg === "--required-keys") {
      parsed.requiredKeys = splitCsv(next);
      i += 1;
      continue;
    }

    if (arg === "--min-coverage") {
      parsed.minCoverage = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--max-invalid") {
      parsed.maxInvalidEntries = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--max-size-kb") {
      parsed.maxArtifactSizeKb = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--json-out") {
      parsed.jsonOutPath = next;
      i += 1;
      continue;
    }

    if (arg === "--text-out") {
      parsed.textOutPath = next;
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

function splitCsv(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .sort();
}
