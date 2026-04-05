import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runValidateCommand } from "../commands/validate-command";
import { createManifest } from "./quality-test-helpers";

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
});

describe("runValidateCommand", () => {
  it("returns 1 when --manifest is missing", async () => {
    const io = { log: vi.fn(), error: vi.fn() };
    const code = await runValidateCommand([], io);

    expect(code).toBe(1);
    expect(io.error).toHaveBeenCalledWith("Missing required flag: --manifest <path>");
  });

  it("returns 1 on strict threshold breach", async () => {
    const dir = await mkTmpDir();
    const manifestPath = path.join(dir, "manifest.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(createManifest(["ProductCard"]), null, 2),
      "utf8"
    );

    const io = { log: vi.fn(), error: vi.fn() };
    const code = await runValidateCommand(
      ["--manifest", manifestPath, "--required-keys", "ProductCard,Hero", "--mode", "strict"],
      io
    );

    expect(code).toBe(1);
  });

  it("returns 0 in warn mode for threshold breach", async () => {
    const dir = await mkTmpDir();
    const manifestPath = path.join(dir, "manifest.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(createManifest(["ProductCard"]), null, 2),
      "utf8"
    );

    const io = { log: vi.fn(), error: vi.fn() };
    const code = await runValidateCommand(
      ["--manifest", manifestPath, "--required-keys", "ProductCard,Hero", "--mode", "warn"],
      io
    );

    expect(code).toBe(0);
  });

  it("writes JSON output", async () => {
    const dir = await mkTmpDir();
    const manifestPath = path.join(dir, "manifest.json");
    const jsonOutPath = path.join(dir, "validate.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(createManifest(["ProductCard"]), null, 2),
      "utf8"
    );

    const code = await runValidateCommand(
      ["--manifest", manifestPath, "--required-keys", "ProductCard", "--json-out", jsonOutPath],
      {
        log: vi.fn(),
        error: vi.fn(),
      }
    );

    expect(code).toBe(0);
    const json = await fs.readFile(jsonOutPath, "utf8");
    expect(json).toContain('"overallPass": true');
  });
});

async function mkTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframe-validate-test-"));
  createdDirs.push(dir);
  return dir;
}
