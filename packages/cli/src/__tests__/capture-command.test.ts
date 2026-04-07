import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asStructuralHash, type ManifestEntry } from "@ghostframes/core";
import { runCli } from "../index";
import { runCaptureCommand } from "../commands/capture-command";

function makeEntry(key: string): ManifestEntry {
  return {
    key,
    blueprint: {
      version: 1,
      rootWidth: 300,
      rootHeight: 200,
      nodes: [],
      generatedAt: Date.now(),
      source: "dynamic",
    },
    structuralHash: asStructuralHash(`${key}:300x200`),
    generatedAt: Date.now(),
    ttlMs: 86_400_000,
    quality: {
      confidence: 0.9,
      warnings: [],
    },
  };
}

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
        "../../apps/demo/ghostframes.capture.config.mjs",
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
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframes-capture-test-"));
    createdDirs.push(tmpDir);
    const outputDir = path.join(tmpDir, "generated");
    const configPath = path.join(tmpDir, "capture.config.mjs");

    await fs.writeFile(
      configPath,
      [
        "export default {",
        "  baseUrl: 'http://localhost:3005',",
        "  routes: ['/test'],",
        "  pilotRoutes: ['/test'],",
        "  breakpoints: [375],",
        "  viewportHeight: 900,",
        `  outputDir: ${JSON.stringify(outputDir.replace(/\\/g, "/"))},`,
        "  manifestFileName: 'manifest.json',",
        "  loaderFileName: 'manifest-loader.ts',",
        "  selector: '[data-skeleton-key]',",
        "  waitForMs: 0,",
        "  retries: 0,",
        "  prettyPrintManifest: false,",
        "  parityThreshold: 0.95,",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const entry = makeEntry("ProductCard");

    const exitCode = await runCaptureCommand(["--config", configPath], io, {
      runCapture: vi.fn().mockResolvedValue({
        ok: true,
        artifacts: [{ key: "ProductCard", entry }],
        parityObservations: [
          {
            route: "/test",
            breakpoint: 375,
            discoveredKeys: ["ProductCard"],
            extractedKeys: ["ProductCard"],
            extractionFailures: 0,
          },
        ],
      }),
    });

    expect(exitCode).toBe(0);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining("Manifest size:"));

    const manifestText = await fs.readFile(path.join(outputDir, "manifest.json"), "utf8");
    expect(manifestText).not.toContain('\n  "');
  });

  it("always writes parity-report.json when parity is enabled", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframes-parity-report-test-"));
    createdDirs.push(tmpDir);
    const outputDir = path.join(tmpDir, "generated");
    const configPath = path.join(tmpDir, "capture.config.mjs");

    await fs.writeFile(
      configPath,
      [
        "export default {",
        "  baseUrl: 'http://localhost:3005',",
        "  routes: ['/test'],",
        "  pilotRoutes: ['/test'],",
        "  breakpoints: [375],",
        "  viewportHeight: 900,",
        `  outputDir: ${JSON.stringify(outputDir.replace(/\\/g, "/"))},`,
        "  manifestFileName: 'manifest.json',",
        "  loaderFileName: 'manifest-loader.ts',",
        "  selector: '[data-skeleton-key]',",
        "  waitForMs: 0,",
        "  retries: 0,",
        "  enableParityCheck: true,",
        "  parityThreshold: 0,",
        "  maxSelectorMismatchCount: 0,",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const exitCode = await runCaptureCommand(["--config", configPath], io, {
      runCapture: vi.fn().mockResolvedValue({
        ok: true,
        artifacts: [{ key: "ProductCard", entry: makeEntry("ProductCard") }],
        parityObservations: [
          {
            route: "/test",
            breakpoint: 375,
            discoveredKeys: ["ProductCard"],
            extractedKeys: ["ProductCard"],
            extractionFailures: 0,
          },
        ],
      }),
    });

    expect(exitCode).toBe(0);
    const parityText = await fs.readFile(path.join(outputDir, "parity-report.json"), "utf8");
    const parityJson = JSON.parse(parityText) as { parityRate: number };
    expect(parityJson.parityRate).toBe(1);
  });

  it("fails when parity threshold is not met", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframes-parity-threshold-test-"));
    createdDirs.push(tmpDir);
    const outputDir = path.join(tmpDir, "generated");
    const configPath = path.join(tmpDir, "capture.config.mjs");

    await fs.writeFile(
      configPath,
      [
        "export default {",
        "  baseUrl: 'http://localhost:3005',",
        "  routes: ['/test'],",
        "  pilotRoutes: ['/test'],",
        "  breakpoints: [375, 768],",
        "  viewportHeight: 900,",
        `  outputDir: ${JSON.stringify(outputDir.replace(/\\/g, "/"))},`,
        "  manifestFileName: 'manifest.json',",
        "  loaderFileName: 'manifest-loader.ts',",
        "  selector: '[data-skeleton-key]',",
        "  waitForMs: 0,",
        "  retries: 0,",
        "  enableParityCheck: true,",
        "  parityThreshold: 0.95,",
        "  maxSelectorMismatchCount: 2,",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const exitCode = await runCaptureCommand(["--config", configPath], io, {
      runCapture: vi.fn().mockResolvedValue({
        ok: true,
        artifacts: [{ key: "ProductCard", entry: makeEntry("ProductCard") }],
        parityObservations: [
          {
            route: "/test",
            breakpoint: 375,
            discoveredKeys: ["ProductCard"],
            extractedKeys: ["ProductCard"],
            extractionFailures: 0,
          },
        ],
      }),
    });

    expect(exitCode).toBe(1);
    expect(io.error).toHaveBeenCalledWith(expect.stringContaining("Parity check failed"));
    await expect(fs.readFile(path.join(outputDir, "parity-report.json"), "utf8")).resolves.toContain(
      '"parityRate"'
    );
  });

  it("fails when selector mismatch budget is exceeded", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframes-selector-budget-test-"));
    createdDirs.push(tmpDir);
    const outputDir = path.join(tmpDir, "generated");
    const configPath = path.join(tmpDir, "capture.config.mjs");

    await fs.writeFile(
      configPath,
      [
        "export default {",
        "  baseUrl: 'http://localhost:3005',",
        "  routes: ['/test'],",
        "  pilotRoutes: ['/test'],",
        "  breakpoints: [375],",
        "  viewportHeight: 900,",
        `  outputDir: ${JSON.stringify(outputDir.replace(/\\/g, "/"))},`,
        "  manifestFileName: 'manifest.json',",
        "  loaderFileName: 'manifest-loader.ts',",
        "  selector: '[data-skeleton-key]',",
        "  waitForMs: 0,",
        "  retries: 0,",
        "  enableParityCheck: true,",
        "  parityThreshold: 0,",
        "  maxSelectorMismatchCount: 0,",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const exitCode = await runCaptureCommand(["--config", configPath], io, {
      runCapture: vi.fn().mockResolvedValue({
        ok: true,
        artifacts: [{ key: "ProductCard", entry: makeEntry("ProductCard") }],
        parityObservations: [
          {
            route: "/test",
            breakpoint: 375,
            discoveredKeys: ["ProductCard"],
            extractedKeys: [],
            extractionFailures: 1,
          },
        ],
      }),
    });

    expect(exitCode).toBe(1);
    expect(io.error).toHaveBeenCalledWith(expect.stringContaining("selector mismatch budget exceeded"));
  });

  it("counts selector mismatch budget per key across a check", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframes-selector-key-budget-test-"));
    createdDirs.push(tmpDir);
    const outputDir = path.join(tmpDir, "generated");
    const configPath = path.join(tmpDir, "capture.config.mjs");

    await fs.writeFile(
      configPath,
      [
        "export default {",
        "  baseUrl: 'http://localhost:3005',",
        "  routes: ['/test'],",
        "  pilotRoutes: ['/test'],",
        "  breakpoints: [375],",
        "  viewportHeight: 900,",
        `  outputDir: ${JSON.stringify(outputDir.replace(/\\/g, "/"))},`,
        "  manifestFileName: 'manifest.json',",
        "  loaderFileName: 'manifest-loader.ts',",
        "  selector: '[data-skeleton-key]',",
        "  waitForMs: 0,",
        "  retries: 0,",
        "  enableParityCheck: true,",
        "  parityThreshold: 0,",
        "  maxSelectorMismatchCount: 1,",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const exitCode = await runCaptureCommand(["--config", configPath], io, {
      runCapture: vi.fn().mockResolvedValue({
        ok: true,
        artifacts: [{ key: "ProductCard", entry: makeEntry("ProductCard") }],
        parityObservations: [
          {
            route: "/test",
            breakpoint: 375,
            discoveredKeys: ["ProductCard", "PromoCard"],
            extractedKeys: [],
            extractionFailures: 2,
          },
        ],
      }),
    });

    expect(exitCode).toBe(1);
    expect(io.error).toHaveBeenCalledWith(expect.stringContaining("selector mismatch budget exceeded (2 > 1)"));
  });

  it("fails when artifacts are emitted without parity observations", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghostframes-missing-observations-test-"));
    createdDirs.push(tmpDir);
    const outputDir = path.join(tmpDir, "generated");
    const configPath = path.join(tmpDir, "capture.config.mjs");

    await fs.writeFile(
      configPath,
      [
        "export default {",
        "  baseUrl: 'http://localhost:3005',",
        "  routes: ['/test'],",
        "  pilotRoutes: ['/test'],",
        "  breakpoints: [375],",
        "  viewportHeight: 900,",
        `  outputDir: ${JSON.stringify(outputDir.replace(/\\/g, "/"))},`,
        "  manifestFileName: 'manifest.json',",
        "  loaderFileName: 'manifest-loader.ts',",
        "  selector: '[data-skeleton-key]',",
        "  waitForMs: 0,",
        "  retries: 0,",
        "  enableParityCheck: true,",
        "  parityThreshold: 0,",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    const io = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const exitCode = await runCaptureCommand(["--config", configPath], io, {
      runCapture: vi.fn().mockResolvedValue({
        ok: true,
        artifacts: [{ key: "ProductCard", entry: makeEntry("ProductCard") }],
      }),
    });

    expect(exitCode).toBe(1);
    expect(io.error).toHaveBeenCalledWith(
      expect.stringContaining("runCapture must return parityObservations when artifacts are emitted")
    );
    await expect(fs.readFile(path.join(outputDir, "parity-report.json"), "utf8")).resolves.toContain(
      '"parityRate"'
    );
  });
});
