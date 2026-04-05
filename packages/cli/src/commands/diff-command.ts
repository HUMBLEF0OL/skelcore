import fs from "node:fs/promises";
import path from "node:path";
import { evaluateManifestDiff } from "../quality/manifest-diff";
import { renderDiffTextReport, renderQualityJsonReport } from "../quality/report-renderer";
import type { CliIo, GateMode, ManifestDiffThresholds, QualityReport } from "../types";

interface DiffArgs {
  basePath?: string;
  candidatePath?: string;
  maxChangedKeys?: number;
  jsonOutPath?: string;
  textOutPath?: string;
  mode: GateMode;
}

export async function runDiffCommand(argv: string[], io: CliIo): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (!args.basePath || !args.candidatePath) {
      io.error("Missing required flags: --base <path> --candidate <path>");
      return 1;
    }

    const basePath = path.resolve(process.cwd(), args.basePath);
    const candidatePath = path.resolve(process.cwd(), args.candidatePath);

    const [baseRaw, candidateRaw] = await Promise.all([
      fs.readFile(basePath, "utf8"),
      fs.readFile(candidatePath, "utf8"),
    ]);

    let baseManifest: unknown;
    let candidateManifest: unknown;

    try {
      baseManifest = JSON.parse(baseRaw);
    } catch {
      io.error(`Base manifest is not valid JSON: ${basePath}`);
      return 1;
    }

    try {
      candidateManifest = JSON.parse(candidateRaw);
    } catch {
      io.error(`Candidate manifest is not valid JSON: ${candidatePath}`);
      return 1;
    }

    const thresholds: ManifestDiffThresholds = {
      maxChangedKeys: args.maxChangedKeys,
    };

    const diff = evaluateManifestDiff({
      baseManifest,
      candidateManifest,
      thresholds,
    });

    const report: QualityReport = {
      generatedAt: new Date().toISOString(),
      overallPass: diff.gates.overall,
      validate: {
        summary: {
          entryCount: 0,
          totalRequiredKeys: 0,
          presentRequiredKeys: 0,
          coverageRatio: 1,
          invalidEntries: 0,
          artifactSizeBytes: 0,
        },
        gates: {
          schemaValid: true,
          coverage: true,
          requiredKeys: true,
          invalidEntries: true,
          artifactSize: true,
          overall: true,
        },
        missingRequiredKeys: [],
        invalidEntryKeys: [],
        errors: [],
      },
      diff,
    };

    const textOutput = renderDiffTextReport(diff);

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

    if (!diff.gates.overall && args.mode === "strict") {
      for (const error of diff.errors) {
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

function parseArgs(argv: string[]): DiffArgs {
  const parsed: DiffArgs = {
    mode: "strict",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--base") {
      parsed.basePath = next;
      i += 1;
      continue;
    }

    if (arg === "--candidate") {
      parsed.candidatePath = next;
      i += 1;
      continue;
    }

    if (arg === "--max-changed") {
      parsed.maxChangedKeys = Number(next);
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
