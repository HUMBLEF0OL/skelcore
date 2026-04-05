import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asStructuralHash, type ManifestEntry } from "@ghostframe/core";
import { runCli } from "../index";
import { runCaptureCommand } from "../commands/capture-command";

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
});

describe("runCli", () => {
  it("returns non-zero for unknown command", async () => {
    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const exitCode = await runCli(["unknown"], {
      log: io.log,
      error: io.error,
    });

    expect(exitCode).toBe(1);
    expect(io.error).toHaveBeenCalledWith(
      "Supported commands: capture, validate, diff, report, rollout"
    );
  });

  it("returns 1 when capture run fails", async () => {
    const exitCode = await runCaptureCommand(
      [
        "--config",
        "../../apps/demo/ghostframe.capture.config.mjs",
        "--baseUrl",
        "http://localhost:3999",
      ],
      {
        log: vi.fn(),
        error: vi.fn(),
      },
      {
        runCapture: vi.fn().mockResolvedValue({
          ok: false,
          artifacts: [],
          fatalError: "connection refused",
        }),
      }
    );

    expect(exitCode).toBe(1);
  });

  it("writes compact manifest and logs manifest size", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframe-capture-test-"));
    createdDirs.push(tmpDir);
    const outputDir = path.join(tmpDir, "generated");
    const configPath = path.join(tmpDir, "capture.config.mjs");

    await fs.writeFile(
      configPath,
      [
        "export default {",
        "  baseUrl: 'http://localhost:3005',",
        "  routes: ['/test'],",
        "  breakpoints: [375],",
        "  viewportHeight: 900,",
        `  outputDir: ${JSON.stringify(outputDir.replace(/\\/g, "/"))},`,
        "  manifestFileName: 'manifest.json',",
        "  loaderFileName: 'manifest-loader.ts',",
        "  selector: '[data-skeleton-key]',",
        "  waitForMs: 0,",
        "  retries: 0,",
        "  prettyPrintManifest: false,",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const entry: ManifestEntry = {
      key: "ProductCard",
      blueprint: {
        version: 1,
        rootWidth: 300,
        rootHeight: 200,
        nodes: [],
        generatedAt: Date.now(),
        source: "dynamic",
      },
      structuralHash: asStructuralHash("ProductCard:300x200"),
      generatedAt: Date.now(),
      ttlMs: 86_400_000,
      quality: {
        confidence: 0.9,
        warnings: [],
      },
    };

    const exitCode = await runCaptureCommand(["--config", configPath], io, {
      runCapture: vi.fn().mockResolvedValue({
        ok: true,
        artifacts: [{ key: "ProductCard", entry }],
      }),
    });

    expect(exitCode).toBe(0);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining("Manifest size:"));

    const manifestText = await fs.readFile(path.join(outputDir, "manifest.json"), "utf8");
    expect(manifestText).not.toContain('\n  "');
  });
});
