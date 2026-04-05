import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runReportCommand } from "../commands/report-command";
import type { ManifestDiffResult, ManifestQualityResult } from "../types";

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
});

describe("runReportCommand", () => {
  it("returns 1 when validate json is missing", async () => {
    const code = await runReportCommand([], {
      log: vi.fn(),
      error: vi.fn(),
    });

    expect(code).toBe(1);
  });

  it("returns 1 when strict report has failed validate result", async () => {
    const dir = await mkTmpDir();
    const validatePath = path.join(dir, "validate.json");

    await fs.writeFile(
      validatePath,
      JSON.stringify({ validate: createValidateResult(false) }, null, 2),
      "utf8"
    );

    const code = await runReportCommand(["--validate-json", validatePath, "--mode", "strict"], {
      log: vi.fn(),
      error: vi.fn(),
    });

    expect(code).toBe(1);
  });

  it("writes JSON report output", async () => {
    const dir = await mkTmpDir();
    const validatePath = path.join(dir, "validate.json");
    const diffPath = path.join(dir, "diff.json");
    const outputPath = path.join(dir, "report.json");

    await fs.writeFile(
      validatePath,
      JSON.stringify({ validate: createValidateResult(true) }, null, 2),
      "utf8"
    );
    await fs.writeFile(diffPath, JSON.stringify({ diff: createDiffResult(true) }, null, 2), "utf8");

    const code = await runReportCommand(
      [
        "--validate-json",
        validatePath,
        "--diff-json",
        diffPath,
        "--format",
        "json",
        "--out",
        outputPath,
      ],
      {
        log: vi.fn(),
        error: vi.fn(),
      }
    );

    expect(code).toBe(0);
    const out = await fs.readFile(outputPath, "utf8");
    expect(out).toContain('"overallPass": true');
  });

  it("includes coverage and invalid entry ratios in report JSON", async () => {
    const dir = await mkTmpDir();
    const validatePath = path.join(dir, "validate.json");
    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    await fs.writeFile(
      validatePath,
      JSON.stringify({ validate: createValidateResult(true) }, null, 2),
      "utf8"
    );

    const code = await runReportCommand(["--validate-json", validatePath, "--format", "json"], io);

    expect(code).toBe(0);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining('"coverageRatio"'));
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining('"invalidEntries"'));
  });
});

function createValidateResult(overall: boolean): ManifestQualityResult {
  return {
    summary: {
      entryCount: 1,
      totalRequiredKeys: 1,
      presentRequiredKeys: 1,
      coverageRatio: 1,
      invalidEntries: 0,
      artifactSizeBytes: 100,
    },
    gates: {
      schemaValid: overall,
      coverage: overall,
      requiredKeys: overall,
      invalidEntries: overall,
      artifactSize: overall,
      overall,
    },
    missingRequiredKeys: [],
    invalidEntryKeys: [],
    errors: overall ? [] : ["failed"],
  };
}

function createDiffResult(overall: boolean): ManifestDiffResult {
  return {
    summary: {
      added: 0,
      removed: 0,
      changed: 0,
    },
    addedKeys: [],
    removedKeys: [],
    changedKeys: [],
    gates: {
      baseValid: overall,
      candidateValid: overall,
      changeBudget: overall,
      overall,
    },
    errors: overall ? [] : ["failed"],
  };
}

async function mkTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframe-report-test-"));
  createdDirs.push(dir);
  return dir;
}
