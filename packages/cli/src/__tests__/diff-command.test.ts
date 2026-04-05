import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDiffCommand } from "../commands/diff-command";
import { createManifest } from "./quality-test-helpers";

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
});

describe("runDiffCommand", () => {
  it("returns 1 when required flags are missing", async () => {
    const io = { log: vi.fn(), error: vi.fn() };
    const code = await runDiffCommand([], io);

    expect(code).toBe(1);
  });

  it("returns 1 when max-changed threshold is breached in strict mode", async () => {
    const dir = await mkTmpDir();
    const basePath = path.join(dir, "base.json");
    const candidatePath = path.join(dir, "candidate.json");
    const baseManifest = createManifest(["ProductCard"]);
    const candidateManifest = createManifest(["ProductCard"]);
    candidateManifest.entries.ProductCard.structuralHash = "different" as never;

    await fs.writeFile(basePath, JSON.stringify(baseManifest, null, 2), "utf8");
    await fs.writeFile(candidatePath, JSON.stringify(candidateManifest, null, 2), "utf8");

    const code = await runDiffCommand(
      ["--base", basePath, "--candidate", candidatePath, "--max-changed", "0", "--mode", "strict"],
      {
        log: vi.fn(),
        error: vi.fn(),
      }
    );

    expect(code).toBe(1);
  });

  it("writes JSON diff output", async () => {
    const dir = await mkTmpDir();
    const basePath = path.join(dir, "base.json");
    const candidatePath = path.join(dir, "candidate.json");
    const jsonOutPath = path.join(dir, "diff.json");

    await fs.writeFile(basePath, JSON.stringify(createManifest(["ProductCard"]), null, 2), "utf8");
    await fs.writeFile(
      candidatePath,
      JSON.stringify(createManifest(["ProductCard"]), null, 2),
      "utf8"
    );

    const code = await runDiffCommand(
      ["--base", basePath, "--candidate", candidatePath, "--json-out", jsonOutPath],
      {
        log: vi.fn(),
        error: vi.fn(),
      }
    );

    expect(code).toBe(0);
    const json = await fs.readFile(jsonOutPath, "utf8");
    expect(json).toContain('"diff"');
  });
});

async function mkTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframe-diff-test-"));
  createdDirs.push(dir);
  return dir;
}
